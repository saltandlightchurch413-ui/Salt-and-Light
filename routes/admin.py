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
    about.footer_caption = data.get('footer_caption', about.footer_caption).strip() if data.get('footer_caption') is not None else about.footer_caption
    
    # New fields
    about.church_name = data.get('church_name', about.church_name).strip() if data.get('church_name') is not None else about.church_name
    about.hero_title = data.get('hero_title', about.hero_title).strip() if data.get('hero_title') is not None else about.hero_title
    about.hero_subtitle = data.get('hero_subtitle', about.hero_subtitle).strip() if data.get('hero_subtitle') is not None else about.hero_subtitle
    about.meta_description = data.get('meta_description', about.meta_description).strip() if data.get('meta_description') is not None else about.meta_description
    
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

# ─── Backup & Restore ───────────────────────────────────

@admin_bp.route('/api/admin/backup', methods=['GET'])
@login_required
def backup_data():
    """Export all database content as JSON."""
    data = {
        'categories': [],
        'songs': [],
        'social_links': [],
        'about': None
    }
    
    for cat in Category.query.all():
        data['categories'].append({
            'name': cat.name,
            'name_te': cat.name_te
        })
        
    for song in Song.query.all():
        data['songs'].append({
            'title_en': song.title_en,
            'title_te': song.title_te,
            'lyrics_en': song.lyrics_en,
            'lyrics_te': song.lyrics_te,
            'category_name': song.category.name if song.category else None
        })
        
    for link in SocialLink.query.all():
        data['social_links'].append({
            'platform': link.platform,
            'url': link.url,
            'icon': link.icon,
            'order': link.order
        })
        
    about = AboutContent.query.first()
    if about:
        data['about'] = {
            'title': about.title,
            'content': about.content,
            'location': about.location,
            'service_times': about.service_times,
            'footer_caption': about.footer_caption,
            'logo_url': about.logo_url,
            'logo_public_id': about.logo_public_id
        }
        
    return jsonify({'success': True, 'backup': data})


@admin_bp.route('/api/admin/restore', methods=['POST'])
@login_required
def restore_data():
    """Restore database from JSON."""
    if 'backup' not in request.files:
        return jsonify({'error': 'No backup file provided'}), 400
        
    import json
    file = request.files['backup']
    try:
        data = json.load(file)
    except Exception:
        return jsonify({'error': 'Invalid JSON file'}), 400
        
    # Process Categories
    cat_map = {} # map name -> id
    for c_data in data.get('categories', []):
        cat = Category.query.filter_by(name=c_data['name']).first()
        if not cat:
            cat = Category(name=c_data['name'], name_te=c_data.get('name_te', ''))
            db.session.add(cat)
            db.session.commit()
        cat_map[cat.name] = cat.id

    # Process Songs
    for s_data in data.get('songs', []):
        cat_id = None
        if s_data.get('category_name') and s_data['category_name'] in cat_map:
            cat_id = cat_map[s_data['category_name']]
            
        # Check if exists
        song = Song.query.filter_by(title_en=s_data['title_en'], title_te=s_data['title_te']).first()
        if not song:
            song = Song(
                title_en=s_data['title_en'],
                title_te=s_data['title_te'],
                lyrics_en=s_data.get('lyrics_en', ''),
                lyrics_te=s_data.get('lyrics_te', ''),
                category_id=cat_id
            )
            song.compute_search_fields()
            db.session.add(song)

    # Process Social Links
    for l_data in data.get('social_links', []):
        link = SocialLink.query.filter_by(platform=l_data['platform']).first()
        if not link:
            link = SocialLink(
                platform=l_data['platform'],
                url=l_data['url'],
                icon=l_data.get('icon', 'link'),
                order=l_data.get('order', 0)
            )
            db.session.add(link)

    # Process About
    about_data = data.get('about')
    if about_data:
        about = AboutContent.query.first()
        if not about:
            about = AboutContent()
            db.session.add(about)
        about.title = about_data.get('title', about.title)
        about.content = about_data.get('content', about.content)
        about.location = about_data.get('location', about.location)
        about.service_times = about_data.get('service_times', about.service_times)
        if 'footer_caption' in about_data:
            about.footer_caption = about_data['footer_caption']
        if 'logo_url' in about_data:
            about.logo_url = about_data['logo_url']
        if 'logo_public_id' in about_data:
            about.logo_public_id = about_data['logo_public_id']

    db.session.commit()
    return jsonify({'success': True, 'message': 'Data restored successfully'})
