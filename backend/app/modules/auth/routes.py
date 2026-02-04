from fastapi import APIRouter
from app.shared.types import AuthCallbackIn, AuthCallbackOut
from .douyin_client import exchange_code, get_userinfo
from .jwt_service import sign_app_token
from app.shared.http import bad_request

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/douyin/callback", response_model=AuthCallbackOut)
async def douyin_callback(inp: AuthCallbackIn):
    if not inp.code:
        bad_request("missing code")

    tk = await exchange_code(inp.code)
    access_token = tk.get("access_token")
    open_id = tk.get("open_id")
    if not access_token or not open_id:
        bad_request("douyin exchange failed")

    profile = await get_userinfo(access_token, open_id)

    app_token = sign_app_token(
        {
            "sub": f"douyin:{open_id}",
            "provider": "douyin",
            "nickname": profile.get("nickname"),
            "avatar": profile.get("avatar"),
        }
    )
    return AuthCallbackOut(app_token=app_token, profile=profile)
