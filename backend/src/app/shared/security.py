from fastapi import Header
from .http import unauthorized
from app.modules.auth.jwt_service import verify_app_token


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        unauthorized("missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    return verify_app_token(token)
