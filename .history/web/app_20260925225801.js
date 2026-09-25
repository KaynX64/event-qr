/* ==========================================================
 * JCI Invite Portal — app.js
 *
 * Phase 1: Static lookup from codes.json
 * Phase 2: Replace lookupPass() with a fetch() to your API
 *
 * Global functions called from HTML inline handlers:
 *   handleManualSubmit(event)
 *   downloadQRCode()
 *   switchCode()
 * ========================================================== */

/* ---------- SUPABASE CLIENT ---------- */
const SUPABASE_URL = 'https://wknedtcorkdgptmcwigm.supabase.co/';  // ← paste yours
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbmVkdGNvcmtkZ3B0bWN3aWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMjgyNTUsImV4cCI6MjEwNTkwNDI1NX0.F5aiWGFQIDhZNE1-sTlPgzRvoXH34C8KEV4_QaXSD4k';                    // ← paste yours

/* ---------- CONFIGURATION ---------- */
const CONFIG = {
    MIN_LOADING_MS: 600,          // minimum spinner time for smooth UX
    QR_SIZE: 220,                 // rendered QR px size
    QR_ERROR_LEVEL: 'M',          // L=7%, M=15%, Q=25%, H=30% recovery
    QR_DARK: '#0F172A',           // slate-900 — matches your M3 palette
    QR_LIGHT: '#FFFFFF',
    CODES_SOURCE: './codes.json'  // ⬅️ PHASE 2: change to '/api/lookup'
  };
  
  /* ==========================================================
   * VIEW STATE MACHINE
   * view-input → view-loading → view-pass  (success)
   *                            → view-error (failure)
   * ========================================================== */
  const VIEW_IDS = ['view-input', 'view-loading', 'view-pass', 'view-error'];
  
  function showView(viewId) {
    VIEW_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== viewId);
    });
  }
  
  /* ==========================================================
   * DATA LAYER
   * The ONLY function you need to change when moving to a
   * backend. Everything else stays identical.
   * ========================================================== */
  
  let _codesCache = null;
  
  /**
 * Look up an invite code via Supabase.
 *
 * Replaces the old codes.json approach.
 * This is the ONLY function that talks to the database.
 */
async function lookupPass(rawCode) {
  const code = rawCode.trim().toUpperCase();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/invites?code=eq.${encodeURIComponent(code)}&select=*`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Supabase error: ${res.status}`);
  }

  const rows = await res.json();
  if (!rows || rows.length === 0) return null;

  // Map Supabase row → the shape the UI already expects
  const row = rows[0];
  return {
    token:     row.token,
    name:      row.guest_name,
    category:  row.category,
    codeLabel: row.code,
    status:    row.status,
  };
}
  
  /* ==========================================================
   * FORM HANDLER
   * ========================================================== */
  let _isSubmitting = false; // prevents double-submit
  
  async function handleManualSubmit(event) {
    event.preventDefault();
    if (_isSubmitting) return;
    _isSubmitting = true;
  
    const input = document.getElementById('input-code');
    const raw = input.value.trim();
    if (!raw) {
      _isSubmitting = false;
      return;
    }
  
    showView('view-loading');
  
    try {
      const startTime = Date.now();
      const entry = await lookupPass(raw);
  
      // Enforce minimum loading time so spinner doesn't flash
      const elapsed = Date.now() - startTime;
      if (elapsed < CONFIG.MIN_LOADING_MS) {
        await new Promise(r => setTimeout(r, CONFIG.MIN_LOADING_MS - elapsed));
      }
  
      if (!entry) {
        showError('The access code provided does not exist or has been revoked.');
        return;
      }
  
      /* ── Status guards ──────────────────────────────────
       * These fire once Phase 2 sends status from the DB.
       * Phase 1 sample data includes them for testing.     */
      if (entry.status === 'scanned') {
        showError('This pass has already been scanned and used.');
        return;
      }
      if (entry.status === 'disabled') {
        showError('This pass has been disabled. Please contact the organizer.');
        return;
      }
  
      renderPass(entry);
      showView('view-pass');
  
    } catch (err) {
      console.error('[lookup]', err);
      showError('Something went wrong. Please check your connection and try again.');
    } finally {
      _isSubmitting = false;
    }
  }
  
  /* ==========================================================
   * RENDER PASS (populates the digital pass card + QR)
   * ========================================================== */
  function renderPass(entry) {
    /* ── Category badge ── */
    document.getElementById('pass-category').textContent =
      (entry.category || 'GENERAL ADMISSION').toUpperCase();
  
    /* ── Guest name ── */
    document.getElementById('pass-name').textContent =
      entry.name || 'Honored Guest';
  
    /* ── Code label ── */
    document.getElementById('pass-code-label').textContent =
      entry.codeLabel || '—';
  
    /* ── Status pill ── */
    const pill = document.getElementById('pass-status-pill');
    const pillText = document.getElementById('pass-status-text');
    const isReady = !entry.status || entry.status === 'ready';
  
    pill.className = isReady
      ? 'mt-5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-m3-pill bg-m3-successContainer text-m3-onSuccessContainer text-xs font-semibold shadow-sm'
      : 'mt-5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-m3-pill bg-m3-errorContainer text-m3-onErrorContainer text-xs font-semibold shadow-sm';
  
    pillText.textContent = isReady
      ? 'Ready for Check-In'
      : (entry.status || 'Unknown Status');
  
    /* ── QR Code ── */
    const qrBox = document.getElementById('qrcode-container');
    qrBox.innerHTML = '';
  
    // Guard: CDN library failed to load
    if (typeof QRCode === 'undefined') {
      qrBox.innerHTML =
        '<p class="text-red-500 text-xs text-center max-w-[200px]">' +
        'QR engine failed to load.<br>Refresh the page.</p>';
      return;
    }
  
    // Guard: missing token
    if (!entry.token) {
      qrBox.innerHTML =
        '<p class="text-red-500 text-xs text-center max-w-[200px]">' +
        'QR generation error.<br>Missing token data.</p>';
      return;
    }
  
    new QRCode(qrBox, {
      text: entry.token,
      width: CONFIG.QR_SIZE,
      height: CONFIG.QR_SIZE,
      colorDark: CONFIG.QR_DARK,
      colorLight: CONFIG.QR_LIGHT,
      correctLevel: QRCode.CorrectLevel[CONFIG.QR_ERROR_LEVEL]
    });
  }
  
  /* ==========================================================
   * ERROR VIEW
   * ========================================================== */
  function showError(message) {
    document.getElementById('error-message').textContent = message;
    showView('view-error');
  }
  
  /* ==========================================================
   * DOWNLOAD QR AS PNG
   * ========================================================== */
  function downloadQRCode() {
    const qrBox = document.getElementById('qrcode-container');
  
    // qrcodejs renders <canvas> first, copies to <img>
    const canvas = qrBox.querySelector('canvas');
    const img = qrBox.querySelector('img');
  
    let dataUrl = null;
    if (canvas) {
      dataUrl = canvas.toDataURL('image/png');
    } else if (img && img.src) {
      dataUrl = img.src;
    }
  
    if (!dataUrl) return;
  
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'event-pass-qr.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  /* ==========================================================
   * RESET → back to input screen
   * ========================================================== */
  function switchCode() {
    document.getElementById('input-code').value = '';
    document.getElementById('qrcode-container').innerHTML = '';
    showView('view-input');
    document.getElementById('input-code').focus();
  }
  
  /* ==========================================================
   * INIT
   * ========================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    showView('view-input');
    document.getElementById('input-code').focus();
  });