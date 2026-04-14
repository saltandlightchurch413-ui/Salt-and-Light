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
        if (window.lucide) lucide.createIcons({ nodes: [toast] });

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
     * Get social icon CSS class.
     */
    getSocialClass(platform) {
        const known = ['youtube', 'facebook', 'instagram', 'twitter', 'whatsapp'];
        const p = platform.toLowerCase();
        return known.includes(p) ? p : 'default';
    }
};
