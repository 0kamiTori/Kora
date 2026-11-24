import 'package:material_ui/material_ui.dart';

import '../../core/theme/premium_theme.dart';

class TripsPage extends StatelessWidget {
  const TripsPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Tus viajes')),
    body: SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 42),
              Icon(
                Icons.route_outlined,
                size: 56,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'Un nuevo camino\nte espera.',
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 16),
              const Text(
                'Aún no hay viajes para mostrar. Aquí encontrarás el estado y el historial de tus trayectos cuando tu cuenta esté disponible.',
                style: TextStyle(color: KoraColors.muted, height: 1.7),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
