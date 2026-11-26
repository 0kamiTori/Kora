import 'package:material_ui/material_ui.dart';

import '../../core/theme/premium_theme.dart';

class OnboardingLayout extends StatelessWidget {
  const OnboardingLayout({
    super.key,
    required this.title,
    required this.eyebrow,
    required this.description,
    required this.children,
  });
  final String title;
  final String eyebrow;
  final String description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Köra')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        children: [
          Text(
            eyebrow.toUpperCase(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 14),
          Text(title, style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 12),
          Text(description, style: const TextStyle(color: KoraColors.muted)),
          const SizedBox(height: 26),
          ...children,
        ],
      ),
    ),
  );
}

class OnboardingCard extends StatelessWidget {
  const OnboardingCard({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(bottom: 16),
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: KoraColors.surface,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: KoraColors.border),
    ),
    child: child,
  );
}

class OnboardingNotice extends StatelessWidget {
  const OnboardingNotice({super.key, required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: Text(
      text,
      style: const TextStyle(color: KoraColors.muted, fontSize: 12),
    ),
  );
}

InputDecoration onboardingInput(String label, {String? hint}) =>
    InputDecoration(
      labelText: label,
      hintText: hint,
      filled: true,
      fillColor: KoraColors.surface,
      errorMaxLines: 5,
      helperMaxLines: 3,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: KoraColors.border),
      ),
    );

Future<void> showConnectionNotice(BuildContext context, String text) =>
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Conexión pendiente'),
        content: Text(text),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
