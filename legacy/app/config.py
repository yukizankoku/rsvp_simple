import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _database_url():
    url = os.environ.get("DATABASE_URL")
    # Some hosts still hand out the legacy "postgres://" scheme.
    if url and url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def _bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "on")


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    APP_BASE_URL = (os.environ.get("APP_BASE_URL") or "").rstrip("/")

    UPLOAD_FOLDER = str(BASE_DIR / os.environ.get("UPLOAD_FOLDER", "uploads"))
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
    GUEST_IMPORT_MAX_ROWS = 5000
    DEFAULT_MAX_GUEST_COUNT = 10

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _bool(os.environ.get("SESSION_COOKIE_SECURE"))
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE = SESSION_COOKIE_SECURE
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 12

    WTF_CSRF_TIME_LIMIT = None
    RATELIMIT_ENABLED = True

    TESTING = False
    DEBUG = False


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    SESSION_COOKIE_SECURE = _bool(os.environ.get("SESSION_COOKIE_SECURE"), default=True)
    REMEMBER_COOKIE_SECURE = SESSION_COOKIE_SECURE


class TestingConfig(Config):
    TESTING = True
    SECRET_KEY = "test-secret-key"
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
    SQLALCHEMY_ENGINE_OPTIONS = {}
    WTF_CSRF_ENABLED = False
    RATELIMIT_ENABLED = False
    APP_BASE_URL = "http://testserver"


CONFIGS = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config(name=None):
    name = name or os.environ.get("FLASK_ENV", "production")
    return CONFIGS.get(name, ProductionConfig)
