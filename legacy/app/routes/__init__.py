def register_blueprints(app):
    from .admin_routes import bp as admin_bp, public_bp as uploads_bp
    from .auth_routes import bp as auth_bp
    from .checkin_routes import bp as checkin_bp
    from .dashboard_routes import bp as dashboard_bp
    from .event_routes import bp as events_bp
    from .guest_routes import bp as guests_bp
    from .invitation_routes import bp as invitation_bp

    for bp in (auth_bp, dashboard_bp, events_bp, guests_bp, invitation_bp, checkin_bp, admin_bp, uploads_bp):
        app.register_blueprint(bp)
