import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/premium_theme.dart';
import 'onboarding_controller.dart';
import 'onboarding_models.dart';
import 'onboarding_widgets.dart';

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

  void _check() {
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
    showConnectionNotice(
      context,
      ref.read(onboardingControllerProvider).connectionNotice,
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
      keyboardType: keyboard,
      textInputAction: TextInputAction.next,
      decoration: onboardingInput(label, hint: hint),
      validator: (value) => value == null || value.trim().isEmpty
          ? RegistrationMessages.missing
          : check?.call(value),
    ),
  );

  @override
  Widget build(BuildContext context) => OnboardingLayout(
    eyebrow: 'Tu primer paso',
    title: 'Tu camino\nempieza aquí.',
    description: 'Una cuenta para viajar. Y, si lo eliges, para solicitar tu habilitación como conductora.',
    children: [
      const OnboardingNotice(
        text: 'Primera entrega · Colombia · Automóviles. Formulario en preparación: aún no crea cuentas.',
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
                  onSelected: (_) => setState(() => _driver = false),
                ),
                ChoiceChip(
                  label: const Text('Quiero conducir'),
                  selected: _driver,
                  onSelected: (_) => setState(() => _driver = true),
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
              check: (v) =>
                  birthDateError(v, ref.read(registrationDateProvider)),
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
              text: 'El código de país forma parte del número. La disponibilidad del correo y celular se comprobará al conectar el servicio.',
            ),
            CheckboxListTile(
              key: const Key('register-consent'),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _consent,
              onChanged: (value) => setState(() => _consent = value ?? false),
              title: const Text(
                'Confirmo mi consentimiento para crear la cuenta',
              ),
              subtitle: const Text(
                'El texto completo de consentimiento se incorporará antes de habilitar el registro.',
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
            const SizedBox(height: 24),
            FilledButton(
              key: const Key('register-submit'),
              onPressed: _check,
              child: const Text('Revisar mis datos'),
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
  );
}
