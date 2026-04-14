/* ═══════════════════════════════════════════════════════
   ADMIN — Dashboard, CRUD, login
   ═══════════════════════════════════════════════════════ */

const Admin = {
    isAuthenticated: false,
    currentTab: 'songs',

    async checkAuth() {
        try {
            const data = await Utils.fetch('/api/auth/status');
            this.isAuthenticated = data.authenticated;
            return data.authenticated;
        } catch {
            this.isAuthenticated = false;
            return false;
        }
    },

    /** RENDER: Login Page */
    renderLogin() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-page page-enter">
                <div class="login-card">
                    <div class="login-header">
                        <div class="login-icon"><i data-lucide="shield"></i></div>
                        <h1 class="login-title">Admin Login</h1>
                        <p class="login-subtitle">Sign in to manage the songbook</p>
                    </div>
                    <form id="login-form">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="login-email" required placeholder="admin@example.com" autocomplete="email">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <div style="position:relative;">
                                <input type="password" class="form-input" id="login-password" required placeholder="••••••••" autocomplete="current-password" style="padding-right: 40px;">
                                <button type="button" onclick="Admin.togglePassword('login-password', this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;">
                                    <i data-lucide="eye"></i>
                                </button>
                            </div>
                        </div>
                        <div class="form-group">
                            <p class="form-error hidden" id="login-error"></p>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg btn-full">
                            <i data-lucide="log-in"></i> Sign In
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            try {
                await Utils.fetch('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });
                this.isAuthenticated = true;
                Utils.toast('Welcome back!', 'success');
                if (window.location.hash === '#/admin') {
                    App.route();
                } else {
                    window.location.hash = '/admin';
                }
            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.classList.remove('hidden');
            }
        });

        if (window.lucide) lucide.createIcons();
    },

    /** RENDER: Dashboard */
    async renderDashboard(tab) {
        this.currentTab = tab || 'songs';
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="admin-layout page-enter">
                <aside class="admin-sidebar">
                    <div class="admin-sidebar-header"><i data-lucide="settings"></i> Dashboard</div>
                    <button class="admin-nav-btn ${this.currentTab === 'songs' ? 'active' : ''}" onclick="Admin.switchTab('songs')"><i data-lucide="music"></i> Songs</button>
                    <button class="admin-nav-btn ${this.currentTab === 'categories' ? 'active' : ''}" onclick="Admin.switchTab('categories')"><i data-lucide="tag"></i> Categories</button>
                    <button class="admin-nav-btn ${this.currentTab === 'images' ? 'active' : ''}" onclick="Admin.switchTab('images')"><i data-lucide="image"></i> Gallery</button>
                    <button class="admin-nav-btn ${this.currentTab === 'social' ? 'active' : ''}" onclick="Admin.switchTab('social')"><i data-lucide="share-2"></i> Social Links</button>
                    <button class="admin-nav-btn ${this.currentTab === 'about' ? 'active' : ''}" onclick="Admin.switchTab('about')"><i data-lucide="info"></i> About</button>
                    <button class="admin-nav-btn ${this.currentTab === 'logo' ? 'active' : ''}" onclick="Admin.switchTab('logo')"><i data-lucide="image-plus"></i> Logo</button>
                    <button class="admin-nav-btn ${this.currentTab === 'settings' ? 'active' : ''}" onclick="Admin.switchTab('settings')"><i data-lucide="lock"></i> Settings</button>
                    <button class="admin-nav-btn logout" onclick="Admin.logout()"><i data-lucide="log-out"></i> Logout</button>
                </aside>
                <div class="admin-main" id="admin-content"></div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        this.loadTab(this.currentTab);
    },

    switchTab(tab) {
        this.currentTab = tab;
        // Update sidebar active state
        document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
        const btns = document.querySelectorAll('.admin-nav-btn');
        btns.forEach(b => {
            if (b.textContent.trim().toLowerCase().includes(tab === 'social' ? 'social' : tab === 'logo' ? 'logo' : tab)) {
                b.classList.add('active');
            }
        });
        this.loadTab(tab);
    },

    async loadTab(tab) {
        const content = document.getElementById('admin-content');
        if (!content) return;

        switch (tab) {
            case 'songs': await this.loadSongsTab(content); break;
            case 'categories': await this.loadCategoriesTab(content); break;
            case 'images': await this.loadImagesTab(content); break;
            case 'social': await this.loadSocialTab(content); break;
            case 'about': await this.loadAboutTab(content); break;
            case 'logo': await this.loadLogoTab(content); break;
            case 'settings': await this.loadSettingsTab(content); break;
        }
    },

    // ─── SONGS TAB ──────────────────────────
    async loadSongsTab(container) {
        container.innerHTML = `
            <div class="admin-panel-header">
                <h2 class="admin-panel-title">Manage Songs</h2>
                <button class="btn btn-primary" onclick="Admin.showSongForm()"><i data-lucide="plus"></i> Add Song</button>
            </div>
            <div id="admin-songs-list">${Utils.skeleton(4)}</div>
        `;
        if (window.lucide) lucide.createIcons({ nodes: [container] });

        try {
            const data = await Utils.fetch('/api/admin/songs?per_page=100');
            const listEl = document.getElementById('admin-songs-list');

            if (data.songs.length === 0) {
                listEl.innerHTML = `<div class="empty-state"><i data-lucide="music"></i><h3>No songs yet</h3><p>Click "Add Song" to create one.</p></div>`;
            } else {
                listEl.innerHTML = `
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead><tr><th>Title (EN)</th><th>Title (TE)</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${data.songs.map(s => `
                                    <tr>
                                        <td>${Utils.escapeHtml(s.title_en || '—')}</td>
                                        <td class="telugu-text">${Utils.escapeHtml(s.title_te || '—')}</td>
                                        <td>${s.category ? Utils.escapeHtml(s.category.name) : '—'}</td>
                                        <td>${Utils.formatDate(s.created_at)}</td>
                                        <td>
                                            <div class="table-actions">
                                                <button class="table-action-btn edit" onclick="Admin.editSong(${s.id})"><i data-lucide="pencil"></i></button>
                                                <button class="table-action-btn delete" onclick="Admin.deleteSong(${s.id}, '${Utils.escapeHtml(s.title_en || s.title_te)}')"><i data-lucide="trash-2"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            document.getElementById('admin-songs-list').innerHTML = `<p class="text-center">${err.message}</p>`;
        }
    },

    async showSongForm(songData = null) {
        let categories = [];
        try {
            const catData = await Utils.fetch('/api/categories');
            categories = catData.categories;
        } catch {}

        const isEdit = !!songData;
        const title = isEdit ? 'Edit Song' : 'Add New Song';

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width:640px;">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <form id="song-form">
                        <div class="form-group">
                            <label class="form-label">Title (English)</label>
                            <input type="text" class="form-input" id="song-title-en" value="${Utils.escapeHtml(songData?.title_en || '')}" placeholder="Enter English title">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Title (Telugu)</label>
                            <input type="text" class="form-input" id="song-title-te" value="${Utils.escapeHtml(songData?.title_te || '')}" placeholder="తెలుగు శీర్షిక">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select class="form-select" id="song-category">
                                <option value="">No Category</option>
                                ${categories.map(c => `<option value="${c.id}" ${songData?.category?.id === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Lyrics (English)</label>
                            <textarea class="form-textarea lyrics" id="song-lyrics-en" placeholder="Enter English lyrics...">${Utils.escapeHtml(songData?.lyrics_en || '')}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Lyrics (Telugu)</label>
                            <textarea class="form-textarea lyrics" id="song-lyrics-te" placeholder="తెలుగు సాహిత్యం...">${Utils.escapeHtml(songData?.lyrics_te || '')}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" id="song-submit-btn">${isEdit ? 'Update' : 'Create'} Song</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons({ nodes: [modal] });

        document.getElementById('song-submit-btn').addEventListener('click', async () => {
            const payload = {
                title_en: document.getElementById('song-title-en').value,
                title_te: document.getElementById('song-title-te').value,
                category_id: document.getElementById('song-category').value || null,
                lyrics_en: document.getElementById('song-lyrics-en').value,
                lyrics_te: document.getElementById('song-lyrics-te').value,
            };

            if (!payload.title_en && !payload.title_te) {
                Utils.toast('At least one title is required', 'error');
                return;
            }

            try {
                if (isEdit) {
                    await Utils.fetch(`/api/admin/songs/${songData.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload),
                    });
                    Utils.toast('Song updated!', 'success');
                } else {
                    await Utils.fetch('/api/admin/songs', {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    });
                    Utils.toast('Song created!', 'success');
                }
                modal.remove();
                this.loadSongsTab(document.getElementById('admin-content'));
            } catch (err) {
                Utils.toast(err.message, 'error');
            }
        });
    },

    async editSong(id) {
        try {
            const songs = await Utils.fetch(`/api/admin/songs`);
            const song = songs.songs.find(s => s.id === id);
            if (song) {
                // Get full song with lyrics
                const full = await Utils.fetch(`/api/songs/${song.slug}`);
                this.showSongForm(full.song);
            }
        } catch (err) {
            Utils.toast(err.message, 'error');
        }
    },

    async deleteSong(id, title) {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await Utils.fetch(`/api/admin/songs/${id}`, { method: 'DELETE' });
            Utils.toast('Song deleted', 'success');
            this.loadSongsTab(document.getElementById('admin-content'));
        } catch (err) {
            Utils.toast(err.message, 'error');
        }
    },

    // ─── CATEGORIES TAB ─────────────────────
    async loadCategoriesTab(container) {
        container.innerHTML = `
            <div class="admin-panel-header">
                <h2 class="admin-panel-title">Manage Categories</h2>
                <button class="btn btn-primary" onclick="Admin.showCategoryForm()"><i data-lucide="plus"></i> Add Category</button>
            </div>
            <div id="admin-cat-list">${Utils.skeleton(3)}</div>
        `;
        if (window.lucide) lucide.createIcons({ nodes: [container] });

        try {
            const data = await Utils.fetch('/api/categories');
            const list = document.getElementById('admin-cat-list');

            list.innerHTML = `
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead><tr><th>Name (EN)</th><th>Name (TE)</th><th>Songs</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${data.categories.map(c => `
                                <tr>
                                    <td>${Utils.escapeHtml(c.name)}</td>
                                    <td class="telugu-text">${Utils.escapeHtml(c.name_te || '—')}</td>
                                    <td>${c.song_count}</td>
                                    <td>
                                        <div class="table-actions">
                                            <button class="table-action-btn edit" onclick="Admin.showCategoryForm({id:${c.id},name:'${Utils.escapeHtml(c.name)}',name_te:'${Utils.escapeHtml(c.name_te || '')}'})"><i data-lucide="pencil"></i></button>
                                            <button class="table-action-btn delete" onclick="Admin.deleteCategory(${c.id}, '${Utils.escapeHtml(c.name)}')"><i data-lucide="trash-2"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            document.getElementById('admin-cat-list').innerHTML = `<p>${err.message}</p>`;
        }
    },

    showCategoryForm(catData = null) {
        const isEdit = !!catData;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? 'Edit' : 'Add'} Category</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Name (English)</label>
                        <input type="text" class="form-input" id="cat-name" value="${Utils.escapeHtml(catData?.name || '')}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Name (Telugu)</label>
                        <input type="text" class="form-input" id="cat-name-te" value="${Utils.escapeHtml(catData?.name_te || '')}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" id="cat-submit">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons({ nodes: [modal] });

        document.getElementById('cat-submit').addEventListener('click', async () => {
            const payload = {
                name: document.getElementById('cat-name').value.trim(),
                name_te: document.getElementById('cat-name-te').value.trim(),
            };
            if (!payload.name) { Utils.toast('Name is required', 'error'); return; }

            try {
                if (isEdit) {
                    await Utils.fetch(`/api/admin/categories/${catData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                } else {
                    await Utils.fetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
                }
                Utils.toast(`Category ${isEdit ? 'updated' : 'created'}!`, 'success');
                modal.remove();
                this.loadCategoriesTab(document.getElementById('admin-content'));
            } catch (err) { Utils.toast(err.message, 'error'); }
        });
    },

    async deleteCategory(id, name) {
        if (!confirm(`Delete category "${name}"?`)) return;
        try {
            await Utils.fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
            Utils.toast('Category deleted', 'success');
            this.loadCategoriesTab(document.getElementById('admin-content'));
        } catch (err) { Utils.toast(err.message, 'error'); }
    },

    // ─── IMAGES TAB ─────────────────────────
    async loadImagesTab(container) {
        container.innerHTML = `
            <div class="admin-panel-header">
                <h2 class="admin-panel-title">Gallery Images</h2>
                <button class="btn btn-primary" onclick="Admin.showImageUpload()"><i data-lucide="upload"></i> Upload Image</button>
            </div>
            <div class="gallery-grid" id="admin-gallery">${Utils.skeleton(4)}</div>
        `;
        if (window.lucide) lucide.createIcons({ nodes: [container] });

        try {
            const data = await Utils.fetch('/api/gallery?per_page=50');
            const grid = document.getElementById('admin-gallery');

            if (data.images.length === 0) {
                grid.innerHTML = `<div class="empty-state"><i data-lucide="image"></i><h3>No images</h3></div>`;
            } else {
                grid.innerHTML = data.images.map(img => `
                    <div class="gallery-item" style="position:relative;">
                        <img src="${img.url}" alt="${Utils.escapeHtml(img.caption || '')}" loading="lazy">
                        <div class="gallery-item-overlay" style="opacity:1;background:linear-gradient(to top, rgba(0,0,0,0.7), transparent 60%);">
                            <div style="width:100%;display:flex;justify-content:space-between;align-items:flex-end;">
                                <span class="gallery-item-caption">${Utils.escapeHtml(img.caption || '')}</span>
                                <button class="btn btn-danger btn-sm" onclick="Admin.deleteImage(${img.id})"><i data-lucide="trash-2"></i></button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            document.getElementById('admin-gallery').innerHTML = `<p>${err.message}</p>`;
        }
    },

    showImageUpload() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Upload Image</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Image</label>
                        <input type="file" class="form-input" id="img-file" accept="image/*" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Caption (optional)</label>
                        <input type="text" class="form-input" id="img-caption" placeholder="Describe this image">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" id="img-submit">Upload</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons({ nodes: [modal] });

        document.getElementById('img-submit').addEventListener('click', async () => {
            const file = document.getElementById('img-file').files[0];
            if (!file) { Utils.toast('Select an image', 'error'); return; }

            const formData = new FormData();
            formData.append('image', file);
            formData.append('caption', document.getElementById('img-caption').value.trim());

            try {
                await Utils.fetchForm('/api/admin/images', formData);
                Utils.toast('Image uploaded!', 'success');
                modal.remove();
                this.loadImagesTab(document.getElementById('admin-content'));
            } catch (err) { Utils.toast(err.message, 'error'); }
        });
    },

    async deleteImage(id) {
        if (!confirm('Delete this image?')) return;
        try {
            await Utils.fetch(`/api/admin/images/${id}`, { method: 'DELETE' });
            Utils.toast('Image deleted', 'success');
            this.loadImagesTab(document.getElementById('admin-content'));
        } catch (err) { Utils.toast(err.message, 'error'); }
    },

    // ─── SOCIAL LINKS TAB ───────────────────
    async loadSocialTab(container) {
        container.innerHTML = `
            <div class="admin-panel-header">
                <h2 class="admin-panel-title">Social Links</h2>
                <button class="btn btn-primary" onclick="Admin.showSocialForm()"><i data-lucide="plus"></i> Add Link</button>
            </div>
            <div id="admin-social-list">${Utils.skeleton(3)}</div>
        `;
        if (window.lucide) lucide.createIcons({ nodes: [container] });

        try {
            const data = await Utils.fetch('/api/social-links');
            const list = document.getElementById('admin-social-list');

            if (data.links.length === 0) {
                list.innerHTML = `<div class="empty-state"><i data-lucide="share-2"></i><h3>No social links</h3></div>`;
            } else {
                list.innerHTML = `
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead><tr><th>Platform</th><th>URL</th><th>Icon</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${data.links.map(l => `
                                    <tr>
                                        <td>${Utils.escapeHtml(l.platform)}</td>
                                        <td><a href="${l.url}" target="_blank" style="color:var(--primary);">${Utils.truncate(l.url, 40)}</a></td>
                                        <td><i data-lucide="${Utils.getSocialIcon(l.platform)}"></i></td>
                                        <td>
                                            <div class="table-actions">
                                                <button class="table-action-btn edit" onclick='Admin.showSocialForm(${JSON.stringify(l)})'><i data-lucide="pencil"></i></button>
                                                <button class="table-action-btn delete" onclick="Admin.deleteSocial(${l.id})"><i data-lucide="trash-2"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            document.getElementById('admin-social-list').innerHTML = `<p>${err.message}</p>`;
        }
    },

    showSocialForm(linkData = null) {
        const isEdit = !!linkData;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? 'Edit' : 'Add'} Social Link</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Platform</label>
                        <select class="form-select" id="social-platform">
                            ${['YouTube','Facebook','Instagram','Twitter','WhatsApp','Telegram','Website','Other'].map(p =>
                                `<option value="${p}" ${linkData?.platform === p ? 'selected' : ''}>${p}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL</label>
                        <input type="url" class="form-input" id="social-url" value="${Utils.escapeHtml(linkData?.url || '')}" required placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Display Order</label>
                        <input type="number" class="form-input" id="social-order" value="${linkData?.order || 0}" min="0">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" id="social-submit">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons({ nodes: [modal] });

        document.getElementById('social-submit').addEventListener('click', async () => {
            const platform = document.getElementById('social-platform').value;
            const url = document.getElementById('social-url').value.trim();
            const order = parseInt(document.getElementById('social-order').value) || 0;

            if (!url) { Utils.toast('URL is required', 'error'); return; }

            const payload = { platform, url, icon: Utils.getSocialIcon(platform), order };

            try {
                if (isEdit) {
                    await Utils.fetch(`/api/admin/social-links/${linkData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                } else {
                    await Utils.fetch('/api/admin/social-links', { method: 'POST', body: JSON.stringify(payload) });
                }
                Utils.toast(`Link ${isEdit ? 'updated' : 'added'}!`, 'success');
                modal.remove();
                this.loadSocialTab(document.getElementById('admin-content'));
            } catch (err) { Utils.toast(err.message, 'error'); }
        });
    },

    async deleteSocial(id) {
        if (!confirm('Delete this link?')) return;
        try {
            await Utils.fetch(`/api/admin/social-links/${id}`, { method: 'DELETE' });
            Utils.toast('Link deleted', 'success');
            this.loadSocialTab(document.getElementById('admin-content'));
        } catch (err) { Utils.toast(err.message, 'error'); }
    },

    // ─── ABOUT TAB ──────────────────────────
    async loadAboutTab(container) {
        container.innerHTML = `
            <div class="admin-panel-header">
                <h2 class="admin-panel-title">About Content</h2>
            </div>
            <div id="about-form-area">${Utils.skeleton(2)}</div>
        `;

        try {
            const data = await Utils.fetch('/api/about');
            const about = data.about;
            const area = document.getElementById('about-form-area');

            area.innerHTML = `
                <div style="background:var(--surface);border-radius:var(--radius-lg);padding:var(--space-xl);border:1px solid var(--surface-border);">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" class="form-input" id="about-title" value="${Utils.escapeHtml(about.title || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Content</label>
                        <textarea class="form-textarea" id="about-content" style="min-height:200px;">${Utils.escapeHtml(about.content || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Location (Address/Map Link)</label>
                        <input type="text" class="form-input" id="about-location" value="${Utils.escapeHtml(about.location || '')}" placeholder="Church Address or Google Maps Link">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Service Times</label>
                        <textarea class="form-textarea" id="about-service-times" style="min-height:100px;" placeholder="e.g. Sunday Service: 10:00 AM">${Utils.escapeHtml(about.service_times || '')}</textarea>
                    </div>
                    <button class="btn btn-primary" id="about-save"><i data-lucide="save"></i> Save Changes</button>
                </div>
            `;
            if (window.lucide) lucide.createIcons({ nodes: [area] });

            document.getElementById('about-save').addEventListener('click', async () => {
                try {
                    await Utils.fetch('/api/admin/about', {
                        method: 'PUT',
                        body: JSON.stringify({
                            title: document.getElementById('about-title').value,
                            content: document.getElementById('about-content').value,
                            location: document.getElementById('about-location').value,
                            service_times: document.getElementById('about-service-times').value,
                        }),
                    });
                    Utils.toast('About content updated!', 'success');
                } catch (err) { Utils.toast(err.message, 'error'); }
            });
        } catch (err) {
            document.getElementById('about-form-area').innerHTML = `<p>${err.message}</p>`;
        }
    },

    // ─── LOGO TAB ───────────────────────────
    async loadLogoTab(container) {
        container.innerHTML = `
            <div class="admin-panel-header">
                <h2 class="admin-panel-title">Church Logo</h2>
            </div>
            <div id="logo-area">${Utils.skeleton(1)}</div>
        `;

        try {
            const data = await Utils.fetch('/api/about');
            const area = document.getElementById('logo-area');

            area.innerHTML = `
                <div style="background:var(--surface);border-radius:var(--radius-lg);padding:var(--space-xl);border:1px solid var(--surface-border);text-align:center;">
                    ${data.about.logo_url ?
                        `<img src="${data.about.logo_url}" alt="Church Logo" style="width:150px;height:150px;object-fit:cover;border-radius:var(--radius-xl);margin:0 auto var(--space-xl);box-shadow:var(--shadow-md);">` :
                        `<div style="width:150px;height:150px;background:var(--bg);border-radius:var(--radius-xl);margin:0 auto var(--space-xl);display:flex;align-items:center;justify-content:center;"><i data-lucide="image" style="width:48px;height:48px;color:var(--text-muted);"></i></div>`
                    }
                    <div class="form-group" style="max-width:400px;margin:0 auto;">
                        <input type="file" class="form-input" id="logo-file" accept="image/*">
                    </div>
                    <button class="btn btn-primary mt-md" id="logo-upload"><i data-lucide="upload"></i> Upload Logo</button>
                </div>
            `;
            if (window.lucide) lucide.createIcons({ nodes: [area] });

            document.getElementById('logo-upload').addEventListener('click', async () => {
                const file = document.getElementById('logo-file').files[0];
                if (!file) { Utils.toast('Select a logo file', 'error'); return; }

                const formData = new FormData();
                formData.append('logo', file);

                try {
                    await Utils.fetchForm('/api/admin/logo', formData);
                    Utils.toast('Logo updated!', 'success');
                    this.loadLogoTab(container);
                    // Update navbar logo
                    App.loadLogo();
                } catch (err) { Utils.toast(err.message, 'error'); }
            });
        } catch (err) {
            document.getElementById('logo-area').innerHTML = `<p>${err.message}</p>`;
        }
    },

    // ─── SETTINGS TAB ───────────────────────
    async loadSettingsTab(container) {
        container.innerHTML = `
            <div class="admin-panel-header">
                <h2 class="admin-panel-title">Settings</h2>
            </div>
            <div style="background:var(--surface);border-radius:var(--radius-lg);padding:var(--space-xl);border:1px solid var(--surface-border);max-width:500px;">
                <h3 style="margin-bottom:var(--space-md);">Change Password</h3>
                <form id="change-password-form">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <div style="position:relative;">
                            <input type="password" class="form-input" id="curr-password" required style="padding-right: 40px;">
                            <button type="button" onclick="Admin.togglePassword('curr-password', this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;">
                                <i data-lucide="eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <div style="position:relative;">
                            <input type="password" class="form-input" id="new-password" required minlength="6" style="padding-right: 40px;">
                            <button type="button" onclick="Admin.togglePassword('new-password', this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;">
                                <i data-lucide="eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <div style="position:relative;">
                            <input type="password" class="form-input" id="confirm-password" required minlength="6" style="padding-right: 40px;">
                            <button type="button" onclick="Admin.togglePassword('confirm-password', this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;">
                                <i data-lucide="eye"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Update Password</button>
                </form>
            </div>
        `;
        if (window.lucide) lucide.createIcons({ nodes: [container] });

        document.getElementById('change-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const currPassword = document.getElementById('curr-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                Utils.toast('New passwords do not match', 'error');
                return;
            }

            try {
                await Utils.fetch('/api/auth/update-password', {
                    method: 'PUT',
                    body: JSON.stringify({
                        current_password: currPassword,
                        new_password: newPassword
                    })
                });
                Utils.toast('Password updated successfully!', 'success');
                e.target.reset();
            } catch (err) {
                Utils.toast(err.message, 'error');
            }
        });
    },

    // ─── LOGOUT ─────────────────────────────
    async logout() {
        try {
            await Utils.fetch('/api/logout', { method: 'POST' });
            this.isAuthenticated = false;
            Utils.toast('Logged out', 'success');
            window.location.hash = '/';
        } catch (err) {
            Utils.toast(err.message, 'error');
        }
    },

    // ─── UTILS ──────────────────────────────
    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = '<i data-lucide="eye-off"></i>';
        } else {
            input.type = 'password';
            btn.innerHTML = '<i data-lucide="eye"></i>';
        }
        if (window.lucide) lucide.createIcons({ nodes: [btn] });
    }
};
