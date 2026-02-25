from fastapi import Header
import os
from .http import unauthorized
from app.modules.auth.jwt_service import verify_app_token


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        unauthorized("missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    return verify_app_token(token)


def require_console_token(authorization: str | None = Header(default=None)):
    expected = os.getenv("CONSOLE_TOKEN")
    if not expected:
        unauthorized("server missing CONSOLE_TOKEN")

    if not authorization or not authorization.startswith("Bearer "):
        unauthorized("missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    if token != expected:
        unauthorized("invalid console token")

    return True