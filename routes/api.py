from flask import Blueprint, request, jsonify
from models import db, Song, Category, Image, SocialLink, AboutContent
from utils.search import search_songs

api_bp = Blueprint('api', __name__)


@api_bp.route('/api/songs')
def get_songs():
    """Get songs with optional filters."""
    category_id = request.args.get('category_id', type=int)
    letter_en = request.args.get('letter_en', '').strip()
    letter_te = request.args.get('letter_te', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    query = Song.query

    if category_id:
        query = query.filter_by(category_id=category_id)

    if letter_en:
        query = query.filter(Song.first_letter_en == letter_en.upper())

    if letter_te:
        query = query.filter(Song.first_letter_te == letter_te)

    # Order by title
    query = query.order_by(
        db.func.coalesce(Song.title_en, '').asc(),
        db.func.coalesce(Song.title_te, '').asc()
    )

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'songs': [s.to_dict() for s in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@api_bp.route('/api/songs/search')
def search():
    """Search songs."""
    q = request.args.get('q', '').strip()
    if not q or len(q) < 1:
        return jsonify({'results': []})

    all_songs = Song.query.all()
    results = search_songs(q, all_songs)

    return jsonify({
        'results': [
            {**song.to_dict(), 'matched_lang': lang}
            for song, lang in results[:30]
        ]
    })


@api_bp.route('/api/songs/recent')
def recent_songs():
    """Get recently added songs."""
    limit = request.args.get('limit', 10, type=int)
    songs = Song.query.order_by(Song.created_at.desc()).limit(limit).all()
    return jsonify({'songs': [s.to_dict() for s in songs]})


@api_bp.route('/api/songs/<slug>')
def get_song(slug):
    """Get a single song by slug."""
    song = Song.query.filter_by(slug=slug).first()
    if not song:
        return jsonify({'error': 'Song not found'}), 404
    return jsonify({'song': song.to_dict(include_lyrics=True)})


@api_bp.route('/api/songs/index-letters')
def index_letters():
    """Get all available first letters for indexing."""
    # English letters
    en_letters = db.session.query(Song.first_letter_en).filter(
        Song.first_letter_en != '', Song.first_letter_en.isnot(None)
    ).distinct().all()
    en_letters = sorted(set(l[0] for l in en_letters if l[0]))

    # Telugu letters
    te_letters = db.session.query(Song.first_letter_te).filter(
        Song.first_letter_te != '', Song.first_letter_te.isnot(None)
    ).distinct().all()
    te_letters = sorted(set(l[0] for l in te_letters if l[0]))

    return jsonify({
        'english': en_letters,
        'telugu': te_letters,
    })


@api_bp.route('/api/categories')
def get_categories():
    """Get all categories."""
    categories = Category.query.order_by(Category.name).all()
    return jsonify({'categories': [c.to_dict() for c in categories]})


@api_bp.route('/api/gallery')
def get_gallery():
    """Get gallery images."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    pagination = Image.query.order_by(Image.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        'images': [i.to_dict() for i in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@api_bp.route('/api/social-links')
def get_social_links():
    """Get social links."""
    links = SocialLink.query.order_by(SocialLink.order).all()
    return jsonify({'links': [l.to_dict() for l in links]})


@api_bp.route('/api/about')
def get_about():
    """Get about content."""
    about = AboutContent.query.first()
    if about:
        return jsonify({'about': about.to_dict()})
    return jsonify({'about': {'title': '', 'content': '', 'logo_url': ''}})
