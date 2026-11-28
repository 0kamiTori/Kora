import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date

import phonenumbers
from email_validator import EmailNotValidError, validate_email

from kora_api.registration_errors import RegistrationError

LETTERS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ"
NAME = re.compile(r"[" + LETTERS + r"0-9 ]+")
PASSWORD = re.compile(
    r"^(?=[\s\S]*[A-ZÁÉÍÓÚÜÑ])(?=[\s\S]*[a-záéíóúüñ])(?=[\s\S]*[0-9])(?=[\s\S]*[^"
    + LETTERS
    + r"0-9\s])[\s\S]{12,}$"
)


@dataclass(repr=False, frozen=True)
class RegistrationInput:
    email: str
    password: str = field(repr=False)
    display_name: str
    birth_date: date
    phone_e164: str
    requested_role: str
    consent_version: str

    def canonical(self):
        return {
            "email": self.email,
            "password": self.password,
            "display_name": self.display_name,
            "birth_date": self.birth_date.isoformat(),
            "phone": self.phone_e164,
            "requested_role": self.requested_role,
            "consent_version": self.consent_version,
            "consent_accepted": True,
        }


def validate_registration(body: object, today: date) -> RegistrationInput:
    if not isinstance(body, dict):
        raise RegistrationError("REQUEST_INVALID")
    required = {
        "email",
        "password",
        "display_name",
        "birth_date",
        "phone",
        "requested_role",
        "consent",
    }
    missing = [
        (key, "REQUIRED_FIELDS_MISSING")
        for key in sorted(required - {"consent"})
        if key not in body
        or body[key] is None
        or body[key] == ""
        or (isinstance(body[key], str) and not body[key].strip())
    ]
    phone, consent = body.get("phone"), body.get("consent")
    if isinstance(phone, dict):
        missing.extend(
            ("phone." + key, "REQUIRED_FIELDS_MISSING")
            for key in ("country_calling_code", "national_number")
            if not phone.get(key)
            or (isinstance(phone[key], str) and not phone[key].strip())
        )
    consent_missing = (
        not isinstance(consent, dict) or consent.get("accepted") is not True
    )
    if isinstance(consent, dict) and not consent.get("version"):
        missing.append(("consent.version", "REQUIRED_FIELDS_MISSING"))
    if consent_missing:
        if missing:
            missing.append(("consent", "CONSENT_REQUIRED"))
        else:
            raise RegistrationError(
                "CONSENT_REQUIRED", [("consent", "CONSENT_REQUIRED")]
            )
    if missing:
        raise RegistrationError("REQUIRED_FIELDS_MISSING", missing)
    errors = []

    def invalid(field, code):
        errors.append((field, code))

    if set(body) - required:
        invalid("request", "VALIDATION_ERROR")
    email = body["email"]
    try:
        if not isinstance(email, str):
            raise ValueError
        email = email.strip().lower()
        if len(email) > 254:
            raise ValueError
        # .invalid is a reserved synthetic domain, accepted only by the isolated
        # test-only flow. Validate its syntax using the library's .test support.
        candidate = email[:-8] + ".test" if email.endswith(".invalid") else email
        validate_email(
            candidate,
            check_deliverability=False,
            test_environment=True,
            allow_smtputf8=False,
        )
        if not email.endswith(".invalid"):
            invalid("email", "VALIDATION_ERROR")
    except (ValueError, EmailNotValidError):
        invalid("email", "CONTACT_INVALID")
    password = body["password"]
    if not isinstance(password, str) or not PASSWORD.fullmatch(password):
        invalid("password", "PASSWORD_INVALID")
    name = body["display_name"]
    if isinstance(name, str):
        name = unicodedata.normalize("NFC", name).strip()
    if (
        not isinstance(name, str)
        or not 1 <= len(name) <= 100
        or not NAME.fullmatch(name)
    ):
        invalid("display_name", "DISPLAY_NAME_INVALID")
    birth = body["birth_date"]
    try:
        if not isinstance(birth, str) or not re.fullmatch(
            r"[0-9]{4}-[0-9]{2}-[0-9]{2}", birth
        ):
            raise ValueError
        birth = date.fromisoformat(birth)
        if birth > today:
            raise ValueError
        if (
            today.year
            - birth.year
            - ((today.month, today.day) < (birth.month, birth.day))
            < 18
        ):
            invalid("birth_date", "AGE_RESTRICTED")
    except ValueError:
        invalid("birth_date", "BIRTH_DATE_INVALID")
    normalized_phone = ""
    try:
        if not isinstance(phone, dict) or set(phone) != {
            "country_calling_code",
            "national_number",
        }:
            raise ValueError
        code, national = phone["country_calling_code"], phone["national_number"]
        if (
            not isinstance(code, str)
            or not re.fullmatch(r"\+[1-9][0-9]{0,2}", code)
            or not isinstance(national, str)
            or not 1 <= len(national) <= 32
            or not re.fullmatch(r"[0-9 ()-]+", national)
        ):
            raise ValueError
        parsed = phonenumbers.parse(code + national, None)
        if str(parsed.country_code) != code[1:] or not phonenumbers.is_valid_number(
            parsed
        ):
            raise ValueError
        normalized_phone = phonenumbers.format_number(
            parsed, phonenumbers.PhoneNumberFormat.E164
        )
    except (ValueError, phonenumbers.NumberParseException):
        invalid("phone", "CONTACT_INVALID")
    if body["requested_role"] not in ("passenger", "driver"):
        invalid("requested_role", "VALIDATION_ERROR")
    if (
        set(consent) != {"accepted", "version"}
        or not isinstance(consent["version"], str)
        or not 1 <= len(consent["version"]) <= 100
    ):
        invalid("consent", "VALIDATION_ERROR")
    if errors:
        raise RegistrationError(errors[0][1], errors)
    return RegistrationInput(
        email,
        password,
        name,
        birth,
        normalized_phone,
        body["requested_role"],
        consent["version"],
    )
