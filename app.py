import os
from flask import Flask
from flask_migrate import Migrate
from flask_login import LoginManager
from config import config
from models import db, Admin

migrate = Migrate()
login_manager = LoginManager()


def create_app(config_name=None):
    """Application factory."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')

    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config.from_object(config.get(config_name, config['default']))
    config.get(config_name, config['default']).init_app(app)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = None  # API-based auth, no redirect

    @login_manager.user_loader
    def load_user(user_id):
        return Admin.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import jsonify
        return jsonify({'error': 'Authentication required'}), 401

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
            from utils.seed import seed_database
            seed_database()
        except Exception as e:
            app.logger.warning(f'Database seeding skipped: {e}')

    return app


# Create app instance for gunicorn / flask run
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
