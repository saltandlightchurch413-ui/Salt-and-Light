from flask import Blueprint, send_from_directory, current_app
import os

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Serve the SPA shell."""
    return send_from_directory(
        os.path.join(current_app.root_path, 'templates'),
        'base.html'
    )


@main_bp.route('/<path:path>')
def catch_all(path):
    """
    Catch-all for SPA routing.
    Serve static files if they exist, otherwise serve the SPA shell.
    """
    # Check if it's a static file request
    static_path = os.path.join(current_app.root_path, 'static', path)
    if os.path.isfile(static_path):
        return send_from_directory(
            os.path.join(current_app.root_path, 'static'),
            path
        )

    # Otherwise serve SPA shell
    return send_from_directory(
        os.path.join(current_app.root_path, 'templates'),
        'base.html'
    )
