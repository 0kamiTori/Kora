import 'dart:convert';
import 'dart:io';

import 'package:kora_mobile/core/network/api_config.dart';
import 'package:kora_mobile/features/onboarding/registration_models.dart';
import 'package:kora_mobile/features/onboarding/registration_repository.dart';

Future<void> main() async {
  final repository = HttpRegistrationRepository(
    const ApiConfig(baseUrl: 'http://127.0.0.1:8000/api/v2', synthetic: true),
  );
  try {
    final policy = await repository.fetchPolicy();
    if (!policy.enabled || policy.version != 'test-mobile-account-v1') {
      throw StateError('Synthetic policy required');
    }
    final key = registrationKey();
    final request = RegistrationRequest(
      email: 'mobile-$key@kora.example.invalid',
      password: 'PruebaMovil2026!',
      name: 'María Prueba Ñ 2',
      birthDate: '2000-01-01',
      code: '+57',
      phone: '3015550100',
      driver: true,
      consentVersion: policy.version!,
    );
    final created = await repository.register(request, key);
    final replay = await repository.register(request, key);
    if (created.id != replay.id) throw StateError('Replay mismatch');
    var duplicate = false;
    try {
      await repository.register(request, registrationKey());
    } on RegistrationFailure catch (failure) {
      duplicate = failure.code == 'CONTACT_NOT_AVAILABLE';
    }
    if (!duplicate) throw StateError('Duplicate contact was not rejected');
    final result = {
      'http_smoke': 'passed',
      'transport':
          'Dart Dio -> loopback HTTP -> FastAPI -> disposable PostgreSQL',
      'same_account_on_replay': true,
      'duplicate_rejected': duplicate,
      'driver_approved': false,
      'real_data': false,
    };
    stdout.writeln(jsonEncode(result));
  } catch (_) {
    stderr.writeln(
      'Mobile HTTP integration failed. No credentials or response values are printed.',
    );
    exitCode = 1;
  } finally {
    repository.close();
  }
}
