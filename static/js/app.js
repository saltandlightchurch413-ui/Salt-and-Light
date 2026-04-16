/* ═══════════════════════════════════════════════════════
   APP — SPA Router & Main Controller
   ═══════════════════════════════════════════════════════ */

const App = {
    init() {
        // Initialize search
        Search.init();

        // Mobile menu
        this.initMobileMenu();

        // Navbar scroll effect
        this.initScrollEffect();

        // Load logo
        this.loadLogo();

        // Initialize router
        window.addEventListener('hashchange', () => this.route());

        // Handle initial route
        this.route();

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen')?.classList.add('hidden');
        }, 600);

        // Initialize icons
        if (window.lucide) lucide.createIcons();
    },

    initMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const overlay = document.getElementById('mobile-menu-overlay');
        const closeBtn = document.getElementById('mobile-close-btn');

        btn?.addEventListener('click', () => overlay?.classList.add('active'));
        closeBtn?.addEventListener('click', () => overlay?.classList.remove('active'));
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });

        // Close on nav link click
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => overlay?.classList.remove('active'));
        });
    },

    initScrollEffect() {
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                navbar?.classList.add('scrolled');
            } else {
                navbar?.classList.remove('scrolled');
            }
        });
    },

    async loadLogo() {
        try {
            const data = await Utils.fetch('/api/about');
            if (data.about.logo_url) {
                const navContainer = document.getElementById('brand-logo-container');
                if (navContainer) {
                    navContainer.innerHTML = `<img src="${data.about.logo_url}" alt="Church Logo">`;
                }
                const footerContainer = document.getElementById('footer-logo-container');
                if (footerContainer) {
                    footerContainer.innerHTML = `<img src="${data.about.logo_url}" alt="Church Logo">`;
                }
            }
        } catch {}
    },

    /**
     * Hash-based router.
     */
    async route() {
        const hash = window.location.hash.slice(1) || '/';
        const [path, queryString] = hash.split('?');
        const params = Object.fromEntries(new URLSearchParams(queryString || ''));

        // Update active nav link
        this.updateActiveNav(path);

        // Scroll to top
        window.scrollTo(0, 0);

        // Close search dropdown
        Search.hideDropdown();

        // Handle Back button visibility
        const backBtn = document.getElementById('nav-back-btn');
        if (backBtn) {
            if (path === '/' || path === '') {
                backBtn.style.display = 'none';
            } else {
                backBtn.style.display = 'flex';
            }
        }

        // Route
        if (path === '/' || path === '') {
            this.renderHome();
        } else if (path === '/songs' && !path.includes('/songs/')) {
            Songs.renderSongList(params);
        } else if (path.startsWith('/songs/')) {
            const slug = path.replace('/songs/', '');
            Songs.renderSongDetail(slug);
        } else if (path === '/index') {
            Songs.renderIndex();
        } else if (path === '/gallery') {
            Gallery.render();
        } else if (path === '/about') {
            this.renderAbout();
        } else if (path === '/admin') {
            const isAuth = await Admin.checkAuth();
            if (isAuth) {
                Admin.renderDashboard(params.tab);
            } else {
                Admin.renderLogin();
            }
        } else {
            this.renderNotFound();
        }
    },

    updateActiveNav(path) {
        let page = 'home';
        if (path.startsWith('/songs')) page = 'songs';
        else if (path === '/index') page = 'index';
        else if (path === '/gallery') page = 'gallery';
        else if (path === '/about') page = 'about';
        else if (path === '/admin') page = 'admin';

        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    },

    /**
     * RENDER: Home Page
     */
    async renderHome() {
        const app = document.getElementById('app');

        // Get song count for hero stats
        let totalSongs = 0;
        let totalCategories = 0;
        try {
            const songsData = await Utils.fetch('/api/songs?per_page=1');
            totalSongs = songsData.total;
            const catData = await Utils.fetch('/api/categories');
            totalCategories = catData.categories.length;
        } catch {}

        app.innerHTML = `
            <!-- Hero Section -->
            <section class="hero">
                <div class="hero-content">
                    <h1>Find Songs Instantly</h1>
                    <p>Telugu & English worship songs at your fingertips</p>

                    <div class="hero-search">
                        <div class="hero-search-icon"><i data-lucide="search"></i></div>
                        <input type="text" id="hero-search-input" class="hero-search-input" placeholder="Search songs in Telugu or English..." autocomplete="off">
                        <button class="hero-search-btn" onclick="const q=document.getElementById('hero-search-input').value.trim(); if(q) window.location.hash='/songs?q='+encodeURIComponent(q);">
                            <i data-lucide="arrow-right"></i>
                        </button>
                    </div>

                    <div class="hero-stats">
                        <div class="hero-stat">
                            <div class="hero-stat-value">${totalSongs}</div>
                            <div class="hero-stat-label">Songs</div>
                        </div>
                        <div class="hero-stat">
                            <div class="hero-stat-value">${totalCategories}</div>
                            <div class="hero-stat-label">Categories</div>
                        </div>
                        <div class="hero-stat">
                            <div class="hero-stat-value">2</div>
                            <div class="hero-stat-label">Languages</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Quick Access -->
            <section class="section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Quick Access</h2>
                        <p class="section-subtitle">Find what you need</p>
                    </div>
                </div>
                <div class="quick-cards">
                    <div class="quick-card" onclick="window.location.hash='/songs'">
                        <div class="quick-card-icon purple"><i data-lucide="music"></i></div>
                        <h3 class="quick-card-title">Browse Songs</h3>
                        <p class="quick-card-desc">Explore all worship songs</p>
                    </div>
                    <div class="quick-card" onclick="window.location.hash='/index'">
                        <div class="quick-card-icon orange"><i data-lucide="list-ordered"></i></div>
                        <h3 class="quick-card-title">Song Index</h3>
                        <p class="quick-card-desc">A–Z & Telugu alphabetical index</p>
                    </div>
                    <div class="quick-card" onclick="window.location.hash='/gallery'">
                        <div class="quick-card-icon green"><i data-lucide="image"></i></div>
                        <h3 class="quick-card-title">Church Gallery</h3>
                        <p class="quick-card-desc">Photos and memories</p>
                    </div>
                    <div class="quick-card" onclick="window.location.hash='/about'">
                        <div class="quick-card-icon blue"><i data-lucide="info"></i></div>
                        <h3 class="quick-card-title">About Us</h3>
                        <p class="quick-card-desc">Learn about our church</p>
                    </div>
                </div>
            </section>

            <!-- Recent Songs -->
            <section class="section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Recently Added</h2>
                        <p class="section-subtitle">Newest songs in the collection</p>
                    </div>
                    <a href="#/songs" class="section-link">View All <i data-lucide="arrow-right"></i></a>
                </div>
                <div class="recent-songs-scroll" id="recent-songs">${Utils.skeleton(3)}</div>
            </section>

            <!-- Follow Us -->
            <section class="social-links-section" id="home-social-section"></section>
        `;

        if (window.lucide) lucide.createIcons();

        // Init hero search
        Search.initHeroSearch();

        // Load recent songs
        this.loadRecentSongs();

        // Load social links
        this.loadHomeSocialLinks();
    },

    async loadRecentSongs() {
        try {
            const data = await Utils.fetch('/api/songs/recent?limit=10');
            const container = document.getElementById('recent-songs');
            if (!container) return;

            if (data.songs.length === 0) {
                container.innerHTML = `<div class="empty-state" style="width:100%;"><p>No songs yet. Add some from the admin dashboard!</p></div>`;
            } else {
                container.innerHTML = data.songs.map(song => {
                    const title = song.title_en || song.title_te || 'Untitled';
                    const preview = song.preview_te || song.preview_en || '';
                    const category = song.category ? song.category.name : '';

                    return `
                        <div class="recent-song-card" onclick="window.location.hash='/songs/${song.slug}'">
                            <div class="recent-song-title">${Utils.escapeHtml(title)}</div>
                            ${song.title_te && song.title_en ? `<div class="recent-song-title telugu-text" style="font-size:0.85rem;color:var(--text-secondary);">${Utils.escapeHtml(song.title_te)}</div>` : ''}
                            <div class="recent-song-preview">${Utils.escapeHtml(Utils.truncate(preview, 60))}</div>
                            <div class="recent-song-meta">
                                ${category ? `<span class="song-category-tag">${Utils.escapeHtml(category)}</span>` : '<span></span>'}
                                <span style="font-size:0.75rem;color:var(--text-muted);">${Utils.formatDate(song.created_at)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch {}
    },

    async loadHomeSocialLinks() {
        try {
            const data = await Utils.fetch('/api/social-links');
            const container = document.getElementById('home-social-section');
            if (!container || data.links.length === 0) return;

            container.innerHTML = `
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Follow Us</h2>
                        <p class="section-subtitle">Stay connected with our community</p>
                    </div>
                </div>
                <div class="footer-links" style="margin-top: var(--space-lg);">
                    ${data.links.map(link => `
                        <a href="${Utils.ensureAbsoluteUrl(link.url)}" target="_blank" rel="noopener" class="footer-link" title="${Utils.escapeHtml(link.platform)}">
                            ${Utils.getSocialIconSVG(link.platform)}
                        </a>
                    `).join('')}
                </div>
            `;

            if (window.lucide) lucide.createIcons();
        } catch {}
    },

    /**
     * RENDER: About Page
     */
    async renderAbout() {
        const app = document.getElementById('app');
        app.innerHTML = `<div class="about-page page-enter">${Utils.skeleton(2)}</div>`;

        try {
            const data = await Utils.fetch('/api/about');
            const about = data.about;

            app.innerHTML = `
                <div class="about-page page-enter">
                    <div class="about-card">
                        ${about.logo_url ? `<img src="${about.logo_url}" alt="Church Logo" class="about-logo">` : ''}
                        <h1 class="about-title">${Utils.escapeHtml(about.title || 'About Our Church')}</h1>
                        <div class="about-content">
                            ${about.content ? about.content.split('\n').map(p => `<p>${Utils.escapeHtml(p)}</p>`).join('') : '<p>Welcome to our church.</p>'}
                        </div>
                        
                        ${(about.location || about.service_times) ? `
                        <div class="about-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-xl); margin-top: var(--space-2xl); border-top: 1px solid var(--surface-border); padding-top: var(--space-xl);">
                            ${about.location ? `
                            <div class="info-block">
                                <h3 style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);color:var(--primary);"><i data-lucide="map-pin"></i> Location</h3>
                                <p style="color:var(--text-secondary);">${Utils.escapeHtml(about.location)}</p>
                            </div>
                            ` : ''}
                            
                            ${about.service_times ? `
                            <div class="info-block">
                                <h3 style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);color:var(--primary);"><i data-lucide="clock"></i> Service Times</h3>
                                ${about.service_times.split('\n').map(time => `<p style="color:var(--text-secondary);margin-bottom:var(--space-xs);">${Utils.escapeHtml(time)}</p>`).join('')}
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } catch (err) {
            app.innerHTML = `<div class="about-page"><div class="empty-state"><h3>Could not load about page</h3><p>${err.message}</p></div></div>`;
        }
    },

    /**
     * RENDER: 404 Page
     */
    renderNotFound() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-page page-enter">
                <div class="empty-state">
                    <i data-lucide="map-pin-off"></i>
                    <h3>Page Not Found</h3>
                    <p>The page you're looking for doesn't exist.</p>
                    <a href="#/" class="btn btn-primary mt-lg"><i data-lucide="home"></i> Go Home</a>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
};


/* ─── Boot ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
