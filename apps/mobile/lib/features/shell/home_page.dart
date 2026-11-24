import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/premium_theme.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: IntrinsicHeight(
            child: Column(
              children: [
                SizedBox(
                  height: (constraints.maxHeight * .45).clamp(240.0, 360.0),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      const ExcludeSemantics(
                        child: CustomPaint(painter: CityTexturePainter()),
                      ),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              KoraColors.background.withValues(alpha: .2),
                              KoraColors.background.withValues(alpha: .12),
                              KoraColors.background,
                            ],
                          ),
                        ),
                      ),
                      SafeArea(
                        bottom: false,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 26,
                            vertical: 12,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Align(
                                      alignment: Alignment.centerLeft,
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          'köra',
                                          style: Theme.of(context)
                                              .textTheme
                                              .displayLarge,
                                        ),
                                      ),
                                    ),
                                  ),
                                  IconButton.outlined(
                                    tooltip: 'Cambiar apariencia',
                                    onPressed: () =>
                                        context.push('/profile/appearance'),
                                    icon: const Icon(Icons.palette_outlined),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 13,
                                  vertical: 9,
                                ),
                                decoration: BoxDecoration(
                                  color: KoraColors.surface,
                                  borderRadius: BorderRadius.circular(30),
                                  border: Border.all(color: KoraColors.border),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.trip_origin,
                                      size: 16,
                                      color: KoraColors.muted,
                                    ),
                                    SizedBox(width: 8),
                                    Flexible(child: Text('Sin viaje activo')),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(26, 20, 26, 26),
                    decoration: const BoxDecoration(
                      color: KoraColors.background,
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(32),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 34,
                          height: 3,
                          margin: const EdgeInsets.only(bottom: 25),
                          decoration: BoxDecoration(
                            color: KoraColors.border,
                            borderRadius: BorderRadius.circular(5),
                          ),
                        ),
                        Text(
                          'Muévete a tu manera.',
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Tu próximo trayecto empieza aquí.',
                          style: TextStyle(
                            color: KoraColors.muted,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: KoraColors.surface,
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(color: KoraColors.border),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.location_on_outlined, color: accent),
                              const SizedBox(width: 14),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Tu punto de partida',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'Ubicación sin configurar',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: KoraColors.muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: () => showModalBottomSheet<void>(
                              context: context,
                              showDragHandle: true,
                              isScrollControlled: true,
                              builder: (context) => SafeArea(
                                child: SingleChildScrollView(
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      26,
                                      8,
                                      26,
                                      28,
                                    ),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Tu cuenta primero',
                                          style: Theme.of(context)
                                              .textTheme
                                              .headlineMedium,
                                        ),
                                        const SizedBox(height: 14),
                                        const Text(
                                          'El registro y la solicitud de viajes estarán disponibles en la siguiente etapa. Por ahora puedes explorar y personalizar Köra.',
                                        ),
                                        const SizedBox(height: 22),
                                        SizedBox(
                                          width: double.infinity,
                                          child: FilledButton(
                                            onPressed: () =>
                                                Navigator.pop(context),
                                            child: const Text('Entendido'),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            icon: const Icon(Icons.north_east),
                            label: const Text('Planear un viaje'),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Center(
                          child: TextButton.icon(
                            onPressed: () =>
                                context.push('/profile/appearance'),
                            icon: const Icon(Icons.tune, size: 18),
                            label: const Text('Haz Köra tuya'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Abstract city texture, never a GPS fix, route or live location.
class CityTexturePainter extends CustomPainter {
  const CityTexturePainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFF172023),
    );
    final parks = Paint()..color = const Color(0xFF22332F);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * .12,
          size.height * .25,
          size.width * .3,
          size.height * .32,
        ),
        const Radius.circular(20),
      ),
      parks,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * .7,
          size.height * .4,
          size.width * .3,
          size.height * .35,
        ),
        const Radius.circular(16),
      ),
      parks,
    );
    final road = Paint()
      ..color = const Color(0xFF344147)
      ..strokeWidth = 10
      ..style = PaintingStyle.stroke;
    for (var i = -2; i < 7; i++) {
      canvas.drawLine(
        Offset(i * size.width / 4, -20),
        Offset((i + 1.6) * size.width / 4, size.height + 20),
        road,
      );
      canvas.drawLine(
        Offset(-20, i * size.height / 4),
        Offset(size.width + 20, (i - .7) * size.height / 4),
        road..strokeWidth = 7,
      );
    }
  }

  @override
  bool shouldRepaint(CityTexturePainter oldDelegate) => false;
}
