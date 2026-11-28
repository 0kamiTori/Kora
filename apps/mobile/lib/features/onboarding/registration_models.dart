import 'dart:math';

import 'onboarding_models.dart';

class RegistrationPolicy {
  const RegistrationPolicy({
    required this.enabled,
    required this.serverDate,
    this.version,
    this.text,
  });
  final bool enabled;
  final DateTime serverDate;
  final String? version;
  final String? text;
  factory RegistrationPolicy.fromJson(Map<String, dynamic> json) {
    final date = json['server_date'];
    if (date is! String ||
        !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(date) ||
        json['registration_enabled'] is! bool) {
      throw const FormatException('Invalid policy');
    }
    final parsed = DateTime.parse(date);
    if (parsed.toIso8601String().substring(0, 10) != date ||
        json['minimum_age'] != 18 ||
        json['display_name_max_length'] != 100) {
      throw const FormatException('Invalid policy');
    }
    final enabled = json['registration_enabled'] as bool;
    final consent = json['consent'];
    if (enabled &&
        (consent is! Map ||
            consent['version'] is! String ||
            (consent['version'] as String).isEmpty ||
            consent['text'] is! String ||
            (consent['text'] as String).isEmpty)) {
      throw const FormatException('Invalid consent');
    }
    if (!enabled && consent != null) {
      throw const FormatException('Invalid closed policy');
    }
    return RegistrationPolicy(
      enabled: enabled,
      serverDate: parsed,
      version: enabled ? consent['version'] as String : null,
      text: enabled ? consent['text'] as String : null,
    );
  }
}

class RegistrationRequest {
  const RegistrationRequest({
    required this.email,
    required this.password,
    required this.name,
    required this.birthDate,
    required this.code,
    required this.phone,
    required this.driver,
    required this.consentVersion,
  });
  final String email, password, name, birthDate, code, phone, consentVersion;
  final bool driver;
  Map<String, dynamic> toJson() => {
    'email': email.trim(),
    'password': password,
    'display_name': name.trim(),
    'birth_date': birthDate,
    'phone': {
      'country_calling_code': code.trim().startsWith('+')
          ? code.trim()
          : '+${code.trim()}',
      'national_number': phone,
    },
    'requested_role': driver ? 'driver' : 'passenger',
    'consent': {'accepted': true, 'version': consentVersion},
  };
}

class CreatedAccount {
  const CreatedAccount(this.id, this.name, this.consentVersion);
  final String id, name, consentVersion;
  factory CreatedAccount.fromJson(Map<String, dynamic> json) {
    final roles = json['roles'];
    final receipt = json['consent_receipt'];
    if (json['id'] is! String ||
        !isUuid(json['id'] as String) ||
        json['display_name'] is! String ||
        (json['display_name'] as String).isEmpty ||
        (json['display_name'] as String).runes.length > 100 ||
        roles is! List ||
        roles.length != 1 ||
        roles.first != 'passenger' ||
        json['driver_approved'] != false ||
        json['driver_review_status'] != 'not_submitted' ||
        receipt is! Map ||
        receipt['version'] is! String ||
        receipt['recorded_at'] is! String ||
        DateTime.tryParse(receipt['recorded_at'] as String) == null ||
        json['created_at'] is! String ||
        DateTime.tryParse(json['created_at'] as String) == null) {
      throw const FormatException('Invalid account confirmation');
    }
    return CreatedAccount(
      json['id'] as String,
      json['display_name'] as String,
      receipt['version'] as String,
    );
  }
}

bool isUuid(String value) => RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
).hasMatch(value);
String registrationKey() {
  final random = Random.secure();
  final bytes = List.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

const registrationErrorMessages = {
  'REQUIRED_FIELDS_MISSING': RegistrationMessages.missing,
  'CONSENT_REQUIRED': RegistrationMessages.consent,
  'CONTACT_INVALID': RegistrationMessages.invalidContact,
  'PASSWORD_INVALID': RegistrationMessages.password,
  'DISPLAY_NAME_INVALID': RegistrationMessages.name,
  'BIRTH_DATE_INVALID': RegistrationMessages.date,
  'AGE_RESTRICTED': RegistrationMessages.age,
  'VALIDATION_ERROR': 'Revisa los datos de la solicitud',
  'CONTACT_NOT_AVAILABLE': RegistrationMessages.duplicate,
  'CONSENT_VERSION_CHANGED': RegistrationMessages.consent,
  'IDEMPOTENCY_CONFLICT':
      'No se pudo confirmar el envío. Revisa tus datos e inténtalo de nuevo.',
  'REGISTRATION_IN_PROGRESS':
      'Tu registro sigue en proceso. Inténtalo nuevamente.',
  'RATE_LIMITED': 'Demasiados intentos. Inténtalo nuevamente más tarde.',
  'REGISTRATION_DISABLED': RegistrationMessages.internal,
  'DATABASE_UNAVAILABLE': RegistrationMessages.internal,
  'INTERNAL_ERROR': RegistrationMessages.internal,
  'REQUEST_INVALID': 'Revisa los datos de la solicitud',
  'BODY_TOO_LARGE': 'Revisa los datos de la solicitud',
  'UNSUPPORTED_MEDIA_TYPE': 'Revisa los datos de la solicitud',
  'CONNECTION_ERROR': 'No pudimos conectar con el servicio. Comprueba la conexión e inténtalo de nuevo.',
  'RESPONSE_INVALID': 'No pudimos confirmar la respuesta del servicio.',
};

class RegistrationFailure implements Exception {
  const RegistrationFailure(
    this.code, {
    this.retryable = false,
    this.fields = const {},
    this.retryAfter = Duration.zero,
  });
  final String code;
  final bool retryable;
  final Map<String, String> fields;
  final Duration retryAfter;
  String get message =>
      registrationErrorMessages[code] ?? RegistrationMessages.internal;
  // Never retain a Dio exception, response payload or credentials in a failure.
  @override
  String toString() => 'RegistrationFailure($code)';
}
