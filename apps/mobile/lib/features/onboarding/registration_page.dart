import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/premium_theme.dart';
import 'onboarding_controller.dart';
import 'onboarding_models.dart';
import 'onboarding_widgets.dart';
import 'registration_controller.dart';
import 'registration_models.dart';

class RegistrationPage extends ConsumerStatefulWidget {
  const RegistrationPage({super.key});
  @override
  ConsumerState<RegistrationPage> createState() => _RegistrationPageState();
}

class _RegistrationPageState extends ConsumerState<RegistrationPage> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _name = TextEditingController();
  final _password = TextEditingController();
  final _birth = TextEditingController();
  final _phone = TextEditingController();
  final _code = TextEditingController(text: '+57');
  bool _consent = false;
  bool _obscure = true;
  bool _driver = false;
  bool _attempted = false;
  String? _summary;

  @override
  void dispose() {
    for (final controller in [
      _email,
      _name,
      _password,
      _birth,
      _phone,
      _code,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _check() async {
    final controller = ref.read(registrationControllerProvider.notifier);
    if (ref.read(registrationControllerProvider).pending) {
      await controller.retry();
      return;
    }
    final valid = _form.currentState!.validate();
    final missing = [
      _email,
      _name,
      _password,
      _birth,
      _phone,
      _code,
    ].any((c) => c.text.trim().isEmpty);
    setState(() {
      _attempted = true;
      _summary = missing ? RegistrationMessages.missing : null;
    });
    if (!valid || !_consent) return;
    final policy = ref.read(registrationControllerProvider).policy;
    if (policy?.enabled != true || policy?.version == null) return;
    final birth = parseBirthDate(_birth.text)!;
    await controller.submit(
      RegistrationRequest(
        email: _email.text,
        password: _password.text,
        name: _name.text,
        birthDate: birth.toIso8601String().substring(0, 10),
        code: _code.text,
        phone: _phone.text,
        driver: _driver,
        consentVersion: policy!.version!,
      ),
    );
  }

  Widget _field(
    String key,
    String label,
    TextEditingController controller, {
    TextInputType? keyboard,
    String? hint,
    String? Function(String)? check,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: TextFormField(
      key: Key(key),
      controller: controller,
      enabled:
          !ref.read(registrationControllerProvider).submitting &&
          !ref.read(registrationControllerProvider).pending,
      onChanged: (_) =>
          ref.read(registrationControllerProvider.notifier).clearFailure(),
      keyboardType: keyboard,
      textInputAction: TextInputAction.next,
      decoration: onboardingInput(label, hint: hint),
      validator: (value) => value == null || value.trim().isEmpty
          ? RegistrationMessages.missing
          : check?.call(value),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final registration = ref.watch(registrationControllerProvider);
    final busy = registration.submitting || registration.pending;
    ref.listen(registrationControllerProvider, (previous, next) {
      if (previous?.consentRevision != next.consentRevision && mounted) {
        setState(() => _consent = false);
      }
      if (next.created != null) _password.clear();
    });
    return OnboardingLayout(
      eyebrow: 'Tu primer paso',
      title: 'Tu camino\nempieza aquí.',
      description: 'Una cuenta para viajar. Y, si lo eliges, para solicitar tu habilitación como conductora.',
      children: [
        OnboardingNotice(
          text: ref.watch(apiConfigProvider).synthetic
              ? 'Entorno de pruebas · Utiliza exclusivamente datos ficticios y correo terminado en .invalid.'
              : 'Primera entrega · Colombia · Automóviles. El registro con datos reales permanece cerrado.',
        ),
        if (registration.created != null)
          OnboardingCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cuenta creada',
                  key: const Key('registration-success'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                const Text(
                  'El servicio confirmó tu registro. No has iniciado sesión y tu cuenta no tiene habilitación para conducir.',
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => context.go('/profile'),
                  child: const Text('Volver a mi perfil'),
                ),
              ],
            ),
          )
        else ...[
          if (registration.loading) const LinearProgressIndicator(),
          if (!registration.loading &&
              registration.policy?.enabled != true &&
              !registration.pending)
            OnboardingNotice(
              text:
                  registration.failure?.message ??
                  'El registro no está habilitado en este momento.',
            ),
          if (!registration.loading && !registration.pending)
            TextButton(
              key: const Key('registration-reload'),
              onPressed: registration.submitting
                  ? null
                  : () => ref
                        .read(registrationControllerProvider.notifier)
                        .loadPolicy(),
              child: const Text('Actualizar disponibilidad'),
            ),
          Form(
            key: _form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '¿Cómo quieres comenzar?',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Como pasajera'),
                      selected: !_driver,
                      onSelected: busy
                          ? null
                          : (_) => setState(() => _driver = false),
                    ),
                    ChoiceChip(
                      label: const Text('Quiero conducir'),
                      selected: _driver,
                      onSelected: busy
                          ? null
                          : (_) => setState(() => _driver = true),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  _driver
                      ? 'Crear tu cuenta no aprueba tu perfil de conductora. Después podrás solicitar revisión.'
                      : 'Más adelante podrás solicitar ser conductora con esta misma cuenta.',
                  style: const TextStyle(color: KoraColors.muted, fontSize: 12),
                ),
                const SizedBox(height: 26),
                _field(
                  'register-name',
                  'Nombre de usuario',
                  _name,
                  hint: 'Puede coincidir con el de otras personas',
                  check: (v) =>
                      validDisplayName(v) ? null : RegistrationMessages.name,
                ),
                _field(
                  'register-email',
                  'Correo electrónico',
                  _email,
                  keyboard: TextInputType.emailAddress,
                  check: (v) =>
                      RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())
                      ? null
                      : RegistrationMessages.invalidContact,
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 18),
                  child: TextFormField(
                    key: const Key('register-password'),
                    controller: _password,
                    enabled: !busy,
                    onChanged: (_) => ref
                        .read(registrationControllerProvider.notifier)
                        .clearFailure(),
                    obscureText: _obscure,
                    enableSuggestions: false,
                    autocorrect: false,
                    decoration: onboardingInput('Contraseña').copyWith(
                      helperText: '12 caracteres o más · Mayúscula, minúscula, número y símbolo',
                      suffixIcon: IconButton(
                        tooltip: _obscure
                            ? 'Mostrar contraseña'
                            : 'Ocultar contraseña',
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                    validator: (v) => v == null || v.isEmpty
                        ? RegistrationMessages.missing
                        : validPassword(v)
                        ? null
                        : RegistrationMessages.password,
                  ),
                ),
                _field(
                  'register-birth',
                  'Fecha de nacimiento',
                  _birth,
                  hint: 'DD/MM/AAAA',
                  keyboard: TextInputType.datetime,
                  check: (v) => birthDateError(
                    v,
                    registration.policy?.serverDate ??
                        ref.read(registrationDateProvider),
                  ),
                ),
                _field(
                  'register-code',
                  'Código de país',
                  _code,
                  hint: '+57',
                  keyboard: TextInputType.phone,
                  check: (v) => RegExp(r'^\+?[1-9]\d{0,2}$').hasMatch(v.trim())
                      ? null
                      : RegistrationMessages.invalidContact,
                ),
                _field(
                  'register-phone',
                  'Número de celular',
                  _phone,
                  keyboard: TextInputType.phone,
                  check: (v) => normalizePhone(_code.text, v) == null
                      ? RegistrationMessages.invalidContact
                      : null,
                ),
                const OnboardingNotice(
                  text: 'El código de país forma parte del número. El servicio comprueba la disponibilidad del correo y celular al crear la cuenta.',
                ),
                if (registration.policy?.text != null)
                  OnboardingCard(
                    child: SelectableText(
                      registration.policy!.text!,
                      key: const Key('registration-consent-text'),
                    ),
                  ),
                CheckboxListTile(
                  key: const Key('register-consent'),
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _consent,
                  onChanged: busy || registration.policy?.enabled != true
                      ? null
                      : (value) => setState(() => _consent = value ?? false),
                  title: const Text(
                    'Confirmo mi consentimiento para crear la cuenta',
                  ),
                  subtitle: Text(
                    registration.policy?.enabled == true
                        ? 'Acepto el texto mostrado arriba. Esto no autoriza captura biométrica.'
                        : 'Se necesita un consentimiento vigente del servicio para habilitar el registro.',
                  ),
                ),
                if (_attempted && !_consent)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        RegistrationMessages.consent,
                        style: const TextStyle(color: KoraColors.danger),
                      ),
                    ),
                  ),
                if (_summary != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        _summary!,
                        style: const TextStyle(color: KoraColors.danger),
                      ),
                    ),
                  ),
                if (registration.failure != null &&
                    registration.policy?.enabled == true)
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      registration.failure!.message,
                      style: const TextStyle(color: KoraColors.danger),
                    ),
                  ),
                for (final error
                    in registration.failure?.fields.entries ??
                        <MapEntry<String, String>>[])
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '${_fieldLabel(error.key)}: ${error.value}',
                      style: const TextStyle(color: KoraColors.danger),
                    ),
                  ),
                if (registration.pending)
                  const OnboardingNotice(
                    text: 'Aún no se ha confirmado el resultado. Reintenta este mismo envío sin modificar los datos. Si sales de esta pantalla, se pierde el envío guardado en memoria; eso no significa que la cuenta no se haya creado.',
                  ),
                if (registration.retryAt != null)
                  const OnboardingNotice(
                    text: 'Espera el tiempo indicado por el servicio antes de reintentar.',
                  ),
                const SizedBox(height: 24),
                FilledButton(
                  key: const Key('register-submit'),
                  onPressed:
                      registration.submitting ||
                          registration.loading ||
                          (registration.pending &&
                              registration.failure?.retryable != true)
                      ? null
                      : _check,
                  child: Text(
                    registration.submitting
                        ? 'Confirmando registro…'
                        : registration.pending
                        ? 'Reintentar el mismo envío'
                        : registration.policy?.enabled == true
                        ? 'Crear cuenta de prueba'
                        : 'Revisar mis datos',
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => context.push('/profile/driver/request'),
                  child: const Text('Conocer la solicitud de conductora'),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  String _fieldLabel(String field) => switch (field) {
    'email' => 'Correo',
    'password' => 'Contraseña',
    'display_name' => 'Nombre',
    'birth_date' => 'Fecha de nacimiento',
    'phone' || 'phone.national_number' => 'Celular',
    'phone.country_calling_code' => 'Código de país',
    'consent' || 'consent.accepted' || 'consent.version' => 'Consentimiento',
    'requested_role' => 'Perfil',
    _ => 'Solicitud',
  };
}
