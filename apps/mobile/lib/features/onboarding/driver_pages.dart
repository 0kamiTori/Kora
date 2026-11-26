import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/premium_theme.dart';
import 'onboarding_controller.dart';
import 'onboarding_models.dart';
import 'onboarding_widgets.dart';

class DriverRequestPage extends ConsumerWidget {
  const DriverRequestPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => OnboardingLayout(
    eyebrow: 'Conduce con Köra',
    title: 'Un nuevo camino.\nTu misma cuenta.',
    description: 'Solicita tu habilitación para conducir en Colombia. Por ahora, únicamente automóviles.',
    children: [
      OnboardingCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.directions_car_outlined,
              size: 36,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 18),
            Text(
              'Antes de enviar',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 10),
            const Text(
              'Tu cuenta de pasajera se conserva. Administración revisará tu solicitud antes de habilitar el perfil de conductora.',
            ),
          ],
        ),
      ),
      Text(
        'Lo que necesitarás',
        style: Theme.of(context).textTheme.titleMedium,
      ),
      const SizedBox(height: 14),
      for (final item in [
        (
          'Documento de identidad',
          'Nombre legal, tipo y número de documento. Frente y reverso.',
        ),
        (
          'Licencia de conducción',
          'Número, categoría, vencimiento. Frente y reverso.',
        ),
        ('Tu automóvil', 'Placa, marca, línea o modelo, año y color.'),
        (
          'Evidencias del vehículo',
          'Fotografías frontal, trasera y lateral, con placa legible.',
        ),
      ])
        OnboardingCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.$1, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(item.$2, style: const TextStyle(color: KoraColors.muted)),
              const SizedBox(height: 10),
              const Text(
                'Obligatorio · Integración posterior',
                style: TextStyle(color: KoraColors.pending, fontSize: 12),
              ),
            ],
          ),
        ),
      const OnboardingNotice(
        text: 'La carga de documentos y la captura biométrica aún no están habilitadas. La primera entrega no permite viajes operativos.',
      ),
      const FilledButton(onPressed: null, child: Text('Enviar solicitud')),
      const SizedBox(height: 12),
      OutlinedButton(
        onPressed: () => context.push('/profile/driver/status'),
        child: const Text('Consultar mi estado'),
      ),
    ],
  );
}

class DriverStatusPage extends ConsumerWidget {
  const DriverStatusPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final review = ref.watch(driverReviewProvider);
    final color = switch (review.stage) {
      ReviewStage.rejected => KoraColors.danger,
      ReviewStage.approved => KoraColors.success,
      _ => KoraColors.pending,
    };
    return OnboardingLayout(
      eyebrow: 'Tu proceso',
      title: 'Cada paso,\ncon claridad.',
      description: 'Consulta las observaciones de administración y las opciones de tu solicitud.',
      children: [
        OnboardingCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                review.stage == ReviewStage.unavailable
                    ? Icons.cloud_off_outlined
                    : Icons.fact_check_outlined,
                color: color,
                size: 32,
              ),
              const SizedBox(height: 18),
              Text(review.title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              Text(switch (review.stage) {
                ReviewStage.unavailable => 'Conecta tu cuenta para consultar un estado confirmado. El servicio aún no está disponible.',
                ReviewStage.draft =>
                  'Completa los requisitos antes de enviar tu solicitud.',
                ReviewStage.pending =>
                  'Tu solicitud está pendiente de una decisión administrativa.',
                ReviewStage.corrections => 'Revisa las observaciones y corrige lo solicitado antes de reenviar.',
                ReviewStage.rejected => 'Puedes consultar el motivo y las oportunidades de revisión disponibles.',
                ReviewStage.appealPending => 'Espera la respuesta de administración antes de presentar otra apelación.',
                ReviewStage.approved => 'Este estado corresponde a la revisión administrativa. No acredita biometría verificada ni permite viajes en esta entrega.',
              }, style: const TextStyle(color: KoraColors.muted)),
              if (review.reason case final reason?) ...[
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 10),
                const Text(
                  'Motivo de administración',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(reason),
              ],
            ],
          ),
        ),
        if (review.stage != ReviewStage.unavailable)
          OnboardingCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Apelaciones utilizadas',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 10),
                Text(
                  '${review.appealsUsed} de 2',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Una sola apelación pendiente a la vez. Cada solicitud de revisión necesita un motivo.',
                  style: TextStyle(color: KoraColors.muted),
                ),
              ],
            ),
          ),
        if (review.stage == ReviewStage.rejected && review.appealsUsed == 2)
          OnboardingCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Podrás volver a solicitarlo',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 10),
                Text(
                  review.nextApplicationAt == null
                      ? 'La fecha se confirmará con el servicio.'
                      : 'A partir del ${_date(review.nextApplicationAt!)}',
                ),
                const SizedBox(height: 8),
                const Text(
                  'Espera de 30 días desde el rechazo definitivo. Tu cuenta de pasajera se conserva.',
                  style: TextStyle(color: KoraColors.muted),
                ),
              ],
            ),
          ),
        if (review.allowsAppeal)
          FilledButton(
            key: const Key('status-appeal'),
            onPressed: () => context.push('/profile/driver/appeal'),
            child: Text('Presentar apelación ${review.appealsUsed + 1} de 2'),
          ),
        if (review.canSubmitNewApplication &&
            review.stage == ReviewStage.rejected &&
            review.appealsUsed == 2)
          FilledButton(
            onPressed: () => context.push('/profile/driver/request'),
            child: const Text('Preparar nueva solicitud'),
          ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => context.push('/profile/driver/appeal'),
          child: const Text('Consultar apelaciones'),
        ),
        const SizedBox(height: 18),
        const OnboardingNotice(
          text: 'El estado, los intentos y la fecha de nueva solicitud deben ser confirmados por el servicio. Cambiar la fecha del teléfono no habilita una solicitud.',
        ),
      ],
    );
  }
}

String _date(DateTime instant) {
  // Colombia is UTC−5, without daylight saving. Server timestamps are UTC.
  final date = instant.toUtc().subtract(const Duration(hours: 5));
  return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} '
      'a las ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')} (Colombia)';
}

class DriverAppealPage extends ConsumerStatefulWidget {
  const DriverAppealPage({super.key});
  @override
  ConsumerState<DriverAppealPage> createState() => _DriverAppealPageState();
}

class _DriverAppealPageState extends ConsumerState<DriverAppealPage> {
  final _reason = TextEditingController();
  bool _attempted = false;
  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final review = ref.watch(driverReviewProvider);
    final eligible = review.allowsAppeal;
    return OnboardingLayout(
      eyebrow: 'Tu voz cuenta',
      title: 'Solicita una\nnueva revisión.',
      description: 'Explica qué consideras incorrecto en la decisión. Administración revisará tu motivo y dará una respuesta.',
      children: [
        OnboardingCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                review.stage == ReviewStage.unavailable
                    ? 'Estado por consultar'
                    : '${review.appealsUsed} de 2 oportunidades utilizadas',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 10),
              Text(
                eligible
                    ? 'Puedes presentar la apelación ${review.appealsUsed + 1} de 2.'
                    : review.stage == ReviewStage.appealPending
                    ? 'Ya hay una apelación pendiente. Espera su resolución.'
                    : review.appealsUsed == 2
                    ? 'Has utilizado las dos oportunidades. Consulta cuándo puedes iniciar una nueva solicitud.'
                    : 'Necesitas una solicitud rechazada y disponibilidad confirmada para apelar.',
                style: const TextStyle(color: KoraColors.muted),
              ),
              if (review.reason case final reason?) ...[
                const SizedBox(height: 18),
                const Text(
                  'Motivo de la decisión',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(reason),
              ],
            ],
          ),
        ),
        TextField(
          key: const Key('appeal-reason'),
          controller: _reason,
          enabled: eligible,
          minLines: 5,
          maxLines: 10,
          decoration:
              onboardingInput(
                'Motivo de tu apelación',
                hint: 'Describe qué debe revisarse',
              ).copyWith(
                errorText: _attempted && _reason.text.trim().isEmpty
                    ? 'Escribe el motivo de tu apelación'
                    : null,
              ),
        ),
        const SizedBox(height: 20),
        const OnboardingNotice(
          text: 'Tu motivo es obligatorio. Los reintentos de conexión no consumirán oportunidades adicionales. La respuesta de administración también incluirá un motivo.',
        ),
        FilledButton(
          key: const Key('appeal-submit'),
          onPressed: eligible
              ? () {
                  setState(() => _attempted = true);
                  if (_reason.text.trim().isEmpty) return;
                  showConnectionNotice(
                    context,
                    ref.read(onboardingControllerProvider).connectionNotice,
                  );
                }
              : null,
          child: const Text('Enviar apelación'),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => context.push('/profile/driver/status'),
          child: const Text('Ver estado de mi solicitud'),
        ),
      ],
    );
  }
}
