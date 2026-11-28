import 'package:dio/dio.dart';

import '../../core/network/api_config.dart';
import 'registration_models.dart';

abstract interface class RegistrationRepository {
  Future<RegistrationPolicy> fetchPolicy();
  Future<CreatedAccount> register(RegistrationRequest request, String key);
  void close();
}

class HttpRegistrationRepository implements RegistrationRepository {
  HttpRegistrationRepository(this.config, {Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 8),
              sendTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 15),
              followRedirects: false,
              validateStatus: (_) => true,
              responseType: ResponseType.json,
              headers: {'Accept': 'application/json'},
            ),
          );
  final ApiConfig config;
  final Dio _dio;
  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    RegistrationRequest? request,
    String? key,
  }) async {
    final base = config.uri;
    if (base == null) throw const RegistrationFailure('REGISTRATION_DISABLED');
    try {
      final response = await _dio.request<Object?>(
        base.replace(path: '${base.path}/$path').toString(),
        data: request?.toJson(),
        options: Options(
          method: method,
          contentType: 'application/json',
          followRedirects: false,
          validateStatus: (_) => true,
          headers: key == null ? null : {'Idempotency-Key': key},
        ),
      );
      final body = response.data;
      final status = response.statusCode ?? 0;
      if ((method == 'GET' && status == 200 ||
              method == 'POST' && status == 201) &&
          body is Map<String, dynamic>) {
        return body;
      }
      if (body is! Map<String, dynamic> ||
          body['code'] is! String ||
          !registrationErrorMessages.containsKey(body['code'])) {
        throw const RegistrationFailure('RESPONSE_INVALID', retryable: true);
      }
      final code = body['code'] as String;
      const allowed = {
        'email',
        'password',
        'display_name',
        'birth_date',
        'phone',
        'phone.country_calling_code',
        'phone.national_number',
        'requested_role',
        'consent',
        'consent.accepted',
        'consent.version',
        'request',
      };
      final fields = <String, String>{};
      if (body['field_errors'] is List) {
        for (final item in body['field_errors'] as List) {
          if (item is Map &&
              allowed.contains(item['field']) &&
              registrationErrorMessages.containsKey(item['code'])) {
            fields[item['field'] as String] =
                registrationErrorMessages[item['code']]!;
          }
        }
      }
      final seconds =
          int.tryParse(response.headers.value('retry-after') ?? '') ?? 0;
      throw RegistrationFailure(
        code,
        retryable:
            body['retryable'] == true ||
            status >= 500 && code != 'REGISTRATION_DISABLED',
        fields: Map.unmodifiable(fields),
        retryAfter: Duration(seconds: seconds.clamp(0, 3600)),
      );
    } on DioException {
      throw const RegistrationFailure('CONNECTION_ERROR', retryable: true);
    } on FormatException {
      throw const RegistrationFailure('RESPONSE_INVALID', retryable: true);
    }
  }

  @override
  Future<RegistrationPolicy> fetchPolicy() async {
    try {
      return RegistrationPolicy.fromJson(
        await _send('GET', 'registration-policy'),
      );
    } on FormatException {
      throw const RegistrationFailure('RESPONSE_INVALID', retryable: true);
    }
  }

  @override
  Future<CreatedAccount> register(
    RegistrationRequest request,
    String key,
  ) async {
    try {
      return CreatedAccount.fromJson(
        await _send('POST', 'accounts', request: request, key: key),
      );
    } on FormatException {
      throw const RegistrationFailure('RESPONSE_INVALID', retryable: true);
    }
  }

  @override
  void close() => _dio.close(force: true);
}
