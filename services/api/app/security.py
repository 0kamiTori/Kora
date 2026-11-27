"""Contraseñas, tokens y dependencias de autenticación/autorización."""
import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends, Request

from .config import settings
from .db import many, one, tx
from .errors import ApiError

_ALGORITHM = "HS256"
_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 2**14, 8, 1


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Contraseñas (scrypt de la biblioteca estándar) ----------


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=32
    )
    encode = lambda raw: base64.b64encode(raw).decode("ascii")  # noqa: E731
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${encode(salt)}${encode(digest)}"


def verify_password(password: str, stored: str | None) -> bool:
    try:
        scheme, n, r, p, salt, digest = (stored or "").split("$")
        if scheme != "scrypt":
            return False
        expected = base64.b64decode(digest)
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=base64.b64decode(salt),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


# ---------- Tokens ----------


def _encode(claims: dict[str, Any], lifetime: timedelta) -> str:
    payload = {**claims, "exp": now_utc() + lifetime, "iat": now_utc()}
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def _decode(token: str, expected_type: str) -> dict[str, Any] | None:
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        return None
    return claims if claims.get("typ") == expected_type else None


def access_token_seconds() -> int:
    return settings.access_token_minutes * 60


def create_access_token(kind: str, subject_id: Any) -> str:
    """kind: 'admin' (portal) o 'account' (app móvil)."""
    return _encode(
        {"typ": "access", "kind": kind, "sub": str(subject_id)},
        timedelta(minutes=settings.access_token_minutes),
    )


def create_file_token(path: str, minutes: int = 5) -> str:
    """Token de vida corta para descargar un archivo sensible (URL firmada)."""
    return _encode({"typ": "file", "path": path}, timedelta(minutes=minutes))


def read_file_token(token: str) -> str | None:
    claims = _decode(token, "file")
    return claims.get("path") if claims else None


# ---------- Sesiones de renovación ----------


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def create_session(cur, kind: str, subject_id: Any) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(48)
    lifetime = (
        timedelta(hours=settings.admin_session_hours)
        if kind == "admin"
        else timedelta(days=settings.mobile_session_days)
    )
    expires_at = now_utc() + lifetime
    column = "admin_user_id" if kind == "admin" else "account_id"
    cur.execute(
        f"INSERT INTO auth_sessions (subject_kind, {column}, token_hash, expires_at) "
        "VALUES (%s, %s, %s, %s)",
        (kind, subject_id, _hash_token(token), expires_at),
    )
    return token, expires_at


def find_session(cur, kind: str, token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    return one(
        cur,
        "SELECT * FROM auth_sessions WHERE token_hash = %s AND subject_kind = %s "
        "AND revoked_at IS NULL AND expires_at > now()",
        (_hash_token(token), kind),
    )


def revoke_session(cur, token: str | None) -> None:
    if token:
        cur.execute(
            "UPDATE auth_sessions SET revoked_at = now() "
            "WHERE token_hash = %s AND revoked_at IS NULL",
            (_hash_token(token),),
        )


# ---------- Identidades ----------


@dataclass
class AdminIdentity:
    id: Any
    full_name: str
    email: str
    role: str
    permissions: list[str]

    @property
    def actor(self) -> dict[str, str]:
        return {"id": str(self.id), "name": self.full_name}

    def to_json(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "fullName": self.full_name,
            "email": self.email,
            "role": self.role,
            "permissions": self.permissions,
        }


@dataclass
class AccountIdentity:
    id: Any
    role: str
    display_name: str

    def to_json(self) -> dict[str, Any]:
        return {"id": str(self.id), "role": self.role, "displayName": self.display_name}


def load_admin(cur, admin_id: Any) -> AdminIdentity | None:
    row = one(
        cur,
        "SELECT id, full_name, email, role::text AS role FROM admin_users "
        "WHERE id = %s AND is_active",
        (admin_id,),
    )
    if not row:
        return None
    permissions = [
        item["permission"]
        for item in many(
            cur,
            "SELECT permission FROM role_permissions WHERE role = %s::admin_role ORDER BY 1",
            (row["role"],),
        )
    ]
    return AdminIdentity(row["id"], row["full_name"], row["email"], row["role"], permissions)


def load_account(cur, account_id: Any) -> AccountIdentity | None:
    row = one(
        cur,
        "SELECT id, role::text AS role, display_name FROM accounts WHERE id = %s",
        (account_id,),
    )
    return AccountIdentity(row["id"], row["role"], row["display_name"]) if row else None


def _bearer(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    return token.strip() if scheme.lower() == "bearer" and token.strip() else None


def admin_from_token(token: str | None) -> AdminIdentity | None:
    claims = _decode(token, "access") if token else None
    if not claims or claims.get("kind") != "admin":
        return None
    with tx() as cur:
        return load_admin(cur, claims["sub"])


_UNAUTHORIZED = ApiError(401, "unauthorized", "Tu sesión expiró. Inicia sesión de nuevo.")
_FORBIDDEN = ApiError(403, "forbidden", "No tienes permiso para realizar esta acción.")


def current_admin(request: Request) -> AdminIdentity:
    """Sesión válida del portal de administración."""
    admin = admin_from_token(_bearer(request))
    if not admin:
        raise _UNAUTHORIZED
    return admin


def require_permission(permission: str):
    """RNF01: el permiso se comprueba en el servidor en cada petición."""

    def dependency(admin: AdminIdentity = Depends(current_admin)) -> AdminIdentity:
        if permission not in admin.permissions:
            raise _FORBIDDEN
        return admin

    return dependency


def current_account(request: Request) -> AccountIdentity:
    """Sesión válida de la app móvil (pasajera o conductora)."""
    token = _bearer(request)
    claims = _decode(token, "access") if token else None
    if not claims or claims.get("kind") != "account":
        raise _UNAUTHORIZED
    with tx() as cur:
        account = load_account(cur, claims["sub"])
    if not account:
        raise _UNAUTHORIZED
    return account


def require_role(role: str):
    def dependency(account: AccountIdentity = Depends(current_account)) -> AccountIdentity:
        if account.role != role:
            raise _FORBIDDEN
        return account

    return dependency
