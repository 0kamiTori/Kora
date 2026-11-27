-- =============================================================================
-- 002_sesiones.sql  -  Sesiones de renovación (token de refresco)
--
-- La usa el backend para POST /auth/refresh y /auth/logout, tanto del portal
-- (cookie httpOnly) como de la app móvil (token en almacenamiento seguro).
-- Solo se guarda el hash SHA-256 del token, nunca el token.
-- =============================================================================

BEGIN;

CREATE TABLE auth_sessions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_kind  text NOT NULL,              -- 'admin' (portal) o 'account' (app móvil)
    admin_user_id uuid REFERENCES admin_users (id) ON DELETE CASCADE,
    account_id    uuid REFERENCES accounts (id) ON DELETE CASCADE,
    token_hash    text NOT NULL UNIQUE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    expires_at    timestamptz NOT NULL,
    revoked_at    timestamptz,
    CONSTRAINT auth_sessions_kind_known CHECK (subject_kind IN ('admin', 'account')),
    CONSTRAINT auth_sessions_subject_matches CHECK (
        (subject_kind = 'admin' AND admin_user_id IS NOT NULL AND account_id IS NULL)
        OR (subject_kind = 'account' AND account_id IS NOT NULL AND admin_user_id IS NULL)
    )
);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions (expires_at);

COMMIT;
