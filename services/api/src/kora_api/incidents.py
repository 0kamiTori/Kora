"""Local administrative outbox, independent of PostgreSQL; not delivery proof."""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

logger = logging.getLogger("kora_api")


class IncidentReporter:
    def __init__(self, directory: Path):
        self.directory = directory

    def record(self, code: str, request_id: str, error: Exception) -> str:
        incident_id = str(uuid4())
        record = {
            "incident_id": incident_id,
            "request_id": request_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "operation": "registration",
            "category": code,
            "error_type": type(error).__name__,
            "delivery_status": "pending_channel",
        }
        # Deliberately no str(error), exc_info, body, contact or connection URL.
        logger.error("event=unhandled_error incident=%s", json.dumps(record))
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            fd = os.open(
                self.directory / "registration.jsonl",
                os.O_CREAT | os.O_APPEND | os.O_WRONLY,
                0o600,
            )
            try:
                data = (json.dumps(record) + "\n").encode("utf-8")
                if os.write(fd, data) != len(data):
                    raise OSError("Incomplete incident append")
                os.fsync(fd)
            finally:
                os.close(fd)
        except OSError:
            logger.critical(
                "event=incident_outbox_unavailable incident_id=%s request_id=%s",
                incident_id,
                request_id,
            )
        return incident_id
