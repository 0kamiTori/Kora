import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'appearance_repository.dart';

const platinumColor = 0xFFD5D9DC;

class AppearanceState {
  const AppearanceState({
    this.color = platinumColor,
    this.saving = false,
    this.message,
  });
  final int color;
  final bool saving;
  final String? message;
}

final appearanceControllerProvider =
    AsyncNotifierProvider<AppearanceController, AppearanceState>(
      AppearanceController.new,
    );

class AppearanceController extends AsyncNotifier<AppearanceState> {
  Future<void> _queue = Future.value();
  int _revision = 0;
  int _persisted = platinumColor;

  @override
  Future<AppearanceState> build() async {
    try {
      final value = await ref.read(appearanceRepositoryProvider).readColor();
      // Reject malformed persisted values rather than applying transparency.
      _persisted = value != null && value >= 0xFF000000 && value <= 0xFFFFFFFF
          ? value
          : platinumColor;
      return AppearanceState(color: _persisted);
    } catch (_) {
      return const AppearanceState(
        message: 'No pudimos recuperar tu color. Puedes volver a elegirlo.',
      );
    }
  }

  Future<void> selectColor(int color) {
    if (color < 0xFF000000 || color > 0xFFFFFFFF) {
      throw ArgumentError.value(
        color,
        'color',
        'An opaque RGB color is required',
      );
    }
    final revision = ++_revision;
    final repository = ref.read(appearanceRepositoryProvider);
    state = AsyncData(AppearanceState(color: color, saving: true));
    // Serialize writes: rapid selections must survive restart in the same order.
    final operation = _queue.then((_) async {
      try {
        await repository.writeColor(color);
        _persisted = color;
        if (ref.mounted && revision == _revision) {
          state = AsyncData(AppearanceState(color: color));
        }
      } catch (_) {
        if (ref.mounted && revision == _revision) {
          state = AsyncData(
            AppearanceState(
              color: _persisted,
              message: 'No pudimos guardar el color. Inténtalo de nuevo.',
            ),
          );
        }
      }
    });
    _queue = operation;
    return operation;
  }

  Future<void> reset() => selectColor(platinumColor);
}

class CustomColorDraft extends Notifier<int> {
  @override
  int build() => platinumColor;

  void start(int color) => state = color;

  void changeChannel(int shift, int value) {
    state = (state & ~(0xFF << shift)) | (value.clamp(0, 255).toInt() << shift);
  }
}

final customColorDraftProvider = NotifierProvider<CustomColorDraft, int>(
  CustomColorDraft.new,
);
