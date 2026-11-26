import 'dart:io';
import 'dart:ui' as ui;

import 'package:material_ui/material_ui.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kora_mobile/app.dart';
import 'package:kora_mobile/core/appearance/appearance_controller.dart';
import 'package:kora_mobile/core/appearance/appearance_repository.dart';
import 'package:kora_mobile/features/shell/home_page.dart';
import 'package:kora_mobile/features/appearance/appearance_page.dart';

import 'appearance_controller_test.dart' show MemoryAppearanceRepository;

void main() {
  Future<void> launch(
    WidgetTester tester,
    MemoryAppearanceRepository repository, {
    double textScale = 1,
    GlobalKey? captureKey,
  }) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [appearanceRepositoryProvider.overrideWithValue(repository)],
        child: MediaQuery(
          data: MediaQueryData(
            size: const Size(390, 844),
            textScaler: TextScaler.linear(textScale),
          ),
          child: RepaintBoundary(key: captureKey, child: const KoraApp()),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> appearance(WidgetTester tester) async {
    await tester.tap(find.text('Perfil'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('appearance-entry')),
      180,
      scrollable: find.byType(Scrollable).last,
    );
    await Scrollable.ensureVisible(
      tester.element(find.byKey(const Key('appearance-entry'))),
      alignment: .25,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('appearance-entry')));
    await tester.pumpAndSettle();
  }

  Future<void> reveal(WidgetTester tester, Finder finder) async {
    await tester.scrollUntilVisible(
      finder,
      180,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'profile changes appearance app-wide without resetting navigation',
    (tester) async {
      final repository = MemoryAppearanceRepository();
      await launch(tester, repository);
      await appearance(tester);
      await reveal(tester, find.byKey(const Key('accent-Jade')));
      await tester.tap(find.byKey(const Key('accent-Jade')));
      await tester.pumpAndSettle();
      expect(repository.color, 0xFF91D9C1);
      expect(find.byType(AppearancePage), findsOneWidget);
      await tester.tap(find.text('Inicio'));
      await tester.pumpAndSettle();
      final homeContext = tester.element(find.byType(HomePage));
      expect(
        Theme.of(homeContext).colorScheme.primary,
        const Color(0xFF91D9C1),
      );
      expect(find.text('Sin viaje activo'), findsOneWidget);
      expect(find.textContaining('Identidad verificada'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('custom color can be canceled, saved and restored to platinum', (
    tester,
  ) async {
    final repository = MemoryAppearanceRepository();
    await launch(tester, repository);
    await appearance(tester);
    await reveal(tester, find.byKey(const Key('custom-color')));
    await tester.tap(find.byKey(const Key('custom-color')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    expect(repository.writes, isEmpty);
    await tester.tap(find.byKey(const Key('custom-color')));
    await tester.pumpAndSettle();
    await tester.drag(
      find.byKey(const Key('channel-Rojo')),
      const Offset(-100, 0),
    );
    await tester.pumpAndSettle();
    await reveal(tester, find.byKey(const Key('apply-custom')));
    await tester.tap(find.byKey(const Key('apply-custom')));
    await tester.pumpAndSettle();
    expect(repository.color, isNot(platinumColor));
    await reveal(tester, find.byKey(const Key('reset-color')));
    await tester.tap(find.byKey(const Key('reset-color')));
    await tester.pumpAndSettle();
    expect(repository.color, platinumColor);
    expect(tester.takeException(), isNull);
  });

  testWidgets('large text remains scrollable with no layout exceptions', (
    tester,
  ) async {
    await launch(tester, MemoryAppearanceRepository(), textScale: 2);
    expect(tester.takeException(), isNull);
    await appearance(tester);
    await reveal(tester, find.byKey(const Key('custom-color')));
    await tester.tap(find.byKey(const Key('custom-color')));
    await tester.pumpAndSettle();
    await reveal(tester, find.byKey(const Key('apply-custom')));
    expect(tester.takeException(), isNull);
  });

  testWidgets('initial app does not claim to request or authorize a trip', (
    tester,
  ) async {
    await launch(tester, MemoryAppearanceRepository());
    await reveal(tester, find.text('Planear un viaje'));
    await tester.tap(find.text('Planear un viaje'));
    await tester.pumpAndSettle();
    expect(find.text('Tu cuenta primero'), findsOneWidget);
    expect(find.textContaining('siguiente etapa'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  final captureDirectory = Platform.environment['KORA_CAPTURE_DIR'];
  testWidgets('capture native Flutter views for local visual review', (
    tester,
  ) async {
    final fontPath = Platform.environment['KORA_CAPTURE_FONT'];
    if (fontPath != null) {
      await tester.runAsync(() async {
        final loader = FontLoader('Roboto')
          ..addFont(
            File(fontPath)
                .readAsBytes()
                .then((bytes) => ByteData.sublistView(bytes)),
          );
        await loader.load();
        final iconPath = Platform.environment['KORA_CAPTURE_ICONS'];
        if (iconPath != null) {
          final icon = Icons.home_outlined;
          final family = icon.fontPackage == null
              ? icon.fontFamily!
              : 'packages/${icon.fontPackage}/${icon.fontFamily}';
          final icons = FontLoader(family)
            ..addFont(
              File(iconPath)
                  .readAsBytes()
                  .then((bytes) => ByteData.sublistView(bytes)),
            );
          await icons.load();
        }
      });
    }
    final key = GlobalKey();
    await launch(tester, MemoryAppearanceRepository(), captureKey: key);
    Future<void> capture(String name) async {
      await tester.runAsync(() async {
        final boundary =
            key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        await File('$captureDirectory/$name.png')
            .writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
      });
    }

    await capture('home');
    await appearance(tester);
    await capture('appearance-platinum');
    await reveal(tester, find.byKey(const Key('accent-Jade')));
    await tester.tap(find.byKey(const Key('accent-Jade')));
    await tester.pumpAndSettle();
    await capture('appearance-jade');
    await reveal(tester, find.byKey(const Key('custom-color')));
    await tester.tap(find.byKey(const Key('custom-color')));
    await tester.pumpAndSettle();
    await capture('custom-color');
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Inicio'));
    await tester.pumpAndSettle();
    await capture('home-jade');
  }, skip: captureDirectory == null);
}
