from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from models import Admin

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/login', methods=['POST'])
def login():
    """Admin login."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    admin = Admin.query.filter_by(email=email).first()
    if admin and admin.check_password(password):
        login_user(admin, remember=True)
        session.permanent = True
        return jsonify({'success': True, 'message': 'Login successful'})

    return jsonify({'error': 'Invalid email or password'}), 401


@auth_bp.route('/api/logout', methods=['POST'])
@login_required
def logout():
    """Admin logout."""
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out'})


@auth_bp.route('/api/auth/status')
def auth_status():
    """Check if admin is logged in."""
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'email': current_user.email})
    return jsonify({'authenticated': False})


@auth_bp.route('/api/auth/update-password', methods=['PUT'])
@login_required
def update_password():
    """Update admin password."""
    from models import db
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password are required'}), 400
        
    if not current_user.check_password(current_password):
        return jsonify({'error': 'Incorrect current password'}), 401
        
    current_user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Password updated successfully'})
