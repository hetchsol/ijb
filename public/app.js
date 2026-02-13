// IJB Innovative Ventures - Main App
let currentContent = null;
let currentTransactionRef = null;
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
  loadContent();
  setupPaymentMethodListeners();
  checkLoggedInStatus();
  setupSearchListeners();
  updateDownloadsLink();
});

// ===================== SEARCH & FILTERS =====================
function setupSearchListeners() {
  const searchButton = document.getElementById('searchButton');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const ratingFilter = document.getElementById('ratingFilter');
  const creatorLoginLink = document.getElementById('creatorLoginLink');
  const adminLoginLink = document.getElementById('adminLoginLink');
  const downloadsLink = document.getElementById('downloadsLink');

  if (searchButton) searchButton.addEventListener('click', () => { currentPage = 1; loadContent(); });
  if (searchInput) searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') { currentPage = 1; loadContent(); } });
  if (categoryFilter) categoryFilter.addEventListener('change', () => { currentPage = 1; loadContent(); });
  if (sortFilter) sortFilter.addEventListener('change', () => { currentPage = 1; loadContent(); });
  if (ratingFilter) ratingFilter.addEventListener('change', () => { currentPage = 1; loadContent(); });
  if (creatorLoginLink) creatorLoginLink.addEventListener('click', (e) => { e.preventDefault(); showCreatorLogin(); });
  if (adminLoginLink) adminLoginLink.addEventListener('click', (e) => { e.preventDefault(); showAdminLogin(); });
  if (downloadsLink) downloadsLink.addEventListener('click', (e) => { e.preventDefault(); openDownloadsModal(); });
}

// ===================== AUTH STATE =====================
function checkLoggedInStatus() {
  const creatorToken = localStorage.getItem('creatorToken');
  const adminToken = localStorage.getItem('adminToken');
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  if (creatorToken) {
    const data = JSON.parse(localStorage.getItem('creatorData') || '{}');
    navLinks.innerHTML = `
      <a href="/" class="nav-link active">Browse</a>
      <a href="#" id="downloadsLink" class="nav-link" onclick="event.preventDefault();openDownloadsModal();">My Downloads</a>
      <a href="/dashboard" class="nav-link">My Dashboard</a>
      <a href="#" onclick="logoutCreator()" class="nav-link">Logout (${escapeHtml(data.username || 'Creator')})</a>
    `;
  } else if (adminToken) {
    navLinks.innerHTML = `
      <a href="/" class="nav-link active">Browse</a>
      <a href="/admin" class="nav-link">Admin Dashboard</a>
      <a href="#" onclick="logoutAdmin()" class="nav-link">Logout (Admin)</a>
    `;
  }
  setupMobileMenu();
}

// ===================== LOAD CONTENT =====================
async function loadContent() {
  const contentGrid = document.getElementById('contentGrid');
  contentGrid.innerHTML = renderSkeletonCards(6);

  try {
    const search = document.getElementById('searchInput')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const sort = document.getElementById('sortFilter')?.value || 'newest';
    const minPrice = document.getElementById('minPrice')?.value || '';
    const maxPrice = document.getElementById('maxPrice')?.value || '';
    const minRating = document.getElementById('ratingFilter')?.value || '';

    const params = new URLSearchParams({ search, category, sort, page: currentPage, limit: 12 });
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);

    const response = await fetch(`${API_URL}/content/browse?${params}`);
    const data = await response.json();

    const items = data.items || data;
    const totalCount = data.totalCount || items.length;
    totalPages = Math.ceil(totalCount / 12) || 1;

    if (!items || items.length === 0) {
      contentGrid.innerHTML = '<div class="loading">No content found. Check back soon!</div>';
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    contentGrid.innerHTML = items.map(item => renderContentCard(item)).join('');

    // Event handlers
    document.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPaymentModal(btn.dataset.contentId);
      });
    });

    document.querySelectorAll('.content-card[data-content-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.buy-btn') && !e.target.closest('.report-btn')) {
          showContentDetails(card.dataset.contentId);
        }
      });
    });

    document.querySelectorAll('.report-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openReportModal(btn.dataset.contentId);
      });
    });

    renderPagination();
  } catch (error) {
    contentGrid.innerHTML = '<div class="loading">Error loading content. Please try again later.</div>';
  }
}

function renderContentCard(item) {
  const icon = getCategoryIcon(item.category);
  const thumbnailHtml = item.thumbnail_path
    ? `<img src="/thumbnails/${escapeHtml(item.thumbnail_path)}" alt="${escapeHtml(item.title)}" />`
    : `<div class="category-icon">${icon}</div>`;

  const verifiedHtml = item.creator_verified
    ? `<span class="verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>`
    : '';

  const ratingHtml = item.average_rating > 0
    ? `<div class="rating-display">${renderStars(item.average_rating, '0.85rem')}<span>(${item.review_count})</span></div>`
    : '';

  return `
    <div class="content-card" data-content-id="${item.id}">
      <div class="card-thumbnail">${thumbnailHtml}</div>
      <div class="card-body">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="creator">by <a href="/profile/${escapeHtml(item.creator_username)}" onclick="event.stopPropagation();">${escapeHtml(item.creator_name)}</a>${verifiedHtml}</div>
        <div class="description">${escapeHtml(item.description || 'No description available')}</div>
        <div class="meta">
          <span class="category-badge">${escapeHtml(item.category)}</span>
          ${ratingHtml}
          <span>${item.download_count || 0} downloads</span>
        </div>
        <div class="card-footer">
          <span class="price-tag">${formatCurrency(item.price_zmw || 2)}</span>
          <button class="buy-btn" data-content-id="${item.id}">Buy & Download</button>
        </div>
        <button class="report-btn" data-content-id="${item.id}" title="Report this content">Report</button>
      </div>
    </div>
  `;
}

// ===================== PAGINATION =====================
function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }

  let html = `<button ${currentPage <= 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">Prev</button>`;

  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) html += `<button onclick="goToPage(1)">1</button><button disabled>...</button>`;
  for (let i = start; i <= end; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  if (end < totalPages) html += `<button disabled>...</button><button onclick="goToPage(${totalPages})">${totalPages}</button>`;

  html += `<button ${currentPage >= totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">Next</button>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadContent();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== CONTENT DETAILS MODAL =====================
async function showContentDetails(contentId) {
  try {
    const response = await fetch(`${API_URL}/content/${contentId}`);
    const content = await response.json();
    const icon = getCategoryIcon(content.category);

    // Load reviews
    let reviewsHtml = '';
    try {
      const revRes = await fetch(`${API_URL}/reviews/content/${contentId}`);
      const reviews = await revRes.json();
      if (reviews.length > 0) {
        reviewsHtml = `<div class="detail-reviews"><h4>Reviews (${reviews.length})</h4>` +
          reviews.map(r => `
            <div class="review-item">
              <div class="review-header">
                <span class="review-name">${escapeHtml(r.reviewerName)}</span>
                <span class="review-date">${formatDate(r.createdAt)}</span>
              </div>
              <div>${renderStars(r.rating, '0.9rem')}</div>
              ${r.comment ? `<p style="margin-top:4px;font-size:0.9rem;color:var(--gray-600);">${escapeHtml(r.comment)}</p>` : ''}
            </div>
          `).join('') + '</div>';
      }
    } catch (e) { /* no reviews */ }

    // Preview section
    let previewHtml = '';
    if (content.preview_path) {
      const ext = content.preview_path.split('.').pop().toLowerCase();
      if (['mp3', 'wav', 'ogg'].includes(ext)) {
        previewHtml = `<div class="preview-area"><audio controls src="${API_URL}/content/preview/${contentId}"></audio></div>`;
      } else if (['mp4', 'webm'].includes(ext)) {
        previewHtml = `<div class="preview-area"><video controls src="${API_URL}/content/preview/${contentId}" style="max-height:250px;"></video></div>`;
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        previewHtml = `<div class="preview-area"><img src="${API_URL}/content/preview/${contentId}" alt="Preview" /></div>`;
      }
    }

    const verifiedHtml = content.creator_verified
      ? `<span class="verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>`
      : '';

    document.getElementById('detailModalHeader').innerHTML = `
      <h2>${escapeHtml(content.title)}</h2>
      <button class="close" onclick="closeDetailModal()">&times;</button>
    `;

    document.getElementById('detailModalBody').innerHTML = `
      <div class="detail-header">
        <div class="detail-icon">${icon}</div>
        <div class="detail-info">
          <h3>${escapeHtml(content.title)}</h3>
          <a href="/profile/${escapeHtml(content.creator_username)}" class="creator-link">by ${escapeHtml(content.creator_name)}${verifiedHtml}</a>
        </div>
      </div>

      ${content.average_rating > 0 ? `<div class="rating-display" style="margin-bottom:var(--space-md);">${renderStars(content.average_rating)} <span style="color:var(--gray-600);font-size:0.9rem;">${content.average_rating} (${content.review_count} reviews)</span></div>` : ''}

      <div class="detail-meta">
        <div class="detail-meta-item"><strong>Category</strong>${escapeHtml(content.category)}</div>
        <div class="detail-meta-item"><strong>Downloads</strong>${content.download_count}</div>
        <div class="detail-meta-item"><strong>File</strong>${escapeHtml(content.file_name)}</div>
        <div class="detail-meta-item"><strong>Size</strong>${formatFileSize(content.file_size)}</div>
      </div>

      ${content.description ? `<div class="detail-description">${escapeHtml(content.description)}</div>` : ''}

      ${previewHtml}

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-lg);">
        <span class="price-tag" style="font-size:1.2rem;">${formatCurrency(content.price_zmw || 2)}</span>
        <button class="btn-primary" onclick="closeDetailModal();openPaymentModal('${content.id}');">Buy & Download</button>
      </div>

      ${reviewsHtml}
    `;

    document.getElementById('contentDetailModal').style.display = 'block';
  } catch (error) {
    showToast('Error loading content details', 'error');
  }
}

function closeDetailModal() {
  document.getElementById('contentDetailModal').style.display = 'none';
}

// ===================== PAYMENT =====================
async function openPaymentModal(contentId) {
  try {
    const response = await fetch(`${API_URL}/content/${contentId}`);
    currentContent = await response.json();

    document.getElementById('modalContentDetails').innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-lg);">
        <div class="detail-icon">${getCategoryIcon(currentContent.category)}</div>
        <div>
          <h3 style="font-size:1.1rem;">${escapeHtml(currentContent.title)}</h3>
          <p style="color:var(--gray-600);font-size:0.9rem;">by ${escapeHtml(currentContent.creator_name)}</p>
        </div>
      </div>
    `;

    document.getElementById('priceDisplay').innerHTML = `<strong>Total: ${formatCurrency(currentContent.price_zmw || 2)}</strong>`;
    document.getElementById('paymentModal').style.display = 'block';
    document.getElementById('paymentStatus').classList.add('hidden');
  } catch (error) {
    showToast('Error loading content details', 'error');
  }
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
  currentContent = null;
  currentTransactionRef = null;
  resetPaymentForm();
}

function setupPaymentMethodListeners() {
  document.querySelectorAll('input[name="paymentMethod"]').forEach(method => {
    method.addEventListener('change', (e) => {
      const value = e.target.value;
      const phoneField = document.getElementById('phoneNumberField');
      const cardField = document.getElementById('cardDetailsField');

      if (['mtn_momo', 'airtel_money', 'zamtel'].includes(value)) {
        phoneField.classList.remove('hidden');
        cardField.classList.add('hidden');
      } else if (value === 'visa') {
        phoneField.classList.add('hidden');
        cardField.classList.remove('hidden');
      }
    });
  });
}

async function processPayment() {
  const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
  if (!selectedMethod) {
    showToast('Please select a payment method', 'warning');
    return;
  }

  const paymentMethod = selectedMethod.value;
  const phoneNumber = document.getElementById('phoneNumber')?.value;

  if (['mtn_momo', 'airtel_money', 'zamtel'].includes(paymentMethod)) {
    if (!phoneNumber || phoneNumber.length < 10) {
      showToast('Please enter a valid phone number', 'warning');
      return;
    }
  }

  try {
    const response = await fetch(`${API_URL}/payment/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: currentContent.id,
        paymentMethod,
        phoneNumber: phoneNumber || undefined
      })
    });

    const result = await response.json();

    if (response.ok) {
      currentTransactionRef = result.transactionRef;

      const statusEl = document.getElementById('paymentStatus');
      statusEl.innerHTML = `
        <div class="alert alert-info">
          <h3 style="margin-bottom:var(--space-sm);">${escapeHtml(result.message)}</h3>
          <p>${escapeHtml(result.instructions)}</p>
          <p style="margin-top:var(--space-sm);font-size:0.9rem;">Waiting for payment confirmation...</p>
          <button onclick="checkPaymentStatus()" class="btn-secondary" style="margin-top:var(--space-md);">Check Status</button>
        </div>
        <button onclick="simulatePaymentSuccess()" class="btn-primary btn-large" style="margin-top:var(--space-md);">
          [DEMO] Simulate Payment Success
        </button>
      `;
      statusEl.classList.remove('hidden');

      setTimeout(checkPaymentStatus, 3000);
    } else {
      showToast(result.error || 'Payment initiation failed', 'error');
    }
  } catch (error) {
    showToast('Payment failed. Please try again.', 'error');
  }
}

async function checkPaymentStatus() {
  if (!currentTransactionRef) return;

  try {
    const response = await fetch(`${API_URL}/payment/status/${currentTransactionRef}`);
    const result = await response.json();

    if (result.status === 'completed') {
      // Save to download history
      if (currentContent) {
        saveDownloadHistory({
          contentId: currentContent.id,
          title: currentContent.title,
          downloadToken: result.downloadToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
        updateDownloadsLink();
      }

      document.getElementById('paymentStatus').innerHTML = `
        <div class="alert alert-success">
          <h3>Payment Successful!</h3>
          <p>Your download is ready. You have 3 downloads within 24 hours.</p>
          <a href="${result.downloadUrl}" class="btn-primary btn-large" download>Download Now</a>
        </div>
        <div style="margin-top:var(--space-lg);padding:var(--space-md);background:var(--light);border-radius:var(--radius-sm);">
          <h4 style="font-size:0.95rem;margin-bottom:var(--space-sm);">Rate this content</h4>
          <div id="rateStars" style="font-size:1.5rem;cursor:pointer;margin-bottom:var(--space-sm);">${[1,2,3,4,5].map(i => `<span class="star star-empty" data-rating="${i}" onclick="selectRating(${i})">&#9734;</span>`).join('')}</div>
          <input type="text" id="reviewName" placeholder="Your name (optional)" style="width:100%;padding:0.5rem;border:1px solid var(--gray-200);border-radius:var(--radius-sm);margin-bottom:var(--space-sm);font-family:inherit;" />
          <textarea id="reviewComment" placeholder="Write a review (optional)" style="width:100%;padding:0.5rem;border:1px solid var(--gray-200);border-radius:var(--radius-sm);min-height:60px;font-family:inherit;resize:vertical;"></textarea>
          <button onclick="submitRating('${result.downloadToken}')" class="btn-secondary" style="margin-top:var(--space-sm);">Submit Review</button>
        </div>
      `;
    } else if (result.status === 'failed') {
      document.getElementById('paymentStatus').innerHTML = `
        <div class="alert alert-error">
          <h3>Payment Failed</h3>
          <p>Please try again or use a different payment method.</p>
          <button onclick="resetPaymentForm()" class="btn-secondary" style="margin-top:var(--space-sm);">Try Again</button>
        </div>
      `;
    } else {
      setTimeout(checkPaymentStatus, 3000);
    }
  } catch (error) { /* silently retry */ }
}

async function simulatePaymentSuccess() {
  try {
    const response = await fetch(`${API_URL}/payment/simulate-success/${currentTransactionRef}`, { method: 'POST' });
    if (response.ok) {
      checkPaymentStatus();
    }
  } catch (error) {
    showToast('Simulation failed', 'error');
  }
}

function resetPaymentForm() {
  const checked = document.querySelector('input[name="paymentMethod"]:checked');
  if (checked) checked.checked = false;
  const phoneEl = document.getElementById('phoneNumber');
  if (phoneEl) phoneEl.value = '';
  document.getElementById('phoneNumberField')?.classList.add('hidden');
  document.getElementById('cardDetailsField')?.classList.add('hidden');
  document.getElementById('paymentStatus')?.classList.add('hidden');
}

// ===================== RATINGS =====================
let selectedRating = 0;

function selectRating(rating) {
  selectedRating = rating;
  document.querySelectorAll('#rateStars .star').forEach(star => {
    const r = parseInt(star.dataset.rating);
    star.innerHTML = r <= rating ? '&#9733;' : '&#9734;';
    star.className = r <= rating ? 'star star-full' : 'star star-empty';
  });
}

async function submitRating(downloadToken) {
  if (!selectedRating) {
    showToast('Please select a rating', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: currentContent.id,
        downloadToken,
        rating: selectedRating,
        reviewerName: document.getElementById('reviewName')?.value || 'Anonymous',
        comment: document.getElementById('reviewComment')?.value || ''
      })
    });

    const result = await response.json();
    if (response.ok) {
      showToast('Review submitted! Thank you.', 'success');
      selectedRating = 0;
    } else {
      showToast(result.error || 'Failed to submit review', 'error');
    }
  } catch (error) {
    showToast('Failed to submit review', 'error');
  }
}

// ===================== REPORTS =====================
function openReportModal(contentId) {
  document.getElementById('reportContentId').value = contentId;
  document.getElementById('reportModal').style.display = 'block';
}

function closeReportModal() {
  document.getElementById('reportModal').style.display = 'none';
}

async function submitReport(event) {
  event.preventDefault();
  const contentId = document.getElementById('reportContentId').value;
  const reason = document.getElementById('reportReason').value;
  const description = document.getElementById('reportDescription').value;
  const email = document.getElementById('reportEmail').value;

  try {
    const response = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, reason, description, reporterEmail: email })
    });

    const result = await response.json();
    if (response.ok) {
      showToast('Report submitted. Thank you for helping keep our platform safe.', 'success');
      closeReportModal();
      event.target.reset();
    } else {
      showToast(result.error || 'Failed to submit report', 'error');
    }
  } catch (error) {
    showToast('Failed to submit report', 'error');
  }
}

// ===================== DOWNLOADS HISTORY =====================
function updateDownloadsLink() {
  const history = getDownloadHistory();
  const link = document.getElementById('downloadsLink');
  if (link) {
    link.classList.toggle('hidden', history.length === 0);
  }
}

function openDownloadsModal() {
  const history = getDownloadHistory();
  const body = document.getElementById('downloadsModalBody');

  if (history.length === 0) {
    body.innerHTML = '<p style="color:var(--gray-600);">No downloads yet. Purchase content to see your download history here.</p>';
  } else {
    body.innerHTML = history.map(item => {
      const expired = new Date(item.expiresAt) < new Date();
      return `
        <div class="download-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div style="font-size:0.8rem;color:var(--gray-600);">Purchased: ${formatDate(item.purchaseDate)}</div>
          </div>
          ${expired
            ? '<span class="status-badge status-rejected">Expired</span>'
            : `<a href="${API_URL}/payment/download/${item.downloadToken}" class="btn-small btn-primary" download>Download</a>`
          }
        </div>
      `;
    }).join('');
  }

  document.getElementById('downloadsModal').style.display = 'block';
}

function closeDownloadsModal() {
  document.getElementById('downloadsModal').style.display = 'none';
}

// ===================== AUTH MODALS =====================
function showCreatorLogin() {
  document.getElementById('creatorLoginModal').style.display = 'block';
  document.getElementById('creatorRegisterModal').style.display = 'none';
}

function closeCreatorLogin() {
  document.getElementById('creatorLoginModal').style.display = 'none';
}

function showCreatorRegister() {
  document.getElementById('creatorRegisterModal').style.display = 'block';
  document.getElementById('creatorLoginModal').style.display = 'none';
}

function closeCreatorRegister() {
  document.getElementById('creatorRegisterModal').style.display = 'none';
}

function showAdminLogin() {
  document.getElementById('adminLoginModal').style.display = 'block';
}

function closeAdminLogin() {
  document.getElementById('adminLoginModal').style.display = 'none';
}

function showForgotPassword() {
  closeCreatorLogin();
  document.getElementById('forgotPasswordModal').style.display = 'block';
}

function closeForgotPassword() {
  document.getElementById('forgotPasswordModal').style.display = 'none';
}

async function handleForgotPassword(event) {
  event.preventDefault();
  showToast('If an account with that email exists, a reset link has been sent.', 'info');
  closeForgotPassword();
}

async function handleCreatorLogin(event) {
  event.preventDefault();
  const username = document.getElementById('creatorUsername').value;
  const password = document.getElementById('creatorPassword').value;

  try {
    const response = await fetch(`${API_URL}/creators/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();
    if (response.ok) {
      localStorage.setItem('creatorToken', result.token);
      localStorage.setItem('creatorData', JSON.stringify(result.creator));
      closeCreatorLogin();
      checkLoggedInStatus();
      window.location.href = '/dashboard';
    } else {
      showToast(result.error || 'Login failed', 'error');
    }
  } catch (error) {
    showToast('Login failed. Please try again.', 'error');
  }
}

async function handleCreatorRegister(event) {
  event.preventDefault();
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const displayName = document.getElementById('regDisplayName').value;
  const password = document.getElementById('regPassword').value;

  try {
    const response = await fetch(`${API_URL}/creators/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, displayName, password })
    });
    const result = await response.json();
    if (response.ok) {
      localStorage.setItem('creatorToken', result.token);
      localStorage.setItem('creatorData', JSON.stringify(result.creator));
      closeCreatorRegister();
      checkLoggedInStatus();
      window.location.href = '/dashboard';
    } else {
      showToast(result.error || 'Registration failed', 'error');
    }
  } catch (error) {
    showToast('Registration failed. Please try again.', 'error');
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;

  try {
    const response = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();
    if (response.ok) {
      localStorage.setItem('adminToken', result.token);
      localStorage.setItem('adminData', JSON.stringify(result.admin));
      closeAdminLogin();
      window.location.href = '/admin';
    } else {
      showToast(result.error || 'Admin login failed', 'error');
    }
  } catch (error) {
    showToast('Admin login failed. Please try again.', 'error');
  }
}

function logoutCreator() {
  localStorage.removeItem('creatorToken');
  localStorage.removeItem('creatorData');
  location.reload();
}

function logoutAdmin() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
  location.reload();
}

// ===================== MODAL CLOSE ON OUTSIDE CLICK =====================
window.addEventListener('click', (event) => {
  const modals = ['paymentModal', 'creatorLoginModal', 'creatorRegisterModal', 'adminLoginModal',
    'contentDetailModal', 'reportModal', 'downloadsModal', 'forgotPasswordModal'];
  modals.forEach(id => {
    const modal = document.getElementById(id);
    if (event.target === modal) modal.style.display = 'none';
  });
});
