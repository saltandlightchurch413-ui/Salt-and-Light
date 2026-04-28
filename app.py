import os
import time
from flask import Flask, jsonify, render_template_string
from flask_migrate import Migrate
from flask_login import LoginManager
from config import config
from models import db, Admin

migrate = Migrate()
login_manager = LoginManager()


def _wait_for_db(app, retries=3, delay=1):
    """Wait for the database to become available (handles cold-start on Render)."""
    for attempt in range(retries):
        try:
            with app.app_context():
                db.session.execute(db.text('SELECT 1'))
                db.session.commit()
            return True
        except Exception as e:
            app.logger.warning(f'DB connection attempt {attempt + 1}/{retries} failed: {e}')
            if attempt < retries - 1:
                time.sleep(delay)
            db.session.rollback()
    return False


def create_app(config_name=None):
    """Application factory."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')

    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config.from_object(config.get(config_name, config['default']))
    config.get(config_name, config['default']).init_app(app)

    # SQLAlchemy connection pool settings for reliability
    app.config.setdefault('SQLALCHEMY_ENGINE_OPTIONS', {
        'pool_pre_ping': True,        # Test connections before using them
        'pool_recycle': 300,           # Recycle connections every 5 min
        'pool_timeout': 10,            # Wait max 10s for a connection
        'connect_args': {'connect_timeout': 5} if 'postgresql' in app.config.get('SQLALCHEMY_DATABASE_URI', '') else {},
    })

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = None  # API-based auth, no redirect

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return db.session.get(Admin, int(user_id))
        except Exception:
            return None

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Authentication required'}), 401

    # Global error handlers
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        # If it's an API request, return JSON
        from flask import request
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error. Please try again.'}), 500
        # Otherwise, render a friendly page that auto-reloads
        return render_template_string('''
<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Loading...</title>
<meta http-equiv="refresh" content="2">
<style>
  body { font-family: 'Inter', sans-serif; display: flex; align-items: center;
         justify-content: center; min-height: 100vh; margin: 0;
         background: #0a0a0f; color: #C8922A; }
  .box { text-align: center; }
  .spinner { width: 40px; height: 40px; border: 3px solid rgba(200,146,42,.2);
             border-top-color: #C8922A; border-radius: 50%; margin: 0 auto 1rem;
             animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  p { opacity: .7; font-size: .9rem; }
</style>
</head><body>
<div class="box">
  <div class="spinner"></div>
  <h2>Just a moment&hellip;</h2>
  <p>The site is waking up. This page will reload automatically.</p>
</div>
</body></html>
        '''), 500

    @app.errorhandler(404)
    def not_found_error(error):
        from flask import request
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not found'}), 404
        # SPA catch-all — serve the shell
        from models import AboutContent
        try:
            about = AboutContent.query.first()
            settings = about.to_dict() if about else {}
        except Exception:
            settings = {}
        return render_template_string(
            open(os.path.join(app.template_folder, 'base.html')).read(),
            settings=settings
        ), 200

    # Configure Cloudinary
    from utils.cloudinary_helper import configure_cloudinary
    configure_cloudinary(app)

    # Register blueprints
    from routes.auth import auth_bp
    from routes.api import api_bp
    from routes.admin import admin_bp
    from routes.main import main_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(main_bp)

    # Seed database on first run
    with app.app_context():
        try:
            # Wait for DB to be available before seeding
            if _wait_for_db(app):
                from utils.seed import seed_database
                seed_database()
            else:
                app.logger.warning('Database not available at startup — seeding deferred.')
        except Exception as e:
            app.logger.warning(f'Database seeding skipped: {e}')

    return app


# Create app instance for gunicorn / flask run
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
