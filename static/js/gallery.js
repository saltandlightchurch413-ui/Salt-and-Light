/* ═══════════════════════════════════════════════════════
   GALLERY — Masonry layout with lightbox
   ═══════════════════════════════════════════════════════ */

const Gallery = {
    async render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="gallery-page page-enter">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Church Gallery</h1>
                        <p class="section-subtitle">Memories and moments from our community</p>
                    </div>
                </div>
                <div class="gallery-grid" id="gallery-grid">${Utils.skeleton(6)}</div>
            </div>
        `;

        try {
            const data = await Utils.fetch('/api/gallery?per_page=50');
            const grid = document.getElementById('gallery-grid');

            if (data.images.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="column-span: all;">
                        <i data-lucide="image"></i>
                        <h3>No images yet</h3>
                        <p>Gallery images will appear here.</p>
                    </div>
                `;
            } else {
                grid.innerHTML = data.images.map(img => `
                    <div class="gallery-item" onclick="Gallery.openLightbox('${img.url}', '${Utils.escapeHtml(img.caption || '')}')">
                        <img src="${img.url}" alt="${Utils.escapeHtml(img.caption || 'Church image')}" loading="lazy">
                        ${img.caption ? `
                            <div class="gallery-item-overlay">
                                <div class="gallery-item-caption">${Utils.escapeHtml(img.caption)}</div>
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }

            if (window.lucide) lucide.createIcons();
        } catch (err) {
            document.getElementById('gallery-grid').innerHTML = `
                <div class="empty-state"><h3>Failed to load gallery</h3><p>${err.message}</p></div>
            `;
        }
    },

    openLightbox(url, caption) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <button class="lightbox-close" onclick="this.closest('.lightbox').remove()">
                <i data-lucide="x"></i>
            </button>
            <img src="${url}" alt="${caption}">
        `;
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.remove();
        });
        document.body.appendChild(lightbox);
        if (window.lucide) lucide.createIcons({ nodes: [lightbox] });

        // Escape to close
        const handler = (e) => {
            if (e.key === 'Escape') {
                lightbox.remove();
                document.removeEventListener('keydown', handler);
            }
        };
        document.addEventListener('keydown', handler);
    }
};
