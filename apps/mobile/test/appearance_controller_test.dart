import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kora_mobile/core/appearance/appearance_controller.dart';
import 'package:kora_mobile/core/appearance/appearance_repository.dart';
import 'package:kora_mobile/core/theme/premium_theme.dart';

class MemoryAppearanceRepository implements AppearanceRepository {
  int? color;
  bool failRead = false;
  bool failWrite = false;
  final writes = <int>[];
  Completer<void>? gate;

  @override
  Future<int?> readColor() async {
    if (failRead) throw StateError('storage unavailable');
    return color;
  }

  @override
  Future<void> writeColor(int value) async {
    if (gate != null) await gate!.future;
    if (failWrite) throw StateError('storage unavailable');
    writes.add(value);
    color = value;
  }
}

void main() {
  late MemoryAppearanceRepository repository;
  late ProviderContainer container;

  setUp(() {
    repository = MemoryAppearanceRepository();
    container = ProviderContainer(
      overrides: [appearanceRepositoryProvider.overrideWithValue(repository)],
    );
  });
  tearDown(() => container.dispose());

  test('default is platinum; malformed stored colors are rejected', () async {
    repository.color = 0x00112233;
    expect(
      (await container.read(appearanceControllerProvider.future)).color,
      platinumColor,
    );
  });

  test('selection survives a fresh controller and can be reset', () async {
    await container.read(appearanceControllerProvider.future);
    await container
        .read(appearanceControllerProvider.notifier)
        .selectColor(0xFF91D9C1);
    final restarted = ProviderContainer(
      overrides: [appearanceRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(restarted.dispose);
    expect(
      (await restarted.read(appearanceControllerProvider.future)).color,
      0xFF91D9C1,
    );
    await restarted.read(appearanceControllerProvider.notifier).reset();
    expect(repository.color, platinumColor);
  });

  test(
    'read failure keeps the app usable and exposes a retryable notice',
    () async {
      repository.failRead = true;
      final settings = await container.read(
        appearanceControllerProvider.future,
      );
      expect(settings.color, platinumColor);
      expect(settings.message, isNotNull);
      await container
          .read(appearanceControllerProvider.notifier)
          .selectColor(0xFF91BBFF);
      expect(
        container.read(appearanceControllerProvider).requireValue.message,
        isNull,
      );
    },
  );

  test(
    'failed save restores last persisted color and is recoverable',
    () async {
      repository.color = 0xFF91D9C1;
      await container.read(appearanceControllerProvider.future);
      repository.failWrite = true;
      await container
          .read(appearanceControllerProvider.notifier)
          .selectColor(0xFF91BBFF);
      expect(
        container.read(appearanceControllerProvider).requireValue.color,
        0xFF91D9C1,
      );
      expect(
        container.read(appearanceControllerProvider).requireValue.message,
        isNotNull,
      );
      repository.failWrite = false;
      await container.read(appearanceControllerProvider.notifier).reset();
      expect(repository.color, platinumColor);
    },
  );

  test('rapid choices are serialized and the final choice persists', () async {
    await container.read(appearanceControllerProvider.future);
    repository.gate = Completer<void>();
    final controller = container.read(appearanceControllerProvider.notifier);
    final first = controller.selectColor(0xFF91D9C1);
    final second = controller.selectColor(0xFFF0AFD1);
    expect(
      container.read(appearanceControllerProvider).requireValue.color,
      0xFFF0AFD1,
    );
    repository.gate!.complete();
    await Future.wait([first, second]);
    expect(repository.writes, [0xFF91D9C1, 0xFFF0AFD1]);
    expect(repository.color, 0xFFF0AFD1);
    expect(
      container.read(appearanceControllerProvider).requireValue.saving,
      false,
    );
  });

  test(
    'canceling a custom draft does not persist or change the chosen color',
    () async {
      await container.read(appearanceControllerProvider.future);
      container.read(customColorDraftProvider.notifier).start(platinumColor);
      container.read(customColorDraftProvider.notifier).changeChannel(16, 0);
      expect(container.read(customColorDraftProvider), isNot(platinumColor));
      expect(
        container.read(appearanceControllerProvider).requireValue.color,
        platinumColor,
      );
      expect(repository.writes, isEmpty);
    },
  );

  test('arbitrary dark and saturated colors preserve legible text and semantic colors', () {
    for (final color in [
      Colors.black,
      Colors.white,
      const Color(0xFF001122),
      Colors.blue,
      Colors.red,
      Colors.green,
      const Color(0xFFD5D9DC),
    ]) {
      final accent = readableAccent(color);
      expect(
        contrastRatio(accent, KoraColors.elevated),
        greaterThanOrEqualTo(4.5),
      );
      expect(
        contrastRatio(accent, textOnAccent(accent)),
        greaterThanOrEqualTo(4.5),
      );
      expect(
        premiumTheme(color.toARGB32()).colorScheme.error,
        KoraColors.danger,
      );
    }
  });
}
