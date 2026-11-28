import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:kora_mobile/core/network/api_config.dart';
import 'package:kora_mobile/core/theme/premium_theme.dart';
import 'package:kora_mobile/features/onboarding/registration_controller.dart';
import 'package:kora_mobile/features/onboarding/registration_models.dart';
import 'package:kora_mobile/features/onboarding/registration_repository.dart';
import 'package:kora_mobile/features/onboarding/registration_page.dart';

RegistrationPolicy policy([String version = 'test-v1']) => RegistrationPolicy(
  enabled: true,
  serverDate: DateTime.utc(2026, 11, 27),
  version: version,
  text: 'Consentimiento ficticio completo para pruebas. No usar datos reales.',
);
RegistrationRequest request([String name = 'María Prueba']) =>
    RegistrationRequest(
      email: 'test@example.invalid',
      password: ' PruebaKora2026! ',
      name: name,
      birthDate: '2000-01-01',
      code: '57',
      phone: '(301) 555-0100',
      driver: true,
      consentVersion: 'test-v1',
    );
const account = CreatedAccount(
  '10000000-0000-4000-8000-000000000001',
  'María Prueba',
  'test-v1',
);

class TestRepository implements RegistrationRepository {
  RegistrationPolicy current = policy();
  int gets = 0;
  final keys = <String>[];
  final bodies = <RegistrationRequest>[];
  Future<CreatedAccount> Function()? outcome;
  @override
  Future<RegistrationPolicy> fetchPolicy() async {
    gets++;
    return current;
  }

  @override
  Future<CreatedAccount> register(
    RegistrationRequest request,
    String key,
  ) async {
    keys.add(key);
    bodies.add(request);
    return outcome == null ? account : await outcome!();
  }

  @override
  void close() {}
}

class TestAdapter implements HttpClientAdapter {
  TestAdapter(this.status, this.body, {this.timeout = false});
  final int status;
  final Object body;
  final bool timeout;
  RequestOptions? sent;
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? stream,
    Future<void>? cancelFuture,
  ) async {
    sent = options;
    if (timeout) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.receiveTimeout,
        error: 'PRIVATE_VALUE',
      );
    }
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        'content-type': ['application/json'],
        'retry-after': ['2'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Future<(ProviderContainer, RegistrationController)> controller(
  TestRepository repository,
) async {
  final container = ProviderContainer(
    overrides: [registrationRepositoryProvider.overrideWithValue(repository)],
  );
  container.listen(registrationControllerProvider, (_, _) {});
  await Future<void>.delayed(Duration.zero);
  return (container, container.read(registrationControllerProvider.notifier));
}

void main() {
  test(
    'API configuration rejects credentials and nonlocal insecure endpoints',
    () {
      expect(const ApiConfig(baseUrl: '').uri, isNull);
      expect(
        const ApiConfig(baseUrl: 'postgresql://owner:secret@host/db').uri,
        isNull,
      );
      expect(
        const ApiConfig(
          baseUrl: 'http://remote.invalid/api/v2',
          synthetic: true,
        ).uri,
        isNull,
      );
      expect(
        const ApiConfig(
          baseUrl: 'http://127.0.0.1:8000/api/v2',
          synthetic: true,
          release: true,
        ).uri,
        isNull,
      );
      expect(
        const ApiConfig(baseUrl: 'https://owner:secret@example.invalid/api/v2')
            .uri,
        isNull,
      );
      expect(
        const ApiConfig(baseUrl: 'https://example.invalid/api/v2?secret=x').uri,
        isNull,
      );
      expect(
        const ApiConfig(
          baseUrl: 'http://127.0.0.1:8000/api/v2',
          synthetic: true,
        ).uri,
        isNotNull,
      );
    },
  );
  test(
    'request keeps exact password and civil date without local identity',
    () {
      final body = request().toJson();
      expect(body['password'], ' PruebaKora2026! ');
      expect(body['birth_date'], '2000-01-01');
      expect((body['phone'] as Map)['country_calling_code'], '+57');
      expect(body['requested_role'], 'driver');
      expect(request().toString(), isNot(contains('PruebaKora2026')));
      final one = registrationKey(), two = registrationKey();
      expect(isUuid(one), isTrue);
      expect(one, isNot(two));
    },
  );
  test(
    'HTTP adapter uses v2 and hides untrusted error text and field values',
    () async {
      final adapter = TestAdapter(409, {
        'code': 'CONTACT_NOT_AVAILABLE',
        'message': 'PRIVATE_VALUE',
        'retryable': false,
        'field_errors': [
          {
            'field': 'email',
            'code': 'CONTACT_NOT_AVAILABLE',
            'message': 'PRIVATE_EMAIL',
          },
        ],
      });
      final dio = Dio()..httpClientAdapter = adapter;
      final repository = HttpRegistrationRepository(
        const ApiConfig(
          baseUrl: 'http://127.0.0.1:8000/api/v2',
          synthetic: true,
        ),
        dio: dio,
      );
      addTearDown(repository.close);
      try {
        await repository.register(request(), registrationKey());
        fail('Conflict expected');
      } on RegistrationFailure catch (failure) {
        expect(failure.code, 'CONTACT_NOT_AVAILABLE');
        expect(failure.message, 'Este correo o número no está disponible');
        expect(failure.fields['email'], failure.message);
        expect(failure.toString(), isNot(contains('PRIVATE')));
        expect(failure.retryAfter, const Duration(seconds: 2));
      }
      expect(adapter.sent!.uri.path, '/api/v2/accounts');
      expect(adapter.sent!.followRedirects, isFalse);
      expect(adapter.sent!.headers['Idempotency-Key'], isNotNull);
    },
  );
  test('timeouts retain no Dio exception or response secrets', () async {
    final dio = Dio()..httpClientAdapter = TestAdapter(0, {}, timeout: true);
    final repository = HttpRegistrationRepository(
      const ApiConfig(baseUrl: 'http://127.0.0.1:8000/api/v2', synthetic: true),
      dio: dio,
    );
    addTearDown(repository.close);
    await expectLater(
      repository.register(request(), registrationKey()),
      throwsA(
        isA<RegistrationFailure>()
            .having((f) => f.code, 'code', 'CONNECTION_ERROR')
            .having(
              (f) => f.toString(),
              'safe description',
              isNot(contains('PRIVATE_VALUE')),
            ),
      ),
    );
  });
  test('malformed success never confirms an account', () async {
    final dio = Dio()
      ..httpClientAdapter = TestAdapter(201, {'id': 'not-an-account'});
    final repository = HttpRegistrationRepository(
      const ApiConfig(baseUrl: 'http://127.0.0.1:8000/api/v2', synthetic: true),
      dio: dio,
    );
    addTearDown(repository.close);
    await expectLater(
      repository.register(request(), registrationKey()),
      throwsA(
        isA<RegistrationFailure>().having(
          (f) => f.code,
          'code',
          'RESPONSE_INVALID',
        ),
      ),
    );
  });
  test(
    'lost response reuses exact key and body before consulting a new policy',
    () async {
      final repository = TestRepository();
      repository.outcome = () async =>
          throw const RegistrationFailure('CONNECTION_ERROR', retryable: true);
      final (container, notifier) = await controller(repository);
      addTearDown(container.dispose);
      await notifier.submit(request());
      expect(container.read(registrationControllerProvider).pending, isTrue);
      final gets = repository.gets;
      repository.current = RegistrationPolicy(
        enabled: false,
        serverDate: DateTime.utc(2026, 11, 27),
      );
      repository.outcome = () async => account;
      await notifier.retry();
      expect(repository.gets, gets);
      expect(repository.keys[0], repository.keys[1]);
      expect(identical(repository.bodies[0], repository.bodies[1]), isTrue);
      expect(
        container.read(registrationControllerProvider).created!.id,
        account.id,
      );
      expect(container.read(registrationControllerProvider).pending, isFalse);
    },
  );
  test('double tap cannot issue a second operation while first awaits confirmation', () async {
    final repository = TestRepository();
    final response = Completer<CreatedAccount>();
    repository.outcome = () => response.future;
    final (container, notifier) = await controller(repository);
    addTearDown(container.dispose);
    final first = notifier.submit(request());
    await Future<void>.delayed(Duration.zero);
    await notifier.submit(request());
    expect(repository.keys.length, 1);
    response.complete(account);
    await first;
  });
  test(
    'changed policy requires new explicit acceptance without POST',
    () async {
      final repository = TestRepository();
      final (container, notifier) = await controller(repository);
      addTearDown(container.dispose);
      repository.current = policy('test-v2');
      await notifier.submit(request());
      final state = container.read(registrationControllerProvider);
      expect(state.failure!.code, 'CONSENT_VERSION_CHANGED');
      expect(state.policy!.version, 'test-v2');
      expect(repository.keys, isEmpty);
      expect(state.consentRevision, greaterThan(1));
    },
  );
  test(
    'business validation failure allows a corrected form with a new key',
    () async {
      final repository = TestRepository();
      repository.outcome = () async =>
          throw const RegistrationFailure('CONTACT_NOT_AVAILABLE');
      final (container, notifier) = await controller(repository);
      addTearDown(container.dispose);
      await notifier.submit(request());
      expect(container.read(registrationControllerProvider).pending, isFalse);
      repository.outcome = () async => account;
      await notifier.submit(request('Otra Prueba'));
      expect(repository.keys[0], isNot(repository.keys[1]));
    },
  );
  test(
    'disposal while waiting cannot store an account or password locally',
    () async {
      final repository = TestRepository();
      final response = Completer<CreatedAccount>();
      repository.outcome = () => response.future;
      final (container, notifier) = await controller(repository);
      final future = notifier.submit(request());
      await Future<void>.delayed(Duration.zero);
      container.dispose();
      response.complete(account);
      await future;
    },
  );

  test(
    'a closed service after lost response preserves the original key',
    () async {
      final repository = TestRepository();
      repository.outcome = () async =>
          throw const RegistrationFailure('CONNECTION_ERROR', retryable: true);
      final (container, notifier) = await controller(repository);
      addTearDown(container.dispose);
      await notifier.submit(request());
      repository.outcome = () async =>
          throw const RegistrationFailure('REGISTRATION_DISABLED');
      await notifier.retry();
      expect(container.read(registrationControllerProvider).pending, isTrue);
      repository.outcome = () async => account;
      await notifier.retry();
      expect(repository.keys.toSet().length, 1);
      expect(
        container.read(registrationControllerProvider).created!.id,
        account.id,
      );
    },
  );

  Future<void> reveal(WidgetTester tester, Finder finder) async {
    await tester.scrollUntilVisible(
      finder,
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
  }

  Future<void> launch(WidgetTester tester, TestRepository repository) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          registrationRepositoryProvider.overrideWithValue(repository),
          apiConfigProvider.overrideWithValue(
            const ApiConfig(
              baseUrl: 'http://127.0.0.1:8000/api/v2',
              synthetic: true,
            ),
          ),
        ],
        child: MaterialApp(
          theme: premiumTheme(0xFFD5D9DC),
          home: const RegistrationPage(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> fill(WidgetTester tester) async {
    for (final entry in {
      'register-name': 'María Prueba',
      'register-email': 'test@example.invalid',
      'register-password': 'PruebaKora2026!',
      'register-birth': '01/01/2000',
      'register-phone': '3015550100',
    }.entries) {
      final finder = find.byKey(Key(entry.key));
      await reveal(tester, finder);
      await tester.enterText(finder, entry.value);
    }
    await reveal(tester, find.byKey(const Key('register-consent')));
    await tester.tap(find.byKey(const Key('register-consent')));
  }

  testWidgets(
    'server consent is shown and only a confirmed response creates success',
    (tester) async {
      final repository = TestRepository();
      await launch(tester, repository);
      await fill(tester);
      expect(
        find.byKey(const Key('registration-consent-text')),
        findsOneWidget,
      );
      await reveal(tester, find.byKey(const Key('register-submit')));
      await tester.tap(find.byKey(const Key('register-submit')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('registration-success')), findsOneWidget);
      expect(repository.keys.length, 1);
      expect(find.byKey(const Key('register-password')), findsNothing);
    },
  );
  testWidgets(
    'policy changes uncheck consent and display the replacement text',
    (tester) async {
      final repository = TestRepository();
      await launch(tester, repository);
      await fill(tester);
      repository.current = policy('test-v2');
      await reveal(tester, find.byKey(const Key('register-submit')));
      await tester.tap(find.byKey(const Key('register-submit')));
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const Key('register-consent')));
      expect(
        tester
            .widget<CheckboxListTile>(find.byKey(const Key('register-consent')))
            .value,
        isFalse,
      );
      expect(repository.keys, isEmpty);
      expect(find.byKey(const Key('registration-success')), findsNothing);
    },
  );
}
