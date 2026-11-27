-- =============================================================================
-- Plataforma de movilidad segura para mujeres (prototipo académico)
-- 001_esquema_inicial.sql  -  Esquema de base de datos compartido
--
-- Motor: PostgreSQL 13 o superior (usa gen_random_uuid() nativo).
-- Uso:   psql -U <usuario> -d <base> -f 001_esquema_inicial.sql
--
-- Esta base la comparten el portal admin-web y la app móvil. Los campos salen
-- de los tipos que ya usa el portal (src/features/**/**.types.ts), pasados de
-- camelCase a snake_case: fullName -> full_name, registeredAt -> registered_at.
-- Las excepciones (palabras reservadas) están anotadas junto a cada columna.
--
-- FORMULARIO DE INSCRIPCIÓN DE CONDUCTORA (app móvil)
-- Para que la solicitud aparezca completa en el módulo de revisión de
-- conductoras del portal, la app móvil debe registrar, en una transacción:
--   1. accounts            role = 'driver', display_name
--   2. consent_records     policy_version, accepted_at, scopes
--   3. drivers             full_name, document_type, document_number, phone
--                          (status queda en 'pending_review')
--   4. vehicles            plate, model, color
--   5. driver_documents    Licencia de conducción, SOAT, Revisión técnico-mecánica
--                          (label, expires_at, file_path)
--   6. biometric_references  photo_path y/o template_path, model_version
--   7. verifications       kind = 'enrollment', status = 'pending'
-- El portal lee la conductora desde la vista v_drivers_portal, que entrega el
-- documento y el teléfono ya enmascarados.
--
-- SUPUESTOS (el portal no los define; ajustar cuando exista el SRS):
--   - Identificadores UUID. El portal los trata como texto opaco (EntityId).
--   - accounts.email / accounts.password_hash para el inicio de sesión móvil.
--   - drivers.document_type con el catálogo CC / CE / PA / PPT.
--   - El cifrado de documento, teléfono y biometría lo aplica el backend.
-- =============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Tipos enumerados (mismos valores que los tipos TypeScript del portal)
-- ----------------------------------------------------------------------------

CREATE TYPE account_role          AS ENUM ('passenger', 'driver', 'trusted_contact', 'admin');
CREATE TYPE admin_role            AS ENUM ('super_admin', 'operator', 'verifier', 'auditor');
CREATE TYPE consent_scope         AS ENUM ('location', 'biometric', 'notifications', 'trusted_contact_sharing');

CREATE TYPE driver_status         AS ENUM ('pending_review', 'approved', 'rejected', 'suspended');
CREATE TYPE verification_status   AS ENUM ('confirmed', 'pending', 'deferred', 'expired', 'failed');
CREATE TYPE verification_result   AS ENUM ('match', 'no_match', 'inconclusive');
CREATE TYPE verification_kind     AS ENUM ('enrollment', 'periodic', 'pre_trip');
CREATE TYPE liveness_status       AS ENUM ('passed', 'failed', 'not_performed');
CREATE TYPE document_status       AS ENUM ('valid', 'pending', 'expired', 'rejected');

CREATE TYPE trip_status           AS ENUM ('requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled');
CREATE TYPE route_change_author   AS ENUM ('passenger', 'admin');

CREATE TYPE alert_type            AS ENUM ('silent_alert', 'help_button', 'route_deviation', 'prolonged_stop', 'signal_loss', 'verification_failed', 'anomaly_index');
CREATE TYPE alert_severity        AS ENUM ('critical', 'high', 'medium');
CREATE TYPE alert_status          AS ENUM ('open', 'acknowledged', 'resolved');
CREATE TYPE anomaly_level         AS ENUM ('low', 'medium', 'high');
CREATE TYPE delivery_channel      AS ENUM ('push', 'sms', 'admin_portal');
CREATE TYPE delivery_status       AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE resolution_outcome    AS ENUM ('false_alarm', 'contact_established', 'help_channel_used', 'other');

CREATE TYPE privacy_request_type   AS ENUM ('access', 'consent_withdrawal', 'deletion');
CREATE TYPE privacy_request_status AS ENUM ('received', 'in_review', 'completed', 'rejected');
CREATE TYPE privacy_subject_role   AS ENUM ('passenger', 'driver', 'trusted_contact');

-- ----------------------------------------------------------------------------
-- Cuentas y consentimiento (RF01)
-- ----------------------------------------------------------------------------

-- Account: una fila por persona usuaria de la app móvil o del portal.
CREATE TABLE accounts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role          account_role NOT NULL,
    display_name  text NOT NULL,              -- alias operativo, p. ej. "Pasajera 1042"
    email         text UNIQUE,                -- SUPUESTO: credencial de la app móvil
    password_hash text,                       -- SUPUESTO: nunca la contraseña en claro
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ConsentRecord: se conserva el historial; el vigente es el más reciente.
CREATE TABLE consent_records (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id     uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    policy_version text NOT NULL,
    accepted_at    timestamptz NOT NULL DEFAULT now(),
    withdrawn_at   timestamptz,               -- no nulo = consentimiento retirado (RF13)
    scopes         consent_scope[] NOT NULL,
    CONSTRAINT consent_scopes_not_empty CHECK (cardinality(scopes) > 0),
    CONSTRAINT consent_withdrawn_after_accepted CHECK (withdrawn_at IS NULL OR withdrawn_at >= accepted_at)
);
CREATE INDEX idx_consent_records_account ON consent_records (account_id, accepted_at DESC);

-- ----------------------------------------------------------------------------
-- Personas administradoras del portal y permisos (RBAC)
-- ----------------------------------------------------------------------------

-- AdminUser. Sus permisos salen de role_permissions según el rol.
CREATE TABLE admin_users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     text NOT NULL,
    email         text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role          admin_role NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role       admin_role NOT NULL,
    permission text NOT NULL,
    PRIMARY KEY (role, permission),
    CONSTRAINT role_permissions_known CHECK (permission IN (
        'dashboard:view', 'drivers:view', 'drivers:review', 'drivers:sensitive',
        'trips:monitor', 'trips:history', 'alerts:view', 'alerts:attend',
        'audit:view', 'parameters:view', 'parameters:edit', 'privacy:manage'
    ))
);

-- ----------------------------------------------------------------------------
-- Conductoras (RF02, RF04, RF05)  <-- formulario de inscripción de la app móvil
-- ----------------------------------------------------------------------------

-- Driver. El portal nunca recibe document_number ni phone completos: los lee
-- enmascarados (documentNumberMasked, phoneMasked) desde v_drivers_portal.
CREATE TABLE drivers (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id            uuid NOT NULL UNIQUE REFERENCES accounts (id) ON DELETE RESTRICT,
    full_name             text NOT NULL,
    document_type         text NOT NULL DEFAULT 'CC',
    document_number       text NOT NULL,
    phone                 text NOT NULL,
    status                driver_status NOT NULL DEFAULT 'pending_review',
    registered_at         timestamptz NOT NULL DEFAULT now(),
    -- Estado vigente de identidad; el backend lo actualiza con cada verificación.
    identity_verification verification_status NOT NULL DEFAULT 'pending',
    rejection_reason      text,
    reviewed_by           uuid REFERENCES admin_users (id),
    reviewed_at           timestamptz,
    CONSTRAINT drivers_document_type_known CHECK (document_type IN ('CC', 'CE', 'PA', 'PPT')),
    CONSTRAINT drivers_document_unique UNIQUE (document_type, document_number),
    -- RF02: el rechazo exige motivo.
    CONSTRAINT drivers_rejection_needs_reason CHECK (
        status <> 'rejected' OR (rejection_reason IS NOT NULL AND btrim(rejection_reason) <> '')
    ),
    CONSTRAINT drivers_review_is_complete CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL))
);
CREATE INDEX idx_drivers_status ON drivers (status, registered_at DESC);

-- Vehicle: un vehículo por conductora, como lo muestra el portal.
CREATE TABLE vehicles (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id uuid NOT NULL UNIQUE REFERENCES drivers (id) ON DELETE CASCADE,
    plate     text NOT NULL UNIQUE,
    model     text NOT NULL,
    color     text NOT NULL
);

-- DriverDocument: licencia, SOAT, revisión técnico-mecánica, etc.
CREATE TABLE driver_documents (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id  uuid NOT NULL REFERENCES drivers (id) ON DELETE CASCADE,
    label      text NOT NULL,
    status     document_status NOT NULL DEFAULT 'pending',
    expires_at timestamptz,
    file_path  text,                          -- ubicación del archivo que sube la app móvil
    CONSTRAINT driver_documents_unique_label UNIQUE (driver_id, label)
);

-- Verification: verificación de identidad 1:1 (inscripción, periódica, previa al viaje).
CREATE TABLE verifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       uuid NOT NULL REFERENCES drivers (id) ON DELETE CASCADE,
    kind            verification_kind NOT NULL,
    status          verification_status NOT NULL DEFAULT 'pending',
    result          verification_result,
    score           numeric(5, 4),            -- similitud 0..1; nulo si no se completó
    threshold       numeric(5, 4) NOT NULL,   -- umbral vigente al ejecutarla
    model_version   text NOT NULL,
    liveness_status liveness_status NOT NULL DEFAULT 'not_performed',
    requested_at    timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz,
    due_at          timestamptz,              -- fecha límite de una verificación periódica (RF05)
    CONSTRAINT verifications_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
    CONSTRAINT verifications_threshold_range CHECK (threshold >= 0 AND threshold <= 1)
);
CREATE INDEX idx_verifications_driver ON verifications (driver_id, requested_at DESC);

-- BiometricReference. El portal solo ve metadatos (hasPhoto, hasTemplate); el
-- contenido se pide aparte con justificación y queda en audit_log (RNF02).
CREATE TABLE biometric_references (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id     uuid NOT NULL UNIQUE REFERENCES drivers (id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    model_version text NOT NULL,
    photo_path    text,                       -- hasPhoto    = photo_path IS NOT NULL
    template_path text,                       -- hasTemplate = template_path IS NOT NULL
    CONSTRAINT biometric_has_content CHECK (photo_path IS NOT NULL OR template_path IS NOT NULL)
);

-- ----------------------------------------------------------------------------
-- Viajes, rutas y posiciones (RF03, RF06, RF07, RF10)
-- ----------------------------------------------------------------------------

-- Trip. driverName y driverVerification se obtienen de drivers;
-- shareLinkActive, de share_links; lastPosition, de positions.
CREATE TABLE trips (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status                  trip_status NOT NULL DEFAULT 'requested',
    passenger_account_id    uuid NOT NULL REFERENCES accounts (id),
    passenger_alias         text NOT NULL,
    driver_id               uuid REFERENCES drivers (id),   -- nulo hasta que una conductora acepta
    origin_label            text NOT NULL,
    origin_lat              double precision NOT NULL,
    origin_lng              double precision NOT NULL,
    destination_label       text NOT NULL,
    destination_lat         double precision NOT NULL,
    destination_lng         double precision NOT NULL,
    requested_at            timestamptz NOT NULL DEFAULT now(),
    started_at              timestamptz,
    ended_at                timestamptz,
    active_deviation_meters integer,                        -- activeDeviation.meters
    active_deviation_since  timestamptz,                    -- activeDeviation.since
    active_stop_since       timestamptz,                    -- activeStop.since
    anomaly_index           smallint,                       -- 0..100; no es probabilidad de delito
    CONSTRAINT trips_anomaly_range CHECK (anomaly_index IS NULL OR anomaly_index BETWEEN 0 AND 100),
    CONSTRAINT trips_deviation_is_complete CHECK ((active_deviation_meters IS NULL) = (active_deviation_since IS NULL))
);
CREATE INDEX idx_trips_status ON trips (status, requested_at DESC);
CREATE INDEX idx_trips_driver ON trips (driver_id);

-- TripStatusChange (statusHistory).
CREATE TABLE trip_status_changes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    from_status trip_status,                  -- campo "from"; nulo en el primer estado
    to_status   trip_status NOT NULL,         -- campo "to"
    changed_at  timestamptz NOT NULL DEFAULT now(),   -- campo "at"
    actor       text NOT NULL
);
CREATE INDEX idx_trip_status_changes_trip ON trip_status_changes (trip_id, changed_at);

-- ReferenceRoute: cada cambio autorizado crea una versión nueva (RF06).
CREATE TABLE reference_routes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    version         integer NOT NULL DEFAULT 1,
    points          jsonb NOT NULL,           -- arreglo de { "lat": ..., "lng": ... }
    distance_meters integer NOT NULL,
    CONSTRAINT reference_routes_unique_version UNIQUE (trip_id, version),
    CONSTRAINT reference_routes_points_array CHECK (jsonb_typeof(points) = 'array')
);

-- RouteChange (authorizedChanges).
CREATE TABLE route_changes (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id      uuid NOT NULL REFERENCES reference_routes (id) ON DELETE CASCADE,
    authorized_at timestamptz NOT NULL DEFAULT now(),
    authorized_by route_change_author NOT NULL,
    reason        text NOT NULL
);

-- Position: muestra GPS que envía la app móvil de la conductora.
-- El id lo genera el dispositivo para descartar duplicados tras reconectar (RNF04).
CREATE TABLE positions (
    id               uuid PRIMARY KEY,
    trip_id          uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    lat              double precision NOT NULL,
    lng              double precision NOT NULL,
    device_timestamp timestamptz NOT NULL,
    server_timestamp timestamptz NOT NULL DEFAULT now(),
    accuracy_meters  real NOT NULL,
    speed_kmh        real
);
CREATE INDEX idx_positions_trip ON positions (trip_id, device_timestamp DESC);

-- ShareLink: enlace temporal para el contacto de confianza (RF10).
CREATE TABLE share_links (
    token      text PRIMARY KEY,              -- opaco: no codifica datos del viaje
    trip_id    uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz
);
CREATE INDEX idx_share_links_trip ON share_links (trip_id);

-- ----------------------------------------------------------------------------
-- Alertas e incidencias (RF08, RF09, RF12)
-- ----------------------------------------------------------------------------

-- Alert, con su IncidentResolution en las columnas resolution_* / resolved_*.
CREATE TABLE alerts (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id            uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    type               alert_type NOT NULL,
    severity           alert_severity NOT NULL,
    status             alert_status NOT NULL DEFAULT 'open',
    created_at         timestamptz NOT NULL DEFAULT now(),
    silent             boolean NOT NULL DEFAULT false,
    summary            text NOT NULL,
    acknowledged_by    uuid REFERENCES admin_users (id),
    acknowledged_at    timestamptz,
    resolution_outcome resolution_outcome,
    resolution_notes   text,
    resolved_by        uuid REFERENCES admin_users (id),
    resolved_at        timestamptz,
    CONSTRAINT alerts_ack_is_complete CHECK ((acknowledged_by IS NULL) = (acknowledged_at IS NULL)),
    CONSTRAINT alerts_resolved_is_complete CHECK (
        (status = 'resolved') = (resolution_outcome IS NOT NULL AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
    )
);
CREATE INDEX idx_alerts_status ON alerts (status, created_at DESC);
CREATE INDEX idx_alerts_trip ON alerts (trip_id);

-- AnomalyAssessment: como máximo una por alerta.
CREATE TABLE anomaly_assessments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id      uuid NOT NULL UNIQUE REFERENCES alerts (id) ON DELETE CASCADE,
    index_value   smallint NOT NULL,          -- campo "index", 0..100
    level         anomaly_level NOT NULL,
    computed_at   timestamptz NOT NULL DEFAULT now(),
    model_version text NOT NULL,
    CONSTRAINT anomaly_index_range CHECK (index_value BETWEEN 0 AND 100)
);

-- AnomalyFactor: la suma de contribution debe igualar index_value.
CREATE TABLE anomaly_factors (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL REFERENCES anomaly_assessments (id) ON DELETE CASCADE,
    code          text NOT NULL,
    label         text NOT NULL,
    description   text NOT NULL,
    observed      text NOT NULL,              -- valor ya formateado, p. ej. "320 m"
    weight        numeric(4, 3) NOT NULL,
    contribution  smallint NOT NULL,
    CONSTRAINT anomaly_factors_unique_code UNIQUE (assessment_id, code),
    CONSTRAINT anomaly_factors_weight_range CHECK (weight >= 0 AND weight <= 1)
);

-- AlertDelivery: 'delivered' solo vale con confirmed_at informado (RNF03).
CREATE TABLE alert_deliveries (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id        uuid NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
    channel         delivery_channel NOT NULL,
    destination     text NOT NULL,            -- sin datos personales de más
    attempts        integer NOT NULL DEFAULT 0,
    last_attempt_at timestamptz,
    status          delivery_status NOT NULL DEFAULT 'pending',
    confirmed_at    timestamptz,
    CONSTRAINT alert_deliveries_delivered_confirmed CHECK (status <> 'delivered' OR confirmed_at IS NOT NULL)
);
CREATE INDEX idx_alert_deliveries_alert ON alert_deliveries (alert_id);

-- ----------------------------------------------------------------------------
-- Parámetros versionados (RF07)
-- ----------------------------------------------------------------------------

-- Parameter. Columnas renombradas: key -> param_key, value -> current_value,
-- min -> min_value, max -> max_value. updated_by nulo = "Sistema".
CREATE TABLE parameters (
    param_key     text PRIMARY KEY,
    label         text NOT NULL,
    description   text NOT NULL,
    unit          text NOT NULL,
    current_value numeric NOT NULL,
    min_value     numeric NOT NULL,
    max_value     numeric NOT NULL,
    version       integer NOT NULL DEFAULT 1,
    updated_at    timestamptz NOT NULL DEFAULT now(),
    updated_by    uuid REFERENCES admin_users (id),
    CONSTRAINT parameters_key_known CHECK (param_key IN ('route_deviation_meters', 'signal_loss_seconds', 'prolonged_stop_seconds')),
    CONSTRAINT parameters_value_in_range CHECK (current_value BETWEEN min_value AND max_value)
);

-- ParameterVersion: historial de cambios; changed_by nulo = "Sistema".
CREATE TABLE parameter_versions (
    param_key      text NOT NULL REFERENCES parameters (param_key) ON DELETE CASCADE,
    version        integer NOT NULL,
    previous_value numeric,
    new_value      numeric NOT NULL,
    changed_by     uuid REFERENCES admin_users (id),
    changed_at     timestamptz NOT NULL DEFAULT now(),
    reason         text NOT NULL,
    PRIMARY KEY (param_key, version)
);

-- ----------------------------------------------------------------------------
-- Auditoría (RF12)
-- ----------------------------------------------------------------------------

-- AuditEntry. Solo se inserta: no debe actualizarse ni borrarse.
-- actor_id nulo = "Sistema"; actor_name guarda el nombre tal como era al ocurrir.
CREATE TABLE audit_log (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at   timestamptz NOT NULL DEFAULT now(),   -- campo "at"
    actor_id      uuid REFERENCES admin_users (id),
    actor_name    text NOT NULL,
    action        text NOT NULL,
    resource_type text NOT NULL,              -- p. ej. "Conductora", "Alerta"
    resource_id   text NOT NULL,
    justification text,                       -- obligatoria al consultar datos sensibles (RNF02)
    detail        text,
    CONSTRAINT audit_action_known CHECK (action IN (
        'auth.login', 'driver.approved', 'driver.rejected',
        'sensitive.photo_viewed', 'sensitive.template_viewed', 'trip.history_viewed',
        'alert.acknowledged', 'alert.resolved', 'parameter.updated', 'privacy.status_changed'
    )),
    CONSTRAINT audit_sensitive_needs_justification CHECK (
        action NOT IN ('sensitive.photo_viewed', 'sensitive.template_viewed', 'trip.history_viewed')
        OR (justification IS NOT NULL AND btrim(justification) <> '')
    )
);
CREATE INDEX idx_audit_log_occurred ON audit_log (occurred_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log (resource_type, resource_id);

-- ----------------------------------------------------------------------------
-- Solicitudes de datos personales, Ley 1581 (RF13)
-- ----------------------------------------------------------------------------

-- PrivacyRequest: la crea la persona titular desde la app móvil o el enlace.
CREATE TABLE privacy_requests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type               privacy_request_type NOT NULL,
    subject_account_id uuid REFERENCES accounts (id) ON DELETE SET NULL,
    subject_alias      text NOT NULL,
    subject_role       privacy_subject_role NOT NULL,
    status             privacy_request_status NOT NULL DEFAULT 'received',
    created_at         timestamptz NOT NULL DEFAULT now(),
    due_at             timestamptz NOT NULL   -- fecha límite legal; la calcula el backend
);
CREATE INDEX idx_privacy_requests_status ON privacy_requests (status, due_at);

-- PrivacyRequestEvent (history).
CREATE TABLE privacy_request_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  uuid NOT NULL REFERENCES privacy_requests (id) ON DELETE CASCADE,
    occurred_at timestamptz NOT NULL DEFAULT now(),     -- campo "at"
    actor       text NOT NULL,
    status      privacy_request_status NOT NULL,
    note        text NOT NULL
);
CREATE INDEX idx_privacy_request_events_request ON privacy_request_events (request_id, occurred_at);

-- ----------------------------------------------------------------------------
-- Vista para el portal: conductora con datos enmascarados (interfaz Driver)
-- ----------------------------------------------------------------------------

CREATE VIEW v_drivers_portal AS
SELECT
    d.id,
    d.full_name,
    d.document_type || ' ··· ' || right(d.document_number, 4) AS document_number_masked,
    '··· ··· ' || right(d.phone, 4)                           AS phone_masked,
    d.status,
    d.registered_at,
    v.plate  AS vehicle_plate,
    v.model  AS vehicle_model,
    v.color  AS vehicle_color,
    d.identity_verification,
    d.rejection_reason,
    d.reviewed_by AS reviewed_by_id,
    a.full_name   AS reviewed_by_name,
    d.reviewed_at
FROM drivers d
LEFT JOIN vehicles v    ON v.driver_id = d.id
LEFT JOIN admin_users a ON a.id = d.reviewed_by;

-- ----------------------------------------------------------------------------
-- Datos de catálogo (no incluye personas ni datos de prueba)
-- ----------------------------------------------------------------------------

-- Matriz rol -> permisos (ROLE_PERMISSIONS de auth.types.ts).
INSERT INTO role_permissions (role, permission) VALUES
    ('super_admin', 'dashboard:view'),
    ('super_admin', 'drivers:view'),
    ('super_admin', 'drivers:review'),
    ('super_admin', 'drivers:sensitive'),
    ('super_admin', 'trips:monitor'),
    ('super_admin', 'trips:history'),
    ('super_admin', 'alerts:view'),
    ('super_admin', 'alerts:attend'),
    ('super_admin', 'audit:view'),
    ('super_admin', 'parameters:view'),
    ('super_admin', 'parameters:edit'),
    ('super_admin', 'privacy:manage'),
    ('operator', 'dashboard:view'),
    ('operator', 'drivers:view'),
    ('operator', 'trips:monitor'),
    ('operator', 'trips:history'),
    ('operator', 'alerts:view'),
    ('operator', 'alerts:attend'),
    ('verifier', 'dashboard:view'),
    ('verifier', 'drivers:view'),
    ('verifier', 'drivers:review'),
    ('verifier', 'drivers:sensitive'),
    ('auditor', 'dashboard:view'),
    ('auditor', 'audit:view'),
    ('auditor', 'parameters:view'),
    ('auditor', 'privacy:manage');

-- Umbrales iniciales. SUPUESTO: 100 m / 30 s / 180 s, pendientes de confirmar con el SRS.
INSERT INTO parameters (param_key, label, description, unit, current_value, min_value, max_value) VALUES
    ('route_deviation_meters', 'Umbral de desviación de ruta',
     'Distancia a la ruta de referencia a partir de la cual se registra una desviación.',
     'm', 100, 20, 1000),
    ('signal_loss_seconds', 'Umbral de pérdida de señal',
     'Tiempo sin recibir posiciones a partir del cual el viaje se marca sin señal.',
     's', 30, 10, 300),
    ('prolonged_stop_seconds', 'Umbral de parada prolongada',
     'Tiempo detenido a partir del cual se registra una parada prolongada.',
     's', 180, 30, 1800);

INSERT INTO parameter_versions (param_key, version, previous_value, new_value, reason)
SELECT param_key, 1, NULL, current_value, 'Valor inicial del piloto según el documento de diseño.'
FROM parameters;

COMMIT;
