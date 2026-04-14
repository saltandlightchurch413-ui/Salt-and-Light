import cloudinary
import cloudinary.uploader
import cloudinary.api
from flask import current_app


def configure_cloudinary(app):
    """Configure Cloudinary from app config."""
    cloud_name = app.config.get('CLOUDINARY_CLOUD_NAME', '')
    api_key = app.config.get('CLOUDINARY_API_KEY', '')
    api_secret = app.config.get('CLOUDINARY_API_SECRET', '')

    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        return True
    return False


def upload_image(file, folder='church_songbook'):
    """
    Upload an image to Cloudinary.
    Returns dict with 'url' and 'public_id', or None on failure.
    """
    try:
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            transformation=[
                {'quality': 'auto', 'fetch_format': 'auto'}
            ]
        )
        return {
            'url': result.get('secure_url', ''),
            'public_id': result.get('public_id', ''),
        }
    except Exception as e:
        current_app.logger.error(f'Cloudinary upload error: {e}')
        return None


def delete_image(public_id):
    """Delete an image from Cloudinary by public_id."""
    try:
        if public_id:
            result = cloudinary.uploader.destroy(public_id)
            return result.get('result') == 'ok'
    except Exception as e:
        current_app.logger.error(f'Cloudinary delete error: {e}')
    return False


def get_thumbnail_url(url, width=400, height=300):
    """Generate a thumbnail URL from a Cloudinary URL."""
    if not url or 'cloudinary' not in url:
        return url
    # Insert transformation before /upload/
    return url.replace('/upload/', f'/upload/w_{width},h_{height},c_fill,q_auto,f_auto/')
