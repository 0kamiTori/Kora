import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/appearance/appearance_controller.dart';
import 'core/navigation/app_router.dart';
import 'core/theme/premium_theme.dart';

class KoraApp extends ConsumerWidget {
  const KoraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appearance = ref.watch(appearanceControllerProvider);
    final ready = appearance.asData?.value;
    return MaterialApp.router(
      title: 'Köra',
      debugShowCheckedModeBanner: false,
      locale: const Locale('es'),
      supportedLocales: const [Locale('es')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: premiumTheme(ready?.color ?? platinumColor),
      themeAnimationDuration:
          (MediaQuery.maybeOf(context)?.disableAnimations ?? false)
          ? Duration.zero
          : const Duration(milliseconds: 200),
      routerConfig: ref.watch(appRouterProvider),
      builder: (context, child) => ready == null
          ? const ColoredBox(
              color: KoraColors.background,
              child: Center(child: CircularProgressIndicator()),
            )
          : child!,
    );
  }
}
