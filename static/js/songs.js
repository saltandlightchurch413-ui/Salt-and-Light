/* ═══════════════════════════════════════════════════════
   SONGS — Song list, detail, and index pages
   ═══════════════════════════════════════════════════════ */

const Songs = {
    currentCategory: null,
    currentLetter: null,
    currentLetterType: null,

    /**
     * Render Song List Page
     */
    async renderSongList(params = {}) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="songs-page-layout page-enter">
                <aside class="songs-sidebar" id="songs-sidebar">
                    <div class="sidebar-section" id="category-filters">
                        <div class="sidebar-title">Categories</div>
                    </div>
                </aside>
                <div class="songs-main">
                    <div class="songs-header">
                        <div>
                            <h1 class="section-title">All Songs</h1>
                            <p class="songs-count" id="songs-count"></p>
                        </div>
                    </div>
                    <div class="songs-grid" id="songs-grid">${Utils.skeleton(5)}</div>
                    <div id="songs-pagination"></div>
                </div>
            </div>
        `;

        // Load categories
        this.loadCategories();

        // Check URL params
        const searchQuery = params.q || '';
        if (searchQuery) {
            this.searchSongs(searchQuery);
        } else {
            this.loadSongs(params);
        }
    },

    async loadCategories() {
        try {
            const data = await Utils.fetch('/api/categories');
            const container = document.getElementById('category-filters');
            if (!container) return;

            const allBtn = `<button class="sidebar-filter-btn active" onclick="Songs.filterByCategory(null, this)">All Songs</button>`;
            const catBtns = data.categories.map(cat =>
                `<button class="sidebar-filter-btn" onclick="Songs.filterByCategory(${cat.id}, this)">
                    ${Utils.escapeHtml(cat.name)}
                    <span class="count">${cat.song_count}</span>
                </button>`
            ).join('');

            container.innerHTML = `<div class="sidebar-title">Categories</div>${allBtn}${catBtns}`;
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    },

    async loadSongs(params = {}) {
        const grid = document.getElementById('songs-grid');
        const countEl = document.getElementById('songs-count');
        if (!grid) return;

        try {
            let url = '/api/songs?per_page=50';
            if (params.category_id) url += `&category_id=${params.category_id}`;
            if (params.letter_en) url += `&letter_en=${encodeURIComponent(params.letter_en)}`;
            if (params.letter_te) url += `&letter_te=${encodeURIComponent(params.letter_te)}`;
            if (params.page) url += `&page=${params.page}`;

            const data = await Utils.fetch(url);

            if (data.songs.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="music"></i>
                        <h3>No songs found</h3>
                        <p>Try changing your filters or add songs from the admin dashboard.</p>
                    </div>
                `;
            } else {
                grid.innerHTML = data.songs.map(song => this.renderSongCard(song)).join('');
            }

            if (countEl) countEl.textContent = `${data.total} song${data.total !== 1 ? 's' : ''}`;

            this.renderPagination(data, params);
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            grid.innerHTML = `<div class="empty-state"><h3>Failed to load songs</h3><p>${err.message}</p></div>`;
        }
    },

    async searchSongs(query) {
        const grid = document.getElementById('songs-grid');
        const countEl = document.getElementById('songs-count');
        if (!grid) return;

        try {
            const data = await Utils.fetch(`/api/songs/search?q=${encodeURIComponent(query)}`);

            if (data.results.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="search-x"></i>
                        <h3>No results for "${Utils.escapeHtml(query)}"</h3>
                        <p>Try a different search term</p>
                    </div>
                `;
            } else {
                grid.innerHTML = data.results.map(song => this.renderSongCard(song)).join('');
            }

            if (countEl) countEl.textContent = `${data.results.length} result${data.results.length !== 1 ? 's' : ''}`;
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            grid.innerHTML = `<div class="empty-state"><h3>Search failed</h3><p>${err.message}</p></div>`;
        }
    },

    renderSongCard(song) {
        const title = song.title_en || song.title_te || 'Untitled';
        const subtitle = song.title_te && song.title_en ? song.title_te : '';
        const preview = song.preview_en || song.preview_te || '';
        const category = song.category ? song.category.name : '';

        return `
            <div class="song-card" onclick="window.location.hash='/songs/${song.slug}'">
                <div class="song-card-icon"><i data-lucide="music"></i></div>
                <div class="song-card-body">
                    <div class="song-card-title">${Utils.escapeHtml(title)}</div>
                    ${subtitle ? `<div class="song-card-subtitle">${Utils.escapeHtml(subtitle)}</div>` : ''}
                    ${preview ? `<div class="song-card-preview">${Utils.escapeHtml(Utils.truncate(preview, 80))}</div>` : ''}
                </div>
                <div class="song-card-actions">
                    ${category ? `<span class="song-category-tag">${Utils.escapeHtml(category)}</span>` : ''}
                    <button class="song-card-share" onclick="event.stopPropagation(); Utils.share('${Utils.escapeHtml(title)}', '${window.location.origin}/#/songs/${song.slug}')">
                        <i data-lucide="share-2"></i>
                    </button>
                </div>
            </div>
        `;
    },

    renderPagination(data, params) {
        const container = document.getElementById('songs-pagination');
        if (!container || data.pages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        let html = '<div class="pagination">';

        if (data.page > 1) {
            html += `<button class="page-btn" onclick="Songs.loadSongs({...${JSON.stringify(params)}, page: ${data.page - 1}})"><i data-lucide="chevron-left"></i></button>`;
        }

        for (let i = 1; i <= data.pages; i++) {
            if (i === data.page) {
                html += `<button class="page-btn active">${i}</button>`;
            } else if (Math.abs(i - data.page) <= 2 || i === 1 || i === data.pages) {
                html += `<button class="page-btn" onclick="Songs.loadSongs({...${JSON.stringify(params)}, page: ${i}})">${i}</button>`;
            } else if (Math.abs(i - data.page) === 3) {
                html += `<button class="page-btn disabled">...</button>`;
            }
        }

        if (data.page < data.pages) {
            html += `<button class="page-btn" onclick="Songs.loadSongs({...${JSON.stringify(params)}, page: ${data.page + 1}})"><i data-lucide="chevron-right"></i></button>`;
        }

        html += '</div>';
        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    filterByCategory(categoryId, el) {
        // Update active state
        document.querySelectorAll('.sidebar-filter-btn').forEach(b => b.classList.remove('active'));
        if (el) el.classList.add('active');
        this.currentCategory = categoryId;
        this.loadSongs(categoryId ? { category_id: categoryId } : {});
    },

    /**
     * Render Song Detail Page
     */
    async renderSongDetail(slug) {
        const app = document.getElementById('app');
        app.innerHTML = `<div class="song-detail">${Utils.skeleton(3)}</div>`;

        try {
            const data = await Utils.fetch(`/api/songs/${slug}`);
            const song = data.song;

            const hasEn = !!(song.lyrics_en && song.lyrics_en.trim());
            const hasTe = !!(song.lyrics_te && song.lyrics_te.trim());
            const defaultLang = hasTe ? 'te' : 'en';
            const songUrl = `${window.location.origin}/#/songs/${song.slug}`;

            app.innerHTML = `
                <div class="song-detail page-enter">
                    <div class="song-detail-header">
                        <a href="#/songs" class="song-detail-back"><i data-lucide="arrow-left"></i> Back to Songs</a>
                        <h1 class="song-detail-title">${Utils.escapeHtml(song.title_en || song.title_te || 'Untitled')}</h1>
                        ${song.title_te && song.title_en ? `<p class="song-detail-subtitle">${Utils.escapeHtml(song.title_te)}</p>` : ''}
                        ${song.category ? `<span class="song-category-tag">${Utils.escapeHtml(song.category.name)}</span>` : ''}
                    </div>

                    <div class="song-detail-actions">
                        <button class="detail-action-btn primary" onclick="Utils.share('${Utils.escapeHtml(song.title_en || song.title_te)}', '${songUrl}')">
                            <i data-lucide="share-2"></i> Share
                        </button>
                        <button class="detail-action-btn outline" id="copy-lyrics-btn">
                            <i data-lucide="copy"></i> Copy Lyrics
                        </button>
                    </div>

                    ${(hasEn && hasTe) ? `
                        <div class="lang-toggle">
                            <button class="lang-toggle-btn ${defaultLang === 'en' ? 'active' : ''}" onclick="Songs.toggleLang('en', this)">English</button>
                            <button class="lang-toggle-btn ${defaultLang === 'te' ? 'active' : ''}" onclick="Songs.toggleLang('te', this)">తెలుగు</button>
                        </div>
                    ` : ''}

                    <div class="song-lyrics">
                        ${hasEn ? `<div class="lyrics-content ${defaultLang !== 'en' ? 'lyrics-hidden' : ''}" id="lyrics-en">${Utils.escapeHtml(song.lyrics_en)}</div>` : ''}
                        ${hasTe ? `<div class="lyrics-content telugu ${defaultLang !== 'te' ? 'lyrics-hidden' : ''}" id="lyrics-te">${Utils.escapeHtml(song.lyrics_te)}</div>` : ''}
                    </div>
                </div>
            `;

            // Copy lyrics handler
            document.getElementById('copy-lyrics-btn')?.addEventListener('click', async () => {
                const activeLyrics = document.querySelector('.lyrics-content:not(.lyrics-hidden)');
                if (activeLyrics) {
                    await Utils.copyToClipboard(activeLyrics.textContent);
                    Utils.toast('Lyrics copied!', 'success');
                }
            });

            if (window.lucide) lucide.createIcons();
        } catch (err) {
            app.innerHTML = `
                <div class="song-detail">
                    <div class="empty-state">
                        <i data-lucide="alert-circle"></i>
                        <h3>Song not found</h3>
                        <p>${err.message}</p>
                        <a href="#/songs" class="btn btn-primary mt-lg">Browse Songs</a>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    },

    toggleLang(lang, el) {
        // Update buttons
        document.querySelectorAll('.lang-toggle-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');

        // Toggle lyrics
        const lyricsEn = document.getElementById('lyrics-en');
        const lyricsTe = document.getElementById('lyrics-te');

        if (lang === 'en') {
            if (lyricsEn) lyricsEn.classList.remove('lyrics-hidden');
            if (lyricsTe) lyricsTe.classList.add('lyrics-hidden');
        } else {
            if (lyricsEn) lyricsEn.classList.add('lyrics-hidden');
            if (lyricsTe) lyricsTe.classList.remove('lyrics-hidden');
        }
    },

    /**
     * Render Song Index Page (Parnasala-style inline listing)
     */
    async renderIndex() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="index-page page-enter">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Song Index</h1>
                        <p class="section-subtitle">Browse songs alphabetically</p>
                    </div>
                </div>
                <div id="index-content">${Utils.skeleton(2)}</div>
            </div>
        `;

        try {
            const data = await Utils.fetch('/api/songs/index-letters');
            const container = document.getElementById('index-content');

            const allEnglish = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            const availableEn = new Set(data.english);

            // Telugu consonants & vowels
            const teluguLetters = [
                'అ','ఆ','ఇ','ఈ','ఉ','ఊ','ఎ','ఏ','ఐ','ఒ','ఓ','ఔ',
                'క','ఖ','గ','ఘ','చ','ఛ','జ','ఝ','ట','ఠ','డ','ఢ','ణ',
                'త','థ','ద','ధ','న','ప','ఫ','బ','భ','మ',
                'య','ర','ల','వ','శ','ష','స','హ'
            ];
            const availableTe = new Set(data.telugu);

            let html = `
                <div class="index-section">
                    <h2 class="index-section-title">English (A–Z)</h2>
                    <div class="letter-grid" id="letter-grid-en">
                        ${allEnglish.map(l => `
                            <button class="letter-btn ${availableEn.has(l) ? '' : 'disabled'}"
                                    data-letter="${l}" data-type="en"
                                    onclick="Songs.filterByLetter('${l}', 'en', this)">
                                <span>${l}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div id="index-songs-en"></div>
                </div>

                <div class="index-section">
                    <h2 class="index-section-title">తెలుగు (Telugu)</h2>
                    <div class="letter-grid" id="letter-grid-te">
                        ${teluguLetters.map(l => `
                            <button class="letter-btn telugu-letter ${availableTe.has(l) ? '' : 'disabled'}"
                                    data-letter="${l}" data-type="te"
                                    onclick="Songs.filterByLetter('${l}', 'te', this)">
                                <span>${l}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div id="index-songs-te"></div>
                </div>
            `;

            container.innerHTML = html;
        } catch (err) {
            document.getElementById('index-content').innerHTML = `
                <div class="empty-state"><h3>Failed to load index</h3><p>${err.message}</p></div>
            `;
        }
    },

    /**
     * Filter by letter — shows songs inline under the letter grid (Parnasala-style)
     */
    async filterByLetter(letter, type, btnEl) {
        const gridId = type === 'en' ? 'letter-grid-en' : 'letter-grid-te';
        const containerId = type === 'en' ? 'index-songs-en' : 'index-songs-te';
        const grid = document.getElementById(gridId);
        const container = document.getElementById(containerId);

        if (!container) return;

        // If clicking the same active letter, close the listing
        if (btnEl && btnEl.classList.contains('active')) {
            btnEl.classList.remove('active');
            container.innerHTML = '';
            return;
        }

        // Remove active from all buttons in this grid
        if (grid) {
            grid.querySelectorAll('.letter-btn').forEach(b => b.classList.remove('active'));
        }

        // Set active on clicked button
        if (btnEl) btnEl.classList.add('active');

        // Show loading
        container.innerHTML = `<div class="index-songs-container"><div style="padding: var(--space-lg); text-align: center; color: var(--text-muted);">Loading songs...</div></div>`;

        try {
            const paramKey = type === 'en' ? 'letter_en' : 'letter_te';
            const data = await Utils.fetch(`/api/songs?${paramKey}=${encodeURIComponent(letter)}&per_page=200`);

            if (data.songs.length === 0) {
                container.innerHTML = `
                    <div class="index-songs-container">
                        <div style="padding: var(--space-lg); text-align: center; color: var(--text-muted);">
                            No songs found for "${letter}"
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="index-songs-container">
                    <div class="index-songs-header">
                        <div class="index-songs-title">
                            <span class="letter-badge">${letter}</span>
                            Songs starting with "${letter}"
                        </div>
                        <div style="display:flex;align-items:center;gap:var(--space-md);">
                            <span class="index-songs-count">${data.songs.length} song${data.songs.length !== 1 ? 's' : ''}</span>
                            <button class="index-close-btn" onclick="Songs.closeIndexSongs('${type}', '${letter}')">
                                <i data-lucide="x"></i> Close
                            </button>
                        </div>
                    </div>
                    <div class="index-songs-list">
                        ${data.songs.map((song, i) => {
                            const titleEn = song.title_en || '';
                            const titleTe = song.title_te || '';
                            const primary = type === 'te' ? titleTe : (titleEn || titleTe);
                            const secondary = type === 'te' ? titleEn : titleTe;

                            return `
                                <div class="index-song-item" onclick="window.location.hash='/songs/${song.slug}'">
                                    <div class="song-num">${i + 1}</div>
                                    <div class="song-info">
                                        <div class="song-title-en">${Utils.escapeHtml(primary)}</div>
                                        ${secondary ? `<div class="song-title-te">${Utils.escapeHtml(secondary)}</div>` : ''}
                                    </div>
                                    <div class="song-arrow"><i data-lucide="chevron-right"></i></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            if (window.lucide) lucide.createIcons();

            // Smooth scroll to the songs listing
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } catch (err) {
            container.innerHTML = `
                <div class="index-songs-container">
                    <div style="padding: var(--space-lg); text-align: center; color: var(--danger);">
                        Failed to load songs: ${err.message}
                    </div>
                </div>
            `;
        }
    },

    /**
     * Close inline song listing for a letter
     */
    closeIndexSongs(type, letter) {
        const gridId = type === 'en' ? 'letter-grid-en' : 'letter-grid-te';
        const containerId = type === 'en' ? 'index-songs-en' : 'index-songs-te';
        const grid = document.getElementById(gridId);
        const container = document.getElementById(containerId);

        if (grid) {
            grid.querySelectorAll('.letter-btn').forEach(b => b.classList.remove('active'));
        }
        if (container) {
            container.innerHTML = '';
        }
    }
};

