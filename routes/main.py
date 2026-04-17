from flask import Blueprint, send_from_directory, render_template, current_app
import os
from models import AboutContent

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Serve the SPA shell."""
    about = AboutContent.query.first()
    settings = about.to_dict() if about else {
        'church_name': 'Salt & Light Church',
        'meta_description': 'Salt & Light Church Digital Songbook — Find Telugu & English worship songs instantly.',
        'hero_title': 'Find Songs Instantly',
        'hero_subtitle': 'Telugu & English worship songs at your fingertips'
    }
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
    about = AboutContent.query.first()
    settings = about.to_dict() if about else {
        'church_name': 'Salt & Light Church',
        'meta_description': 'Salt & Light Church Digital Songbook — Find Telugu & English worship songs instantly.',
        'hero_title': 'Find Songs Instantly',
        'hero_subtitle': 'Telugu & English worship songs at your fingertips'
    }
    return render_template('base.html', settings=settings)
