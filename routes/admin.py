from flask import Blueprint, request, jsonify
from flask_login import login_required
from models import db, Song, Category, Image, SocialLink, AboutContent
from utils.cloudinary_helper import upload_image, delete_image

admin_bp = Blueprint('admin', __name__)


# ─── Songs ──────────────────────────────────────────────

@admin_bp.route('/api/admin/songs', methods=['GET'])
@login_required
def list_songs():
    """List all songs for admin."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search_q = request.args.get('q', '').strip()

    query = Song.query
    if search_q:
        query = query.filter(
            db.or_(
                Song.title_en.ilike(f'%{search_q}%'),
                Song.title_te.ilike(f'%{search_q}%')
            )
        )

    pagination = query.order_by(Song.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'songs': [s.to_dict() for s in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@admin_bp.route('/api/admin/songs', methods=['POST'])
@login_required
def create_song():
    """Create a new song."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    title_en = data.get('title_en', '').strip()
    title_te = data.get('title_te', '').strip()

    if not title_en and not title_te:
        return jsonify({'error': 'At least one title is required'}), 400

    song = Song(
        title_en=title_en,
        title_te=title_te,
        lyrics_en=data.get('lyrics_en', '').strip(),
        lyrics_te=data.get('lyrics_te', '').strip(),
        category_id=data.get('category_id') or None,
    )
    song.compute_search_fields()

    db.session.add(song)
    db.session.commit()

    return jsonify({'success': True, 'song': song.to_dict(include_lyrics=True)}), 201


@admin_bp.route('/api/admin/songs/<int:song_id>', methods=['PUT'])
@login_required
def update_song(song_id):
    """Update an existing song."""
    song = Song.query.get_or_404(song_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    song.title_en = data.get('title_en', song.title_en).strip()
    song.title_te = data.get('title_te', song.title_te).strip()
    song.lyrics_en = data.get('lyrics_en', song.lyrics_en).strip()
    song.lyrics_te = data.get('lyrics_te', song.lyrics_te).strip()
    song.category_id = data.get('category_id') or song.category_id

    # Recompute slug if title changed
    if data.get('title_en') or data.get('title_te'):
        song.slug = None  # Reset to regenerate
    song.compute_search_fields()

    db.session.commit()
    return jsonify({'success': True, 'song': song.to_dict(include_lyrics=True)})


@admin_bp.route('/api/admin/songs/<int:song_id>', methods=['DELETE'])
@login_required
def delete_song(song_id):
    """Delete a song."""
    song = Song.query.get_or_404(song_id)
    db.session.delete(song)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Song deleted'})


# ─── Categories ─────────────────────────────────────────

@admin_bp.route('/api/admin/categories', methods=['POST'])
@login_required
def create_category():
    """Create a category."""
    data = request.get_json()
    name = (data or {}).get('name', '').strip()
    if not name:
        return jsonify({'error': 'Category name is required'}), 400

    if Category.query.filter_by(name=name).first():
        return jsonify({'error': 'Category already exists'}), 400

    cat = Category(name=name, name_te=(data or {}).get('name_te', '').strip())
    db.session.add(cat)
    db.session.commit()
    return jsonify({'success': True, 'category': cat.to_dict()}), 201


@admin_bp.route('/api/admin/categories/<int:cat_id>', methods=['PUT'])
@login_required
def update_category(cat_id):
    """Update a category."""
    cat = Category.query.get_or_404(cat_id)
    data = request.get_json()
    cat.name = (data or {}).get('name', cat.name).strip()
    cat.name_te = (data or {}).get('name_te', cat.name_te).strip()
    db.session.commit()
    return jsonify({'success': True, 'category': cat.to_dict()})


@admin_bp.route('/api/admin/categories/<int:cat_id>', methods=['DELETE'])
@login_required
def delete_category(cat_id):
    """Delete a category."""
    cat = Category.query.get_or_404(cat_id)
    # Set songs in this category to null
    Song.query.filter_by(category_id=cat_id).update({'category_id': None})
    db.session.delete(cat)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Category deleted'})


# ─── Images ─────────────────────────────────────────────

@admin_bp.route('/api/admin/images', methods=['POST'])
@login_required
def upload_gallery_image():
    """Upload an image to gallery."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    caption = request.form.get('caption', '').strip()

    result = upload_image(file, folder='church_songbook/gallery')
    if not result:
        return jsonify({'error': 'Failed to upload image'}), 500

    img = Image(
        url=result['url'],
        public_id=result['public_id'],
        caption=caption
    )
    db.session.add(img)
    db.session.commit()
    return jsonify({'success': True, 'image': img.to_dict()}), 201


@admin_bp.route('/api/admin/images/<int:img_id>', methods=['DELETE'])
@login_required
def delete_gallery_image(img_id):
    """Delete a gallery image."""
    img = Image.query.get_or_404(img_id)
    # Delete from Cloudinary
    if img.public_id:
        delete_image(img.public_id)
    db.session.delete(img)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Image deleted'})


# ─── Social Links ───────────────────────────────────────

@admin_bp.route('/api/admin/social-links', methods=['POST'])
@login_required
def create_social_link():
    """Create a social link."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    platform = data.get('platform', '').strip()
    url = data.get('url', '').strip()
    
    if url and not (url.startswith('http://') or url.startswith('https://')):
        url = 'https://' + url

    if not platform or not url:
        return jsonify({'error': 'Platform and URL are required'}), 400

    link = SocialLink(
        platform=platform,
        url=url,
        icon=data.get('icon', 'link').strip(),
        order=data.get('order', 0)
    )
    db.session.add(link)
    db.session.commit()
    return jsonify({'success': True, 'link': link.to_dict()}), 201


@admin_bp.route('/api/admin/social-links/<int:link_id>', methods=['PUT'])
@login_required
def update_social_link(link_id):
    """Update a social link."""
    link = SocialLink.query.get_or_404(link_id)
    data = request.get_json()
    link.platform = (data or {}).get('platform', link.platform).strip()
    
    new_url = (data or {}).get('url', link.url).strip()
    if new_url and not (new_url.startswith('http://') or new_url.startswith('https://')):
        new_url = 'https://' + new_url
    link.url = new_url
    
    link.icon = (data or {}).get('icon', link.icon).strip()
    link.order = (data or {}).get('order', link.order)
    db.session.commit()
    return jsonify({'success': True, 'link': link.to_dict()})


@admin_bp.route('/api/admin/social-links/<int:link_id>', methods=['DELETE'])
@login_required
def delete_social_link(link_id):
    """Delete a social link."""
    link = SocialLink.query.get_or_404(link_id)
    db.session.delete(link)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Social link deleted'})


# ─── About Content ──────────────────────────────────────

@admin_bp.route('/api/admin/about', methods=['PUT'])
@login_required
def update_about():
    """Update about content."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    about = AboutContent.query.first()
    if not about:
        about = AboutContent()
        db.session.add(about)

    about.title = data.get('title', about.title).strip()
    about.content = data.get('content', about.content).strip()
    about.location = data.get('location', about.location).strip()
    about.service_times = data.get('service_times', about.service_times).strip()
    db.session.commit()
    return jsonify({'success': True, 'about': about.to_dict()})


@admin_bp.route('/api/admin/logo', methods=['POST'])
@login_required
def upload_logo():
    """Upload or update the church logo."""
    if 'logo' not in request.files:
        return jsonify({'error': 'No logo file provided'}), 400

    file = request.files['logo']
    about = AboutContent.query.first()
    if not about:
        about = AboutContent()
        db.session.add(about)

    # Delete old logo from Cloudinary
    if about.logo_public_id:
        delete_image(about.logo_public_id)

    result = upload_image(file, folder='church_songbook/logos')
    if not result:
        return jsonify({'error': 'Failed to upload logo'}), 500

    about.logo_url = result['url']
    about.logo_public_id = result['public_id']
    db.session.commit()
    return jsonify({'success': True, 'logo_url': about.logo_url})
