// Shared utilities for IJB Innovative Ventures
const API_URL = '/api';

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toast notification system
const toastContainer = (() => {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;max-width:400px;width:calc(100% - 40px);';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(container));
  return container;
})();

function showToast(message, type = 'info', duration = 4000) {
  const toast = document.createElement('div');
  const colors = {
    success: { bg: 'rgba(0,212,170,0.12)', border: '#00D4AA', text: '#00D4AA', icon: '\u2713' },
    error: { bg: 'rgba(255,68,102,0.12)', border: '#FF4466', text: '#FF4466', icon: '\u2717' },
    warning: { bg: 'rgba(255,184,77,0.12)', border: '#FFB84D', text: '#FFB84D', icon: '\u26A0' },
    info: { bg: 'rgba(64,224,208,0.12)', border: '#40E0D0', text: '#40E0D0', icon: '\u2139' }
  };
  const c = colors[type] || colors.info;

  toast.style.cssText = `
    background:${c.bg};color:${c.text};border-left:4px solid ${c.border};
    padding:14px 40px 14px 16px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);
    backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.05);
    display:flex;align-items:center;gap:10px;font-family:Inter,sans-serif;font-size:0.95rem;
    animation:toastSlideIn 0.3s ease;position:relative;
  `;
  toast.innerHTML = `<span style="font-size:1.2rem;font-weight:bold;">${c.icon}</span><span>${escapeHtml(message)}</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = 'position:absolute;top:8px;right:10px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:inherit;opacity:0.7;line-height:1;';
  closeBtn.onclick = () => removeToast(toast);
  toast.appendChild(closeBtn);

  toastContainer.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return toast;
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.style.animation = 'toastSlideOut 0.3s ease forwards';
  setTimeout(() => toast.remove(), 300);
}

// Confirmation modal (replaces confirm())
function showConfirmModal(message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <p>${escapeHtml(message)}</p>
      <div class="confirm-actions">
        <button class="btn-secondary confirm-cancel">Cancel</button>
        <button class="btn-primary confirm-ok">Confirm</button>
      </div>
    </div>
  `;

  overlay.querySelector('.confirm-cancel').onclick = () => {
    overlay.remove();
    if (onCancel) onCancel();
  };
  overlay.querySelector('.confirm-ok').onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  });

  document.body.appendChild(overlay);
}

// Format file size
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format currency
function formatCurrency(amount) {
  return 'ZMW ' + parseFloat(amount || 0).toFixed(2);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-ZM', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// Format date with time
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-ZM', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Category icons (SVG inline)
const categoryIcons = {
  Music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  Books: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
  Art: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17.7 20.7a1 1 0 001.4-1.4L13 13l-4 4 2.3 2.3a1 1 0 001.4 0l1-1 4 2.4z"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  Videos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  Documents: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  Other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`
};

function getCategoryIcon(category) {
  return categoryIcons[category] || categoryIcons.Other;
}

// Star rating HTML
function renderStars(rating, size = '1rem') {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  let html = '';
  for (let i = 0; i < full; i++) html += `<span class="star star-full" style="font-size:${size}">&#9733;</span>`;
  if (half) html += `<span class="star star-half" style="font-size:${size}">&#9733;</span>`;
  for (let i = 0; i < empty; i++) html += `<span class="star star-empty" style="font-size:${size}">&#9734;</span>`;
  return html;
}

// Skeleton loader HTML
function renderSkeletonCards(count = 6) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="content-card skeleton-card">
        <div class="skeleton skeleton-thumbnail"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-button"></div>
      </div>
    `;
  }
  return html;
}

// Download history (localStorage)
function saveDownloadHistory(item) {
  const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
  history.unshift({
    contentId: item.contentId,
    title: item.title,
    downloadToken: item.downloadToken,
    purchaseDate: new Date().toISOString(),
    expiresAt: item.expiresAt
  });
  // Keep last 50 items
  localStorage.setItem('downloadHistory', JSON.stringify(history.slice(0, 50)));
}

function getDownloadHistory() {
  return JSON.parse(localStorage.getItem('downloadHistory') || '[]');
}

// Mobile menu toggle
function setupMobileMenu() {
  const navbar = document.querySelector('.navbar .container');
  if (!navbar) return;

  const navLinks = navbar.querySelector('.nav-links');
  if (!navLinks) return;

  // Create hamburger button
  let hamburger = navbar.querySelector('.hamburger');
  if (!hamburger) {
    hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.setAttribute('aria-label', 'Toggle menu');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    navbar.appendChild(hamburger);
  }

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('nav-open');
    hamburger.classList.toggle('active');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target)) {
      navLinks.classList.remove('nav-open');
      hamburger.classList.remove('active');
    }
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
});
