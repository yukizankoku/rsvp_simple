import logging
import os

from flask import Flask, render_template, request

from .config import get_config
from .extensions import csrf, db, login_manager, migrate


def create_app(config_name=None):
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY is not set. Copy .env.example to .env and configure it.")
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        raise RuntimeError("DATABASE_URL is not set. Copy .env.example to .env and configure it.")

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    _configure_logging(app)

    db.init_app(app)
    migrate.init_app(app, db, compare_type=True)
    csrf.init_app(app)
    login_manager.init_app(app)

    from . import models  # noqa: F401  (register models with SQLAlchemy / Alembic)
    from .models.user import User

    @login_manager.user_loader
    def load_user(user_id):
        user = db.session.get(User, int(user_id))
        return user if user and user.is_active else None

    from .routes import register_blueprints

    register_blueprints(app)
    _register_error_handlers(app)
    _register_template_helpers(app)

    from .cli import register_cli

    register_cli(app)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return response

    return app


def _configure_logging(app):
    level = logging.DEBUG if app.debug else logging.INFO
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s"))
    logger = logging.getLogger("eo")
    logger.setLevel(level)
    if not logger.handlers:
        logger.addHandler(handler)


def _register_error_handlers(app):
    logger = logging.getLogger("eo")

    def wants_partial():
        return request.headers.get("HX-Request") == "true"

    @app.errorhandler(403)
    def forbidden(_e):
        return render_template("errors/error.html", code=403,
                               title="Akses ditolak",
                               message="Anda tidak memiliki akses ke halaman ini."), 403

    @app.errorhandler(404)
    def not_found(_e):
        return render_template("errors/error.html", code=404,
                               title="Halaman tidak ditemukan",
                               message="Halaman yang Anda cari tidak tersedia."), 404

    @app.errorhandler(413)
    def too_large(_e):
        return render_template("errors/error.html", code=413,
                               title="File terlalu besar",
                               message="Ukuran file melebihi batas yang diizinkan."), 413

    @app.errorhandler(429)
    def too_many(_e):
        return render_template("errors/error.html", code=429,
                               title="Terlalu banyak permintaan",
                               message="Silakan tunggu sebentar lalu coba lagi."), 429

    @app.errorhandler(500)
    def server_error(e):
        logger.exception("Unhandled application error: %s", e)
        db.session.rollback()
        return render_template("errors/error.html", code=500,
                               title="Terjadi kesalahan",
                               message="Terjadi kesalahan pada server. Silakan coba lagi."), 500

    from flask_wtf.csrf import CSRFError

    @app.errorhandler(CSRFError)
    def csrf_error(_e):
        return render_template("errors/error.html", code=400,
                               title="Sesi kedaluwarsa",
                               message="Form sudah kedaluwarsa. Muat ulang halaman lalu coba lagi."), 400

    app.jinja_env.globals["wants_partial"] = wants_partial


def _register_template_helpers(app):
    from .utils import formatting
    from .utils.permissions import has_permission

    app.jinja_env.filters["date_id"] = formatting.format_date_id
    app.jinja_env.filters["time_short"] = formatting.format_time
    app.jinja_env.filters["datetime_local"] = formatting.format_datetime_local
    app.jinja_env.filters["mask_token"] = formatting.mask_token
    app.jinja_env.filters["tz_label"] = formatting.tz_label
    app.jinja_env.filters["wa_phone"] = formatting.normalize_phone
    app.jinja_env.globals["has_permission"] = has_permission
