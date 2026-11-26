/// Server-owned review state. The UI cannot approve a driver or increment appeals.
enum ReviewStage {
  unavailable,
  draft,
  pending,
  corrections,
  rejected,
  appealPending,
  approved,
}

class DriverReview {
  const DriverReview({
    required this.stage,
    this.appealsUsed = 0,
    this.reason,
    this.nextApplicationAt,
    this.canSubmitNewApplication = false,
    this.canAppeal = false,
  }) : assert(appealsUsed >= 0 && appealsUsed <= 2);

  final ReviewStage stage;
  final int appealsUsed;
  final String? reason;

  /// Supplied by the backend after final rejection; never inferred from device time.
  final DateTime? nextApplicationAt;
  final bool canSubmitNewApplication;
  final bool canAppeal;

  bool get allowsAppeal =>
      stage == ReviewStage.rejected && appealsUsed < 2 && canAppeal;

  String get title => switch (stage) {
    ReviewStage.unavailable => 'Tu solicitud, en un solo lugar',
    ReviewStage.draft => 'Lista para comenzar',
    ReviewStage.pending => 'Estamos revisando tu solicitud',
    ReviewStage.corrections => 'Hay detalles por corregir',
    ReviewStage.rejected =>
      appealsUsed == 2 ? 'Revisión finalizada' : 'Tu solicitud fue rechazada',
    ReviewStage.appealPending => 'Tu apelación está en revisión',
    ReviewStage.approved => 'Aprobación administrativa',
  };
}

abstract final class RegistrationMessages {
  static const missing = '!OJO! faltan datos obligatorios';
  static const consent =
      '!OJO! Confirma tu consentimiento para crear la cuenta';
  static const invalidContact = 'Este correo o número es inválido, prueba otro';
  static const duplicate = 'Este correo o número no está disponible';
  static const password =
      'La contraseña debe tener mínimo 12 caracteres e incluir una mayúscula, una minúscula, un número y un carácter especial';
  static const date = 'Ingresa una fecha de nacimiento válida';
  static const age = 'Debes tener al menos 18 años para crear una cuenta';
  static const internal =
      'Hubo un error para registrate, intentalo nuevamente más tarde';
  // UI wording; final editorial approval of this additional message remains pending.
  static const name = 'Usa hasta 100 caracteres: letras, números y espacios';
}

DateTime? parseBirthDate(String value) {
  final match = RegExp(r'^(\d{2})/(\d{2})/(\d{4})$').firstMatch(value.trim());
  if (match == null) return null;
  final day = int.parse(match[1]!);
  final month = int.parse(match[2]!);
  final year = int.parse(match[3]!);
  final date = DateTime.utc(year, month, day);
  return date.year == year && date.month == month && date.day == day
      ? date
      : null;
}

String? birthDateError(String value, DateTime today) {
  final date = parseBirthDate(value);
  final reference = DateTime.utc(today.year, today.month, today.day);
  if (date == null || date.isAfter(reference)) return RegistrationMessages.date;
  final age =
      today.year -
      date.year -
      ((today.month < date.month ||
              (today.month == date.month && today.day < date.day))
          ? 1
          : 0);
  return age < 18 ? RegistrationMessages.age : null;
}

bool validPassword(String value) =>
    value.runes.length >= 12 &&
    RegExp(r'[A-ZÁÉÍÓÚÜÑ]').hasMatch(value) &&
    RegExp(r'[a-záéíóúüñ]').hasMatch(value) &&
    RegExp(r'[0-9]').hasMatch(value) &&
    RegExp(r'[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ0-9\s]').hasMatch(value);

bool validDisplayName(String value) =>
    value.trim().isNotEmpty &&
    value.runes.length <= 100 &&
    RegExp(r'^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ0-9 ]+$').hasMatch(value);

/// Presentation normalization only. Full numbering-plan validity is a server check.
String? normalizePhone(String code, String national) {
  if (!RegExp(r'^\+?[1-9]\d{0,2}$').hasMatch(code.trim()) ||
      !RegExp(r'^[0-9 ()-]+$').hasMatch(national)) {
    return null;
  }
  final digits = national.replaceAll(RegExp(r'[ ()-]'), '');
  final prefix = code.trim().replaceFirst('+', '');
  if (digits.length < 6 || prefix.length + digits.length > 15) return null;
  if (prefix == '57' && !RegExp(r'^3\d{9}$').hasMatch(digits)) return null;
  return '+$prefix$digits';
}
