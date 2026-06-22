"""Environment variable safety checks — never log or expose secrets."""

from __future__ import annotations

import os

# Vite exposes any VITE_* variable to the browser bundle.
_FORBIDDEN_VITE_SUBSTRINGS = ("SERVICE_ROLE", "SECRET", "PRIVATE", "PASSWORD", "TOKEN")


def _secret_values() -> tuple[str, ...]:
    return tuple(
        v.strip()
        for k, v in os.environ.items()
        if v.strip()
        and any(s in k.upper() for s in ("KEY", "SECRET", "TOKEN", "PASSWORD"))
        and "EXAMPLE" not in k.upper()
    )


def sanitize_error_message(exc: Exception | str) -> str:
    """Strip secret material from exception text before returning to clients/logs."""
    msg = str(exc)
    for secret in _secret_values():
        if len(secret) >= 8 and secret in msg:
            return "Operation failed due to a configuration or connection error."
    return msg


def validate_backend_env() -> None:
    """Fail fast on unsafe env naming (e.g. service role exposed via VITE_)."""
    for name in os.environ:
        upper = name.upper()
        if not upper.startswith("VITE_"):
            continue
        if any(part in upper for part in _FORBIDDEN_VITE_SUBSTRINGS):
            raise RuntimeError(
                f"{name} must not be set on the server. "
                "Remove VITE_-prefixed secrets; use backend-only variables instead."
            )


def redact_status_dict(status: dict) -> dict:
    """Remove values that might echo secrets from public status payloads."""
    out = dict(status)
    if "load_error" in out and isinstance(out["load_error"], str):
        out["load_error"] = sanitize_error_message(out["load_error"])
    return out
