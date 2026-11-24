import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/premium_theme.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Tu espacio')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: KoraColors.surface,
                border: Border.all(color: KoraColors.border),
              ),
              child: Icon(
                Icons.person_outline,
                color: Theme.of(context).colorScheme.primary,
                size: 32,
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Köra, a tu estilo.',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 12),
          const Text(
            'Los pequeños detalles también hacen tu experiencia.',
            style: TextStyle(color: KoraColors.muted),
          ),
          const SizedBox(height: 30),
          ListTile(
            key: const Key('appearance-entry'),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 10,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: KoraColors.border),
            ),
            tileColor: KoraColors.surface,
            leading: Icon(
              Icons.palette_outlined,
              color: Theme.of(context).colorScheme.primary,
            ),
            title: const Text('Apariencia'),
            subtitle: const Text('Elige el color de tu aplicación'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/profile/appearance'),
          ),
          const SizedBox(height: 30),
          const Text(
            'Versión inicial · Las funciones de cuenta y viajes se incorporarán por etapas.',
            style: TextStyle(
              color: KoraColors.muted,
              fontSize: 12,
              height: 1.7,
            ),
          ),
        ],
      ),
    ),
  );
}
