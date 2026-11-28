$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Open Terminal or PowerShell using Run as administrator, then run this script. No Windows settings were changed.'
}
$logDirectory = Join-Path $env:LOCALAPPDATA 'Kora'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$log = Join-Path $logDirectory 'wsl-install-result.txt'
try {
    'Installing WSL prerequisites. No automatic restart.' | Set-Content -LiteralPath $log
    & dism.exe /Online /Enable-Feature /FeatureName:VirtualMachinePlatform /All /NoRestart >> $log 2>&1
    if ($LASTEXITCODE -notin @(0,3010)) { throw 'VirtualMachinePlatform setup failed' }
    & dism.exe /Online /Enable-Feature /FeatureName:Microsoft-Windows-Subsystem-Linux /All /NoRestart >> $log 2>&1
    if ($LASTEXITCODE -notin @(0,3010)) { throw 'WSL Windows feature setup failed' }
    & winget.exe install --id Microsoft.WSL --version 3.0.5 --exact --source winget --accept-source-agreements --accept-package-agreements --silent --disable-interactivity >> $log 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'WSL package setup failed; inspect the setup log' }
    'WSL_SETUP_COMPLETE_RESTART_MAY_BE_REQUIRED' | Add-Content -LiteralPath $log
    Write-Output "WSL setup completed. Restart Windows when your work is saved, then install/start Docker Desktop. Log: $log"
} catch {
    ('WSL_SETUP_INCOMPLETE: ' + $_.Exception.Message) | Add-Content -LiteralPath $log
    Write-Error "WSL setup incomplete. Log: $log"
    exit 1
}
