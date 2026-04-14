import re
import unicodedata


# Telugu vowel signs (matras / dependent vowels)
TELUGU_VOWEL_SIGNS = {
    '\u0C3E', '\u0C3F', '\u0C40', '\u0C41', '\u0C42', '\u0C43', '\u0C44',
    '\u0C46', '\u0C47', '\u0C48', '\u0C4A', '\u0C4B', '\u0C4C', '\u0C4D',
    '\u0C55', '\u0C56',
}

# Invisible Unicode characters to strip
INVISIBLE_CHARS = {'\u200C', '\u200D', '\uFEFF', '\u200B', '\u00AD'}


def normalize_for_search(text):
    """
    Normalize text for search matching.
    - NFC normalize
    - Strip invisible characters
    - Strip Telugu vowel signs
    - Lowercase
    - Collapse whitespace
    """
    if not text:
        return ''

    text = unicodedata.normalize('NFC', text)

    # Remove invisible chars
    for ch in INVISIBLE_CHARS:
        text = text.replace(ch, '')

    # Strip Telugu vowel signs
    result = []
    for ch in text:
        if ch not in TELUGU_VOWEL_SIGNS:
            result.append(ch)
    text = ''.join(result)

    # Lowercase + collapse whitespace
    text = text.lower().strip()
    text = re.sub(r'\s+', ' ', text)

    return text


def search_songs(query, songs):
    """
    Search songs with scoring:
    1. Exact title match (highest)
    2. First-word starts with query
    3. Title starts with query
    4. Title contains query
    5. Lyrics contain query

    Works on both Telugu and English with Unicode normalization.
    """
    if not query or not songs:
        return []

    q = normalize_for_search(query)
    if not q:
        return []

    scored = []

    for song in songs:
        score = 0
        matched_lang = None

        # Normalize titles for comparison
        title_en_norm = normalize_for_search(song.title_en)
        title_te_norm = normalize_for_search(song.title_te)

        # Check English title
        if title_en_norm:
            if title_en_norm == q:
                score = max(score, 100)
                matched_lang = 'en'
            elif title_en_norm.split()[0] == q if title_en_norm.split() else False:
                score = max(score, 90)
                matched_lang = matched_lang or 'en'
            elif title_en_norm.startswith(q):
                score = max(score, 80)
                matched_lang = matched_lang or 'en'
            elif q in title_en_norm:
                score = max(score, 60)
                matched_lang = matched_lang or 'en'

        # Check Telugu title
        if title_te_norm:
            if title_te_norm == q:
                score = max(score, 100)
                matched_lang = 'te'
            elif title_te_norm.split()[0] == q if title_te_norm.split() else False:
                score = max(score, 90)
                matched_lang = matched_lang or 'te'
            elif title_te_norm.startswith(q):
                score = max(score, 80)
                matched_lang = matched_lang or 'te'
            elif q in title_te_norm:
                score = max(score, 60)
                matched_lang = matched_lang or 'te'

        # Check lyrics (lower priority)
        if score == 0:
            lyrics_en_norm = normalize_for_search(song.lyrics_en)
            lyrics_te_norm = normalize_for_search(song.lyrics_te)

            if lyrics_en_norm and q in lyrics_en_norm:
                score = 30
                matched_lang = 'en'
            elif lyrics_te_norm and q in lyrics_te_norm:
                score = 30
                matched_lang = 'te'

        if score > 0:
            scored.append((score, song, matched_lang or 'en'))

    # Sort by score descending, then by title
    scored.sort(key=lambda x: (-x[0], x[1].title_en or x[1].title_te or ''))

    return [(song, lang) for _, song, lang in scored]
