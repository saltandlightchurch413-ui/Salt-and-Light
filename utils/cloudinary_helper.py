import os
import time
from werkzeug.utils import secure_filename
from flask import current_app

def configure_cloudinary(app):
    """
    Mock function to maintain compatibility. 
    Creates the local upload directory instead of configuring Cloudinary.
    """
    upload_dir = os.path.join(app.root_path, 'static', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    return True

def upload_image(file, folder='church_songbook'):
    """
    Save an image locally to static/uploads/.
    Returns dict with 'url' and 'public_id', or None on failure.
    """
    try:
        filename = secure_filename(file.filename)
        # Create a unique filename
        filename = f"{int(time.time())}_{filename}"
        
        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # public_id is just the filename locally
        return {
            'url': f'/static/uploads/{filename}',
            'public_id': filename,
        }
    except Exception as e:
        current_app.logger.error(f'Local upload error: {e}')
        return None

def delete_image(public_id):
    """Delete a local image by its filename."""
    try:
        if public_id:
            file_path = os.path.join(current_app.root_path, 'static', 'uploads', public_id)
            if os.path.exists(file_path):
                os.remove(file_path)
            return True
    except Exception as e:
        current_app.logger.error(f'Local delete error: {e}')
    return False

def get_thumbnail_url(url, width=400, height=300):
    """
    We don't do real-time transformation locally for now.
    Just return the original URL.
    """
    return url
