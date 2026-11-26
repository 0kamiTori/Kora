import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'onboarding_models.dart';

/// No fake account or administrative decision is stored on the phone.
/// Replace this boundary with an authenticated repository after contract review.
final driverReviewProvider = Provider<DriverReview>(
  (ref) => const DriverReview(stage: ReviewStage.unavailable),
);

final registrationDateProvider = Provider<DateTime>((ref) => DateTime.now());

final onboardingControllerProvider = Provider<OnboardingController>(
  (ref) => const OnboardingController(),
);

class OnboardingController {
  const OnboardingController();
  String get connectionNotice =>
      'El registro y las solicitudes aún no están conectados. '
      'No se ha guardado ni enviado información.';
}
