import os
import time
from flask import current_app
import cloudinary
import cloudinary.uploader
import cloudinary.api

def configure_cloudinary(app):
    """
    Configure Cloudinary using environment variables.
    Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
    """
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME')
    api_key = os.environ.get('CLOUDINARY_API_KEY')
    api_secret = os.environ.get('CLOUDINARY_API_SECRET')
    
    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret
        )
        app.logger.info("Cloudinary configured successfully.")
        return True
    else:
        app.logger.warning("Cloudinary environment variables missing. Image uploads will fail.")
        return False

def upload_image(file, folder='church_songbook'):
    """
    Upload an image to Cloudinary.
    Returns dict with 'url' and 'public_id', or None on failure.
    """
    try:
        if not file:
            return None
            
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="auto"
        )
        
        return {
            'url': result.get('secure_url'),
            'public_id': result.get('public_id')
        }
    except Exception as e:
        current_app.logger.error(f'Cloudinary upload error: {e}')
        return None

def delete_image(public_id):
    """Delete an image from Cloudinary by its public_id."""
    try:
        if public_id:
            cloudinary.uploader.destroy(public_id)
            return True
    except Exception as e:
        current_app.logger.error(f'Cloudinary delete error: {e}')
    return False

def get_thumbnail_url(url, width=400, height=300):
    """
    Generate a transformed thumbnail URL if it's a Cloudinary URL.
    """
    if not url or 'res.cloudinary.com' not in url:
        return url
        
    try:
        # Extract the public_id and version from the URL
        # URL format: https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>.<ext>
        parts = url.split('/upload/')
        if len(parts) == 2:
            base_url = parts[0] + '/upload/'
            image_path = parts[1]
            
            # Add transformation parameters: c_fill,w_400,h_300
            transform = f'c_fill,w_{width},h_{height}/'
            
            return f"{base_url}{transform}{image_path}"
    except Exception:
        pass
        
    return url
