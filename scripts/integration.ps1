param([ValidateSet('Init','Start','Stop','Status','Usb')][string]$Action = 'Status')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $projectRoot 'services/api'
$localRoot = Join-Path $apiRoot '.local/integration'
$pidFile = Join-Path $localRoot 'server-process.json'
$compose = Join-Path $projectRoot 'infra/compose.integration.yml'
$config = Join-Path $localRoot 'connection.env'

function Invoke-Checked {
    param([string[]]$Arguments)
    & rtk proxy @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'The integration command failed. Review the preceding sanitized output.' }
}

function Find-Docker {
    $command = Get-Command docker -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    foreach ($candidate in @((Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'),'C:/Program Files/Docker/Docker/resources/bin/docker.exe')) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    throw 'Install Docker Desktop with WSL 2, restart if requested and open Docker Desktop. Neon was not changed.'
}

Push-Location $apiRoot
try {
    if ($Action -eq 'Init' -or $Action -eq 'Start') {
        Invoke-Checked -Arguments @('uv','sync','--frozen')
        Invoke-Checked -Arguments @('uv','run','--frozen','python','-m','kora_api.integration','init')
    }
    if ($Action -eq 'Start') {
        $dockerPath = Find-Docker
        Invoke-Checked -Arguments @($dockerPath,'compose','-p','kora-mobile-integration','--env-file',$config,'-f',$compose,'up','-d','--wait')
        Invoke-Checked -Arguments @('uv','run','--frozen','python','-m','kora_api.integration','prepare')
        if (Test-Path -LiteralPath $pidFile) {
            $saved = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
            $existing = Get-Process -Id $saved.id -ErrorAction SilentlyContinue
            if ($existing -and $existing.StartTime.ToUniversalTime().ToString('o') -eq $saved.started) {
                Write-Output 'The recorded integration API is already running.'
                exit 0
            }
        }
        if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 8000 is already occupied. No existing process was stopped.' }
        $process = Start-Process -FilePath (Get-Command rtk).Source -ArgumentList @('proxy','uv','run','--frozen','uvicorn','kora_api.integration:create_integration_app','--factory','--host','127.0.0.1','--port','8000','--no-access-log') -WorkingDirectory $apiRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localRoot 'server.stdout.log') -RedirectStandardError (Join-Path $localRoot 'server.stderr.log')
        @{id=$process.Id;started=$process.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
        $healthy = $false
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health/ready' -TimeoutSec 2; if ($health.status -eq 'ready') { $healthy=$true; break } } catch {}
            Start-Sleep -Milliseconds 500
        }
        if (-not $healthy) { throw 'The local API did not become ready. Inspect the integration log files; do not substitute Neon settings.' }
        Write-Output 'Synthetic integration ready at http://127.0.0.1:8000. Run Usb after authorizing your phone.'
    } elseif ($Action -eq 'Status') {
        Invoke-Checked -Arguments @('uv','run','--frozen','python','-m','kora_api.integration','status')
    } elseif ($Action -eq 'Usb') {
        $adbTool = Get-Command adb -ErrorAction SilentlyContinue
        $adbPath = if ($adbTool) { $adbTool.Source } else { Join-Path $env:LOCALAPPDATA 'Android/platform-tools/adb.exe' }
        if (-not (Test-Path -LiteralPath $adbPath)) { throw 'Install Android SDK Platform Tools, connect the phone by USB and authorize USB debugging.' }
        Invoke-Checked -Arguments @($adbPath,'reverse','tcp:8000','tcp:8000')
        Write-Output 'USB forwarding ready. Keep the phone connected and the local API running.'
    } elseif ($Action -eq 'Stop') {
        if (Test-Path -LiteralPath $pidFile) {
            $saved = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
            $owned = Get-Process -Id $saved.id -ErrorAction SilentlyContinue
            if ($owned -and $owned.StartTime.ToUniversalTime().ToString('o') -eq $saved.started) {
                Invoke-Checked -Arguments @('taskkill','/PID',[string]$saved.id,'/T','/F')
            }
            Remove-Item -LiteralPath $pidFile
        }
        if (Test-Path -LiteralPath $config) {
            $dockerPath = Find-Docker
            Invoke-Checked -Arguments @($dockerPath,'compose','-p','kora-mobile-integration','--env-file',$config,'-f',$compose,'stop')
        }
        Write-Output 'Integration stopped. Its configuration and synthetic database volume were retained.'
    }
} finally { Pop-Location }
