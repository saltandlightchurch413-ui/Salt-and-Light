/* ═══════════════════════════════════════════════════════
   SEARCH — Live search with debounced input
   ═══════════════════════════════════════════════════════ */

const Search = {
    dropdown: null,
    input: null,
    heroInput: null,
    isOpen: false,

    init() {
        this.dropdown = document.getElementById('search-dropdown');
        this.input = document.getElementById('nav-search-input');

        if (this.input) {
            this.input.addEventListener('input', Utils.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));

            this.input.addEventListener('focus', () => {
                if (this.input.value.trim().length > 0) {
                    this.showDropdown();
                }
            });

            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.hideDropdown();
            });
        }

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar-search') && !e.target.closest('.hero-search')) {
                this.hideDropdown();
            }
        });

        // Ctrl+K shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (this.input) {
                    this.input.focus();
                    this.input.select();
                }
            }
        });
    },

    initHeroSearch() {
        const heroInput = document.getElementById('hero-search-input');
        if (heroInput) {
            heroInput.addEventListener('input', Utils.debounce((e) => {
                const q = e.target.value.trim();
                if (q.length > 0) {
                    // Navigate to songs page with search
                    window.location.hash = `/songs?q=${encodeURIComponent(q)}`;
                }
            }, 500));

            heroInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const q = e.target.value.trim();
                    if (q) {
                        window.location.hash = `/songs?q=${encodeURIComponent(q)}`;
                    }
                }
            });
        }
    },

    async handleSearch(query) {
        const q = query.trim();
        if (q.length < 1) {
            this.hideDropdown();
            return;
        }

        try {
            const data = await Utils.fetch(`/api/songs/search?q=${encodeURIComponent(q)}`);
            this.renderResults(data.results, q);
            this.showDropdown();
        } catch (err) {
            console.error('Search error:', err);
        }
    },

    renderResults(results, query) {
        if (!this.dropdown) return;

        if (results.length === 0) {
            this.dropdown.innerHTML = `
                <div class="search-empty">
                    <i data-lucide="search-x"></i>
                    <p>No songs found for "${Utils.escapeHtml(query)}"</p>
                </div>
            `;
        } else {
            this.dropdown.innerHTML = results.map(song => {
                const title = song.matched_lang === 'te' ? (song.title_te || song.title_en) : (song.title_en || song.title_te);
                const subtitle = song.matched_lang === 'te' ? song.title_en : song.title_te;
                const preview = song.matched_lang === 'te' ? (song.preview_te || song.preview_en) : (song.preview_en || song.preview_te);
                const badge = song.matched_lang === 'te' ? 'TE' : 'EN';
                const badgeClass = song.matched_lang === 'te' ? 'badge-te' : 'badge-en';

                return `
                    <div class="search-result-item" onclick="window.location.hash='/songs/${song.slug}'">
                        <div class="search-result-icon"><i data-lucide="music"></i></div>
                        <div class="search-result-info">
                            <div class="search-result-title">${this.highlight(Utils.escapeHtml(title), query)}</div>
                            ${subtitle ? `<div class="search-result-preview">${Utils.escapeHtml(subtitle)}</div>` : ''}
                            ${preview ? `<div class="search-result-preview">${Utils.escapeHtml(Utils.truncate(preview, 60))}</div>` : ''}
                        </div>
                        <span class="search-result-badge ${badgeClass}">${badge}</span>
                    </div>
                `;
            }).join('');
        }

        if (window.lucide) lucide.createIcons();
    },

    highlight(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    showDropdown() {
        if (this.dropdown) {
            this.dropdown.classList.add('active');
            this.isOpen = true;
        }
    },

    hideDropdown() {
        if (this.dropdown) {
            this.dropdown.classList.remove('active');
            this.isOpen = false;
        }
    }
};
