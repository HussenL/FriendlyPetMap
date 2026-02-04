from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_jwt_secret: str = Field(alias="APP_JWT_SECRET")
    app_jwt_expire_days: int = Field(default=7, alias="APP_JWT_EXPIRE_DAYS")

    douyin_client_key: str = Field(default="", alias="DOUYIN_CLIENT_KEY")
    douyin_client_secret: str = Field(default="", alias="DOUYIN_CLIENT_SECRET")

    aws_region: str = Field(default="ap-northeast-1", alias="AWS_REGION")
    ddb_incidents_table: str = Field(default="", alias="DDB_INCIDENTS_TABLE")
    ddb_comments_table: str = Field(default="", alias="DDB_COMMENTS_TABLE")

    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")


settings = Settings()
