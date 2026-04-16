/* ═══════════════════════════════════════════════════════
   UTILITIES — Shared helpers
   ═══════════════════════════════════════════════════════ */

const Utils = {
    /**
     * Fetch wrapper with error handling.
     */
    async fetch(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Request failed (${res.status})`);
            }
            return data;
        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw err;
        }
    },

    /**
     * Fetch for form data (file uploads).
     */
    async fetchForm(url, formData, method = 'POST') {
        try {
            const res = await fetch(url, { method, body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            return data;
        } catch (err) {
            throw err;
        }
    },

    /**
     * Show a toast notification.
     */
    toast(message, type = 'success', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const iconMap = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i data-lucide="${iconMap[type] || 'info'}"></i></div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Debounce function.
     */
    debounce(fn, delay = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * Format a date string.
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Escape HTML.
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Create loading skeleton.
     */
    skeleton(count = 3) {
        return Array(count).fill(0).map(() =>
            `<div class="skeleton skeleton-card"></div>`
        ).join('');
    },

    /**
     * Truncate text.
     */
    truncate(text, len = 100) {
        if (!text || text.length <= len) return text || '';
        return text.substring(0, len) + '...';
    },

    /**
     * Copy text to clipboard.
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            return true;
        }
    },

    /**
     * Share via Web Share API or fallback to copy.
     */
    async share(title, url) {
        if (navigator.share) {
            try {
                await navigator.share({ title, url });
                return true;
            } catch {
                return false;
            }
        }
        // Fallback: copy URL
        await this.copyToClipboard(url);
        this.toast('Link copied to clipboard!', 'success');
        return true;
    },

    /**
     * Get social icon name based on platform.
     */
    getSocialIcon(platform) {
        const map = {
            youtube: 'youtube',
            facebook: 'facebook',
            instagram: 'instagram',
            twitter: 'twitter',
            whatsapp: 'message-circle',
            telegram: 'send',
            email: 'mail',
            website: 'globe',
        };
        return map[platform.toLowerCase()] || 'link';
    },

    /**
     * Get social icon SVG directly.
     */
    getSocialIconSVG(platform) {
        const svgProps = 'xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
        const map = {
            youtube: `<svg ${svgProps}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`,
            facebook: `<svg ${svgProps}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`,
            instagram: `<svg ${svgProps}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
            twitter: `<svg ${svgProps}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>`,
            whatsapp: `<svg ${svgProps}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
            telegram: `<svg ${svgProps}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
            email: `<svg ${svgProps}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
            website: `<svg ${svgProps}><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
            default: `<svg ${svgProps}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
        };
        return map[platform.toLowerCase()] || map['default'];
    },

    /**
     * Get social icon CSS class.
     */
    getSocialClass(platform) {
        const known = ['youtube', 'facebook', 'instagram', 'twitter', 'whatsapp'];
        const p = platform.toLowerCase();
        return known.includes(p) ? p : 'default';
    },

    /**
     * Ensure a URL is absolute (has http:// or https://).
     */
    ensureAbsoluteUrl(url) {
        if (!url) return '';
        url = url.trim();
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return 'https://' + url;
    }
};
