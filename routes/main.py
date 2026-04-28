from flask import Blueprint, send_from_directory, render_template, current_app
import os
from models import AboutContent

main_bp = Blueprint('main', __name__)

# Default settings used when DB is unavailable
_DEFAULT_SETTINGS = {
    'church_name': 'Salt & Light Church',
    'meta_description': 'Salt & Light Church Digital Songbook — Find Telugu & English worship songs instantly.',
    'hero_title': 'Find Songs Instantly',
    'hero_subtitle': 'Telugu & English worship songs at your fingertips',
    'footer_caption': 'Worship the Lord with gladness; come before him with joyful songs.',
    'logo_url': '',
    'title': '',
    'content': '',
    'location': '',
    'service_times': '',
}


def _get_settings():
    """Safely fetch site settings, returning defaults if DB is unavailable."""
    try:
        about = AboutContent.query.first()
        return about.to_dict() if about else dict(_DEFAULT_SETTINGS)
    except Exception as e:
        current_app.logger.warning(f'Could not load settings from DB: {e}')
        return dict(_DEFAULT_SETTINGS)


@main_bp.route('/')
def index():
    """Serve the SPA shell."""
    settings = _get_settings()
    return render_template('base.html', settings=settings)


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
    settings = _get_settings()
    return render_template('base.html', settings=settings)
