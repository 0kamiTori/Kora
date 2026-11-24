import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/appearance/appearance_page.dart';
import '../../features/shell/home_page.dart';
import '../../features/shell/profile_page.dart';
import '../../features/shell/trips_page.dart';
import '../theme/premium_theme.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    routes: [
      ShellRoute(
        builder: (context, state, child) =>
            KoraShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/', builder: (_, _) => const HomePage()),
          GoRoute(path: '/trips', builder: (_, _) => const TripsPage()),
          GoRoute(
            path: '/profile',
            builder: (_, _) => const ProfilePage(),
            routes: [
              GoRoute(
                path: 'appearance',
                builder: (_, _) => const AppearancePage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

class KoraShell extends StatelessWidget {
  const KoraShell({super.key, required this.location, required this.child});
  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final selected = location.startsWith('/profile')
        ? 2
        : location == '/trips'
        ? 1
        : 0;
    return Scaffold(
      body: child,
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: KoraColors.border, width: .5)),
        ),
        child: NavigationBar(
          selectedIndex: selected,
          onDestinationSelected: (index) =>
              context.go(['/', '/trips', '/profile'][index]),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Inicio',
            ),
            NavigationDestination(
              icon: Icon(Icons.route_outlined),
              selectedIcon: Icon(Icons.route_rounded),
              label: 'Viajes',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Perfil',
            ),
          ],
        ),
      ),
    );
  }
}
