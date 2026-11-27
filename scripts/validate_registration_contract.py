"""Check the v2 registration design and schema fixtures, never a running service."""
from pathlib import Path
import hashlib
import json
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]


def validate():
    folder = ROOT / "Documentación/Contratos"
    contract = json.loads((folder / "registration-v2.openapi.json").read_text(encoding="utf-8"))
    fixtures = json.loads((folder / "examples/registration-v2-cases.json").read_text(encoding="utf-8"))
    assert contract["openapi"] == "3.1.1"
    assert contract["x-implementation-status"] == "contract-only-not-deployed"
    assert hashlib.sha256((folder / "openapi.json").read_bytes().replace(b"\r\n", b"\n")).hexdigest() == contract["x-legacy-contract"]["sha256"], "Legacy v1 changed without updating migration evidence"
    assert contract["servers"][0]["url"].endswith("/api/v2")
    schemas = contract["components"]["schemas"]
    for schema in schemas.values():
        Draft202012Validator.check_schema(schema)

    def check_refs(value):
        if isinstance(value, dict):
            if "$ref" in value:
                reference = value["$ref"]
                assert reference.startswith("#/"), "Only internal references are expected"
                node = contract
                for part in reference[2:].split("/"):
                    node = node[part.replace("~1", "/").replace("~0", "~")]
            for item in value.values():
                check_refs(item)
        elif isinstance(value, list):
            for item in value:
                check_refs(item)
    check_refs(contract)

    operation = contract["paths"]["/accounts"]["post"]
    assert operation["security"] == [], "Registration must not require a prior session"
    assert operation["requestBody"]["required"]
    assert any(p["name"] == "Idempotency-Key" and p["required"] for p in operation["parameters"])
    assert operation["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith("/AccountRegistrationV2")
    assert schemas["AccountRegistrationV2"]["additionalProperties"] is False
    assert schemas["AccountCreatedV2"]["properties"]["roles"]["const"] == ["passenger"]
    assert schemas["AccountCreatedV2"]["properties"]["driver_approved"]["const"] is False
    assert schemas["AccountConsent"]["properties"]["accepted"]["const"] is True
    assert "password" not in schemas["AccountCreatedV2"]["properties"]

    validators = {}
    for name in schemas:
        wrapper = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$ref": "#/components/schemas/" + name, "components": contract["components"]}
        validators[name] = Draft202012Validator(wrapper, format_checker=FormatChecker())
    checked = 0
    for fixture in fixtures["cases"]:
        actual_errors = list(validators[fixture["schema"]].iter_errors(fixture["instance"]))
        assert (not actual_errors) == fixture["valid"], f"Schema fixture failed: {fixture['name']}"
        if "http_status" in fixture:
            error = fixture["instance"]
            entry = contract["x-error-codes"][error["code"]]
            assert entry["http_status"] == fixture["http_status"]
            assert entry["message"] == error["message"]
            assert entry["retryable"] == error["retryable"]
            assert ("incident_id" in error) == entry["admin_incident_required"]
            response_schema = operation["responses"][str(fixture["http_status"])]["content"]["application/json"]["schema"]
            wrapped = {"components": contract["components"], **response_schema}
            Draft202012Validator(wrapped, format_checker=FormatChecker()).validate(error)
        checked += 1
    for code in ["DATABASE_UNAVAILABLE", "INTERNAL_ERROR"]:
        assert contract["x-error-codes"][code]["admin_incident_required"]
    assert len(contract["paths"]) == 2
    print(f"OK: v2 registration design, internal references and {checked} schema fixtures.")
    print("Does not execute registration, age checks, database uniqueness, idempotency, incidents or a deployed API.")


if __name__ == "__main__":
    validate()
