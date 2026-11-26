import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kora_mobile/core/theme/premium_theme.dart';
import 'package:kora_mobile/features/onboarding/registration_page.dart';
import 'package:kora_mobile/features/onboarding/driver_pages.dart';
import 'package:kora_mobile/features/onboarding/onboarding_controller.dart';
import 'package:kora_mobile/features/onboarding/onboarding_models.dart';

void main() {
  test(
    'adult boundary uses the birthday, rejects future and impossible dates',
    () {
      final today = DateTime.utc(2026, 11, 26);
      expect(birthDateError('26/11/2008', today), isNull);
      expect(birthDateError('27/11/2008', today), RegistrationMessages.age);
      expect(birthDateError('27/11/2026', today), RegistrationMessages.date);
      expect(birthDateError('31/02/2000', today), RegistrationMessages.date);
      expect(parseBirthDate('29/02/2004'), isNotNull);
    },
  );

  test(
    'password categories, nonunique display names and international phone',
    () {
      expect(validPassword('Abcdefghij1!'), isTrue);
      for (final value in [
        'Abcdefghi1!',
        'abcdefghij1!',
        'ABCDEFGHIJ1!',
        'Abcdefghijk!',
        'Abcdefghij12',
      ]) {
        expect(validPassword(value), isFalse, reason: value);
      }
      expect(validDisplayName('María José Ñ 2'), isTrue);
      expect(validDisplayName(List.filled(100, 'ñ').join()), isTrue);
      expect(validDisplayName(List.filled(101, 'ñ').join()), isFalse);
      expect(validDisplayName('María_2'), isFalse);
      expect(validDisplayName('   '), isFalse);
      expect(normalizePhone('+57', '300 000-0000'), '+573000000000');
      expect(
        normalizePhone('+57', '3000000000'),
        normalizePhone('57', '(300) 000-0000'),
      );
      expect(
        normalizePhone('+58', '3000000000'),
        isNot(normalizePhone('+57', '3000000000')),
      );
      expect(normalizePhone('+57', '123'), isNull);
    },
  );

  test(
    'appeals need rejection, remaining opportunity and server permission',
    () {
      expect(
        const DriverReview(
          stage: ReviewStage.rejected,
          canAppeal: true,
        ).allowsAppeal,
        isTrue,
      );
      expect(
        const DriverReview(
          stage: ReviewStage.rejected,
          appealsUsed: 1,
          canAppeal: true,
        ).allowsAppeal,
        isTrue,
      );
      expect(
        const DriverReview(
          stage: ReviewStage.rejected,
          appealsUsed: 2,
          canAppeal: true,
        ).allowsAppeal,
        isFalse,
      );
      expect(
        const DriverReview(
          stage: ReviewStage.appealPending,
          appealsUsed: 1,
          canAppeal: true,
        ).allowsAppeal,
        isFalse,
      );
      expect(
        const DriverReview(stage: ReviewStage.rejected).allowsAppeal,
        isFalse,
      );
      expect(
        const DriverReview(stage: ReviewStage.unavailable).allowsAppeal,
        isFalse,
      );
    },
  );

  Future<void> launch(
    WidgetTester tester,
    Widget page, {
    DriverReview review = const DriverReview(stage: ReviewStage.unavailable),
    double scale = 1,
    GlobalKey? captureKey,
  }) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          driverReviewProvider.overrideWithValue(review),
          registrationDateProvider.overrideWithValue(
            DateTime.utc(2026, 11, 26),
          ),
        ],
        child: RepaintBoundary(
          key: captureKey,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: premiumTheme(0xFFD5D9DC),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: TextScaler.linear(scale)),
              child: child!,
            ),
            home: page,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> reveal(WidgetTester tester, Finder finder) async {
    await tester.scrollUntilVisible(
      finder,
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'registration reports missing data and missing explicit consent',
    (tester) async {
      await launch(tester, const RegistrationPage());
      await reveal(tester, find.byKey(const Key('register-submit')));
      await tester.tap(find.byKey(const Key('register-submit')));
      await tester.pumpAndSettle();
      expect(find.text(RegistrationMessages.consent), findsOneWidget);
      expect(find.text(RegistrationMessages.missing), findsWidgets);
      expect(find.text('Conexión pendiente'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'valid form does not falsely create an account or approve driver',
    (tester) async {
      await launch(tester, const RegistrationPage());
      for (final entry in {
        'register-name': 'María Ñ 2',
        'register-email': 'prueba@example.invalid',
        'register-password': 'Abcdefghij1!',
        'register-birth': '26/11/2008',
        'register-phone': '3000000000',
      }.entries) {
        final finder = find.byKey(Key(entry.key));
        await reveal(tester, finder);
        await tester.enterText(finder, entry.value);
      }
      await reveal(tester, find.byKey(const Key('register-consent')));
      await tester.tap(find.byKey(const Key('register-consent')));
      await reveal(tester, find.byKey(const Key('register-submit')));
      await tester.tap(find.byKey(const Key('register-submit')));
      await tester.pumpAndSettle();
      expect(find.text('Conexión pendiente'), findsOneWidget);
      expect(
        find.textContaining('No se ha guardado ni enviado'),
        findsOneWidget,
      );
      expect(find.text('Cuenta creada'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'appeal needs reason; no fake submission or consumed opportunity',
    (tester) async {
      const review = DriverReview(
        stage: ReviewStage.rejected,
        appealsUsed: 1,
        canAppeal: true,
        reason: 'Observación de prueba, sin documentos personales.',
      );
      await launch(tester, const DriverAppealPage(), review: review);
      await reveal(tester, find.byKey(const Key('appeal-submit')));
      await tester.tap(find.byKey(const Key('appeal-submit')));
      await tester.pumpAndSettle();
      expect(find.text('Escribe el motivo de tu apelación'), findsOneWidget);
      await reveal(tester, find.byKey(const Key('appeal-reason')));
      await tester.enterText(
        find.byKey(const Key('appeal-reason')),
        'Solicito revisar la observación.',
      );
      await reveal(tester, find.byKey(const Key('appeal-submit')));
      await tester.tap(find.byKey(const Key('appeal-submit')));
      await tester.pumpAndSettle();
      expect(find.text('Conexión pendiente'), findsOneWidget);
      expect(review.appealsUsed, 1);
    },
  );

  testWidgets('pending appeal and exhausted attempts cannot submit', (
    tester,
  ) async {
    for (final review in [
      const DriverReview(stage: ReviewStage.appealPending, appealsUsed: 1),
      const DriverReview(stage: ReviewStage.rejected, appealsUsed: 2),
      const DriverReview(stage: ReviewStage.unavailable),
    ]) {
      await launch(tester, const DriverAppealPage(), review: review);
      await reveal(tester, find.byKey(const Key('appeal-submit')));
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('appeal-submit')))
            .onPressed,
        isNull,
      );
    }
  });

  testWidgets('30 day wait shows server date without local unlock', (
    tester,
  ) async {
    await launch(
      tester,
      const DriverStatusPage(),
      review: DriverReview(
        stage: ReviewStage.rejected,
        appealsUsed: 2,
        nextApplicationAt: DateTime.utc(2026, 12, 26, 15),
      ),
    );
    await reveal(tester, find.textContaining('A partir del'));
    expect(
      find.text('A partir del 26/12/2026 a las 10:00 (Colombia)'),
      findsOneWidget,
    );
    expect(find.text('Preparar nueva solicitud'), findsNothing);
    expect(find.byKey(const Key('status-appeal')), findsNothing);
  });

  testWidgets('all onboarding pages support 200 percent text', (tester) async {
    for (final page in [
      const RegistrationPage(),
      const DriverRequestPage(),
      const DriverStatusPage(),
      const DriverAppealPage(),
    ]) {
      await launch(tester, page, scale: 2);
      await tester.drag(find.byType(ListView).first, const Offset(0, -1800));
      await tester.pumpAndSettle();
      expect(
        tester.takeException(),
        isNull,
        reason: page.runtimeType.toString(),
      );
    }
  });

  final directory = Platform.environment['KORA_ONBOARDING_CAPTURE_DIR'];
  testWidgets('capture onboarding designs using test-only server states', (
    tester,
  ) async {
    await tester.runAsync(() async {
      final fontPath = Platform.environment['KORA_CAPTURE_FONT'];
      final iconPath = Platform.environment['KORA_CAPTURE_ICONS'];
      if (fontPath != null) {
        final loader = FontLoader('Roboto')
          ..addFont(File(fontPath).readAsBytes().then(ByteData.sublistView));
        await loader.load();
      }
      if (iconPath != null) {
        final icon = Icons.home_outlined;
        final family = icon.fontPackage == null
            ? icon.fontFamily!
            : 'packages/${icon.fontPackage}/${icon.fontFamily}';
        final loader = FontLoader(family)
          ..addFont(File(iconPath).readAsBytes().then(ByteData.sublistView));
        await loader.load();
      }
    });
    final scenarios = <String, (Widget, DriverReview)>{
      'registro': (
        const RegistrationPage(),
        const DriverReview(stage: ReviewStage.unavailable),
      ),
      'solicitud': (
        const DriverRequestPage(),
        const DriverReview(stage: ReviewStage.unavailable),
      ),
      'estado': (
        const DriverStatusPage(),
        const DriverReview(
          stage: ReviewStage.rejected,
          canAppeal: true,
          reason:
              'Ejemplo de prueba: se solicita revisar la información aportada.',
        ),
      ),
      'apelacion': (
        const DriverAppealPage(),
        const DriverReview(
          stage: ReviewStage.rejected,
          appealsUsed: 1,
          canAppeal: true,
          reason: 'Ejemplo de prueba: la primera revisión mantuvo el rechazo.',
        ),
      ),
      'espera-30-dias': (
        const DriverStatusPage(),
        DriverReview(
          stage: ReviewStage.rejected,
          appealsUsed: 2,
          reason:
              'Ejemplo de prueba: decisión definitiva de la segunda apelación.',
          nextApplicationAt: DateTime.utc(2026, 12, 26, 15),
        ),
      ),
    };
    for (final entry in scenarios.entries) {
      final key = GlobalKey();
      await launch(
        tester,
        entry.value.$1,
        review: entry.value.$2,
        captureKey: key,
      );
      await tester.runAsync(() async {
        final boundary =
            key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        await File('$directory/${entry.key}.png')
            .writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
      });
    }
  }, skip: directory == null);
}
