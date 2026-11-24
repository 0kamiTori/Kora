import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Only non-sensitive appearance preferences belong here, never session data.
abstract interface class AppearanceRepository {
  Future<int?> readColor();
  Future<void> writeColor(int value);
}

final appearanceRepositoryProvider = Provider<AppearanceRepository>(
  (ref) => PreferencesAppearanceRepository(SharedPreferencesAsync()),
);

class PreferencesAppearanceRepository implements AppearanceRepository {
  PreferencesAppearanceRepository(this.preferences);
  final SharedPreferencesAsync preferences;
  static const key = 'kora.appearance.accent.v1';

  @override
  Future<int?> readColor() => preferences.getInt(key);

  @override
  Future<void> writeColor(int value) => preferences.setInt(key, value);
}
