from fastapi import HTTPException


def bad_request(msg: str):
    raise HTTPException(status_code=400, detail=msg)


def unauthorized(msg: str = "unauthorized"):
    raise HTTPException(status_code=401, detail=msg)
