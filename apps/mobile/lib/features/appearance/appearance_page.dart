import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/appearance/appearance_controller.dart';
import '../../core/theme/premium_theme.dart';

const accentPresets = <(String, int)>[
  ('Platino', platinumColor),
  ('Zafiro', 0xFF91BBFF),
  ('Jade', 0xFF91D9C1),
  ('Amatista', 0xFFC8B5FF),
  ('Cobre', 0xFFF2B48E),
  ('Rosa', 0xFFF0AFD1),
];

String colorHex(int value) =>
    '#${(value & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase()}';

class AppearancePage extends ConsumerWidget {
  const AppearancePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings =
        ref.watch(appearanceControllerProvider).asData?.value ??
        const AppearanceState();
    final controller = ref.read(appearanceControllerProvider.notifier);
    final accent = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(title: const Text('Apariencia')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
          children: [
            Text(
              'Premium.\nPersonal.',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 12),
            const Text(
              'Mantén la esencia oscura y elige el color de tus detalles.',
              style: TextStyle(color: KoraColors.muted),
            ),
            const SizedBox(height: 26),
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [accent.withValues(alpha: .12), KoraColors.surface],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: KoraColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.auto_awesome_outlined, color: accent),
                      const SizedBox(width: 10),
                      const Expanded(child: Text('Tu toque Köra')),
                    ],
                  ),
                  const SizedBox(height: 22),
                  Text(
                    'Un color que se\nsiente tuyo.',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 20),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: accent,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 12,
                      ),
                      child: Text(
                        'Así se verá tu acento',
                        style: TextStyle(
                          color: textOnAccent(accent),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            Text(
              'Colores de la colección',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                final width = (constraints.maxWidth - 12) / 2;
                return Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    for (final (name, value) in accentPresets)
                      SizedBox(
                        width: width,
                        child: Semantics(
                          selected: settings.color == value,
                          child: OutlinedButton(
                            key: Key('accent-$name'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 15,
                              ),
                              side: BorderSide(
                                color: settings.color == value
                                    ? accent
                                    : KoraColors.border,
                              ),
                              backgroundColor: settings.color == value
                                  ? accent.withValues(alpha: .08)
                                  : KoraColors.surface,
                            ),
                            onPressed: () => controller.selectColor(value),
                            child: Row(
                              children: [
                                Container(
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    color: Color(value),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 9),
                                Expanded(
                                  child: Text(
                                    name,
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ),
                                if (settings.color == value)
                                  const Icon(Icons.check, size: 17),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 18),
            OutlinedButton.icon(
              key: const Key('custom-color'),
              onPressed: () {
                ref
                    .read(customColorDraftProvider.notifier)
                    .start(settings.color);
                showModalBottomSheet<void>(
                  context: context,
                  showDragHandle: true,
                  isScrollControlled: true,
                  builder: (_) => const CustomColorSheet(),
                );
              },
              icon: const Icon(Icons.color_lens_outlined),
              label: const Text('Crear mi color'),
            ),
            const SizedBox(height: 12),
            Text(
              'Color elegido ${colorHex(settings.color)}',
              key: const Key('saved-color-label'),
              style: const TextStyle(color: KoraColors.muted, fontSize: 12),
            ),
            const SizedBox(height: 10),
            if (settings.saving)
              const Text(
                'Guardando tu color…',
                style: TextStyle(color: KoraColors.muted),
              ),
            if (settings.message case final message?)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Semantics(
                  liveRegion: true,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.info_outline, color: KoraColors.pending),
                      const SizedBox(width: 10),
                      Expanded(child: Text(message)),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            const Text(
              'Los colores de ayuda, errores y verificación conservan su significado. Los tonos muy oscuros se aclaran para mantener la lectura.',
              style: TextStyle(
                color: KoraColors.muted,
                fontSize: 12,
                height: 1.7,
              ),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              key: const Key('reset-color'),
              onPressed: controller.reset,
              icon: const Icon(Icons.restart_alt),
              label: const Text('Volver al platino'),
            ),
          ],
        ),
      ),
    );
  }
}

class CustomColorSheet extends ConsumerWidget {
  const CustomColorSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(customColorDraftProvider);
    final draft = ref.read(customColorDraftProvider.notifier);
    final color = Color(value);
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Crea tu color',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: KoraColors.border),
                ),
                child: Text(
                  colorHex(value),
                  style: TextStyle(
                    color: textOnAccent(color),
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              for (final (name, shift) in [
                ('Rojo', 16),
                ('Verde', 8),
                ('Azul', 0),
              ])
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$name · ${(value >> shift) & 0xFF}'),
                    Slider(
                      key: Key('channel-$name'),
                      label: '$name ${(value >> shift) & 0xFF}',
                      min: 0,
                      max: 255,
                      divisions: 255,
                      value: ((value >> shift) & 0xFF).toDouble(),
                      semanticFormatterCallback: (value) =>
                          '$name ${value.round()} de 255',
                      onChanged: (value) =>
                          draft.changeChannel(shift, value.round()),
                    ),
                  ],
                ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  key: const Key('apply-custom'),
                  onPressed: () {
                    ref
                        .read(appearanceControllerProvider.notifier)
                        .selectColor(value);
                    Navigator.pop(context);
                  },
                  child: const Text('Guardar mi color'),
                ),
              ),
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancelar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
