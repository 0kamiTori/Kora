class ApiConfig {
  const ApiConfig({
    required this.baseUrl,
    this.synthetic = false,
    this.release = false,
  });
  factory ApiConfig.environment() => const ApiConfig(
    baseUrl: String.fromEnvironment('KORA_API_BASE_URL'),
    synthetic: bool.fromEnvironment('KORA_SYNTHETIC_INTEGRATION'),
    release: bool.fromEnvironment('dart.vm.product'),
  );
  final String baseUrl;
  final bool synthetic;
  final bool release;

  Uri? get uri {
    final value = Uri.tryParse(baseUrl);
    if (value == null ||
        value.host.isEmpty ||
        value.userInfo.isNotEmpty ||
        value.hasQuery ||
        value.hasFragment ||
        value.path != '/api/v2') {
      return null;
    }
    final loopback = value.host == '127.0.0.1' || value.host == 'localhost';
    if (value.scheme != 'https' &&
        !(synthetic && !release && loopback && value.scheme == 'http')) {
      return null;
    }
    if (synthetic && (release || !loopback)) return null;
    return value;
  }
}
