from datetime import datetime, timedelta, timezone
import jwt
from app.shared.config import settings
from app.shared.http import unauthorized


def sign_app_token(payload: dict) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=settings.app_jwt_expire_days)
    full = {**payload, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(full, settings.app_jwt_secret, algorithm="HS256")


def verify_app_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.app_jwt_secret, algorithms=["HS256"])
    except Exception:
        unauthorized("invalid or expired token")
