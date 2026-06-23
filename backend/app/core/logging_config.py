"""
Structured JSON logging for Crow Repuestos API.

Every log record is emitted as a single JSON line so it can be ingested by
log aggregators (Datadog, Loki, CloudWatch, etc.) without extra parsing.

Usage:
    from app.core.logging_config import get_logger
    logger = get_logger(__name__)
    logger.info("product.created", extra={"product_id": 42, "sku": "OIL-530"})
"""

import json
import logging
import sys
import time
from typing import Any


class JSONFormatter(logging.Formatter):
    """Formats log records as newline-delimited JSON."""

    SKIP_ATTRS = {
        "args", "created", "exc_info", "exc_text", "filename", "funcName",
        "levelno", "lineno", "message", "module", "msecs", "msg",
        "pathname", "process", "processName", "relativeCreated",
        "stack_info", "thread", "threadName",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        # Attach any extra= kwargs the caller passed
        for key, value in record.__dict__.items():
            if key not in self.SKIP_ATTRS and not key.startswith("_"):
                payload[key] = value

        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    """
    Call once at startup (in main.py lifespan) to replace the default
    uvicorn/root handler with the JSON formatter.
    """
    root = logging.getLogger()
    root.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    # Remove existing handlers to avoid duplicate output
    root.handlers.clear()
    root.addHandler(handler)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
