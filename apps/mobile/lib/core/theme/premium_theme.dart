import 'package:material_ui/material_ui.dart';

abstract final class KoraColors {
  static const background = Color(0xFF101416);
  static const surface = Color(0xFF1E252A);
  static const elevated = Color(0xFF293137);
  static const text = Color(0xFFF2F3F2);
  static const muted = Color(0xFFB5BEC5);
  static const border = Color(0xFF465159);
  // Semantic states never follow the user accent.
  static const danger = Color(0xFFFFAAAA);
  static const pending = Color(0xFFF0D39B);
  static const success = Color(0xFFA9DFC3);
}

double contrastRatio(Color first, Color second) {
  final a = first.computeLuminance();
  final b = second.computeLuminance();
  return a > b ? (a + .05) / (b + .05) : (b + .05) / (a + .05);
}

/// Keep even very dark custom accents legible against premium surfaces.
Color readableAccent(Color selected) {
  for (var step = 0; step <= 100; step++) {
    final candidate = Color.lerp(selected, Colors.white, step / 100)!;
    if (contrastRatio(candidate, KoraColors.elevated) >= 4.5) return candidate;
  }
  return Colors.white;
}

Color textOnAccent(Color accent) =>
    contrastRatio(Colors.black, accent) >= contrastRatio(Colors.white, accent)
    ? Colors.black
    : Colors.white;

ThemeData premiumTheme(int color) {
  final accent = readableAccent(Color(color));
  final scheme = ColorScheme.dark(
    primary: accent,
    onPrimary: textOnAccent(accent),
    secondary: const Color(0xFFD5D9DC),
    onSecondary: const Color(0xFF101416),
    surface: KoraColors.surface,
    onSurface: KoraColors.text,
    onSurfaceVariant: KoraColors.muted,
    outline: KoraColors.border,
    error: KoraColors.danger,
    onError: const Color(0xFF3B1118),
  );
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: KoraColors.background,
    splashFactory: InkSparkle.splashFactory,
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        fontSize: 48,
        fontWeight: FontWeight.w500,
        letterSpacing: -2,
      ),
      headlineLarge: TextStyle(
        fontSize: 34,
        fontWeight: FontWeight.w500,
        letterSpacing: -1,
      ),
      headlineMedium: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w500,
        letterSpacing: -.6,
      ),
      titleLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      bodyLarge: TextStyle(fontSize: 16, height: 1.5),
      bodyMedium: TextStyle(fontSize: 14, height: 1.5),
      labelLarge: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
    ).apply(bodyColor: KoraColors.text, displayColor: KoraColors.text),
    appBarTheme: const AppBarTheme(
      backgroundColor: KoraColors.background,
      foregroundColor: KoraColors.text,
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 54),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 52),
        foregroundColor: KoraColors.text,
        side: const BorderSide(color: KoraColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: KoraColors.background,
      indicatorColor: accent.withValues(alpha: .15),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected)
              ? accent
              : KoraColors.muted,
        ),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 12,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w600
              : FontWeight.w400,
          color: states.contains(WidgetState.selected)
              ? accent
              : KoraColors.muted,
        ),
      ),
    ),
    sliderTheme: SliderThemeData(activeTrackColor: accent, thumbColor: accent),
    dividerColor: KoraColors.border,
  );
}
