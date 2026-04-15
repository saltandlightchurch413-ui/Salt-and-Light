import re
import unicodedata
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


def slugify(text):
    """Generate a URL-safe slug from text."""
    if not text:
        return ''
    # Simple ASCII slugify
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')


# --- Telugu Unicode Helpers ---

TELUGU_VOWEL_SIGNS = set([
    '\u0C3E', '\u0C3F', '\u0C40', '\u0C41', '\u0C42', '\u0C43', '\u0C44',
    '\u0C46', '\u0C47', '\u0C48', '\u0C4A', '\u0C4B', '\u0C4C', '\u0C4D',
    '\u0C55', '\u0C56',
])

TELUGU_CONSONANT_RANGE = (0x0C15, 0x0C39)
TELUGU_VOWEL_RANGE = (0x0C05, 0x0C14)


def normalize_telugu(text):
    """Normalize Telugu text for search: strip vowel signs, ZWJ/ZWNJ, normalize Unicode."""
    if not text:
        return ''
    # NFC normalization
    text = unicodedata.normalize('NFC', text)
    # Remove ZWJ, ZWNJ, and other invisible chars
    text = text.replace('\u200D', '').replace('\u200C', '').replace('\uFEFF', '')
    # Remove vowel signs (matras)
    result = []
    for ch in text:
        if ch not in TELUGU_VOWEL_SIGNS:
            result.append(ch)
    return ''.join(result)


def get_first_letter_telugu(text):
    """Extract the base first letter from Telugu text."""
    if not text:
        return ''
    
    # Normalize text to NFC
    text = unicodedata.normalize('NFC', text.strip())
    
    # Remove any leading punctuation or whitespace
    text = re.sub(r'^[\s\u200C\u200D\uFEFF"\'«»„""]+', '', text)
    if not text:
        return ''
        
    # Remove all Telugu vowel signs (matras) so compound letters become their base
    # \u0C3E to \u0C56 covers all vowel signs and modifiers in Telugu block
    text = re.sub(r'[\u0C3E-\u0C56]', '', text)
    
    if not text:
        return ''
        
    # Return the first character which is now guaranteed to be the base letter
    return text[0]


def get_first_letter_english(text):
    """Extract the first letter from English text."""
    if not text:
        return ''
    text = text.strip()
    text = re.sub(r'^[\s"\'«»„""]+', '', text)
    if not text:
        return ''
    ch = text[0]
    if ch.isalpha():
        return ch.upper()
    return '#'


class Admin(UserMixin, db.Model):
    __tablename__ = 'admin'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    name_te = db.Column(db.String(100), default='')
    songs = db.relationship('Song', backref='category', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_te': self.name_te or '',
            'song_count': self.songs.count()
        }


class Song(db.Model):
    __tablename__ = 'songs'
    id = db.Column(db.Integer, primary_key=True)
    title_en = db.Column(db.String(300), default='')
    title_te = db.Column(db.String(300), default='')
    lyrics_en = db.Column(db.Text, default='')
    lyrics_te = db.Column(db.Text, default='')
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    slug = db.Column(db.String(300), unique=True, nullable=False)
    first_letter_en = db.Column(db.String(5), default='', index=True)
    first_letter_te = db.Column(db.String(10), default='', index=True)
    search_normalized_en = db.Column(db.String(300), default='')
    search_normalized_te = db.Column(db.String(300), default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def compute_search_fields(self):
        """Compute normalized search fields and first letters."""
        # English
        if self.title_en:
            self.first_letter_en = get_first_letter_english(self.title_en)
            self.search_normalized_en = self.title_en.lower().strip()
        else:
            self.first_letter_en = ''
            self.search_normalized_en = ''

        # Telugu
        if self.title_te:
            self.first_letter_te = get_first_letter_telugu(self.title_te)
            self.search_normalized_te = normalize_telugu(self.title_te.strip())
        else:
            self.first_letter_te = ''
            self.search_normalized_te = ''

        # Generate slug
        if not self.slug:
            base = self.title_en if self.title_en else f'song-{self.id or "new"}'
            self.slug = slugify(base)
            # Ensure uniqueness
            existing = Song.query.filter_by(slug=self.slug).first()
            if existing and existing.id != self.id:
                self.slug = f"{self.slug}-{int(datetime.now(timezone.utc).timestamp())}"

    def to_dict(self, include_lyrics=False):
        data = {
            'id': self.id,
            'title_en': self.title_en or '',
            'title_te': self.title_te or '',
            'slug': self.slug,
            'category': self.category.to_dict() if self.category else None,
            'first_letter_en': self.first_letter_en or '',
            'first_letter_te': self.first_letter_te or '',
            'created_at': self.created_at.isoformat() if self.created_at else '',
        }
        if include_lyrics:
            data['lyrics_en'] = self.lyrics_en or ''
            data['lyrics_te'] = self.lyrics_te or ''
        else:
            # Preview: first line
            data['preview_en'] = (self.lyrics_en or '').split('\n')[0][:100] if self.lyrics_en else ''
            data['preview_te'] = (self.lyrics_te or '').split('\n')[0][:100] if self.lyrics_te else ''
        return data


class Image(db.Model):
    __tablename__ = 'images'
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False)
    public_id = db.Column(db.String(200), default='')
    caption = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'public_id': self.public_id or '',
            'caption': self.caption or '',
            'created_at': self.created_at.isoformat() if self.created_at else '',
        }


class SocialLink(db.Model):
    __tablename__ = 'social_links'
    id = db.Column(db.Integer, primary_key=True)
    platform = db.Column(db.String(50), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    icon = db.Column(db.String(50), default='link')
    order = db.Column(db.Integer, default=0)

    def to_dict(self):
        url = self.url
        if url and not (url.startswith('http://') or url.startswith('https://')):
            url = 'https://' + url
            
        return {
            'id': self.id,
            'platform': self.platform,
            'url': url,
            'icon': self.icon or 'link',
            'order': self.order or 0,
        }


class AboutContent(db.Model):
    __tablename__ = 'about_content'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), default='About Our Church')
    content = db.Column(db.Text, default='')
    location = db.Column(db.Text, default='')
    service_times = db.Column(db.Text, default='')
    logo_url = db.Column(db.String(500), default='')
    logo_public_id = db.Column(db.String(200), default='')
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title or '',
            'content': self.content or '',
            'location': self.location or '',
            'service_times': self.service_times or '',
            'logo_url': self.logo_url or '',
            'updated_at': self.updated_at.isoformat() if self.updated_at else '',
        }
