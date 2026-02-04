import httpx
from app.shared.config import settings
from app.shared.http import bad_request


DOUYIN_EXCHANGE_URL = "https://open.douyin.com/oauth/access_token/"
DOUYIN_USERINFO_URL = "https://open.douyin.com/oauth/userinfo/"


async def exchange_code(code: str) -> dict:
    if not settings.douyin_client_key or not settings.douyin_client_secret:
        bad_request("douyin config missing")

    params = {
        "client_key": settings.douyin_client_key,
        "client_secret": settings.douyin_client_secret,
        "code": code,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(DOUYIN_EXCHANGE_URL, params=params)
        r.raise_for_status()
        data = r.json()
    return data.get("data") or data


async def get_userinfo(access_token: str, open_id: str) -> dict:
    params = {"access_token": access_token, "open_id": open_id}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(DOUYIN_USERINFO_URL, params=params)
        r.raise_for_status()
        data = r.json()
    return data.get("data") or data
