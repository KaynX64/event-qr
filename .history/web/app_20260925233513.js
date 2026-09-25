/* ==========================================================
 * JCI Invite Portal — app.js
 *
 * Stage 1: Code → QR (single-use code entry)
 * Stage 2: QR scanned by Android app (single-use QR)
 * ========================================================== */

/* ---------- SUPABASE CONNECTION ---------- */
const SUPABASE_URL = 'https://wknedtcorkdgptmcwigm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbmVkdGNvcmtkZ3B0bWN3aWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMjgyNTUsImV4cCI6MjEwNTkwNDI1NX0.F5aiWGFQIDhZNE1-sTlPgzRvoXH34C8KEV4_QaXSD4k';

/* ---------- CONFIGURATION ---------- */
const CONFIG = {
  MIN_LOADING_MS: 600,
  QR_SIZE: 220,
  QR_ERROR_LEVEL: 'M',
  QR_DARK: '#0F172A',
  QR_LIGHT: '#FFFFFF',
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
 * DATA LAYER — Supabase retrieve_qr
 * Single-use code: once consumed, code cannot be reused
 * ========================================================== */

async function lookupPass(rawCode) {
  const code = rawCode.trim();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/retrieve_qr`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code_param: code }),
    }
  );

  if (!res.ok) {
    throw new Error(`Supabase error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.success) {
    return {
      error: true,
      errorType: data.error,
      message: data.message,
    };
  }

  return {
    token:     data.token,
    name:      data.guest_name,
    category:  data.category,
    codeLabel: data.codeLabel,
    status:    'ready',
  };
}

/* ==========================================================
 * FORM HANDLER
 * ========================================================== */
let _isSubmitting = false;

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

    const elapsed = Date.now() - startTime;
    if (elapsed < CONFIG.MIN_LOADING_MS) {
      await new Promise(r => setTimeout(r, CONFIG.MIN_LOADING_MS - elapsed));
    }

    if (entry.error) {
      showError(entry.message);
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
 * RENDER PASS
 * ========================================================== */
function renderPass(entry) {
  /* Category badge */
  document.getElementById('pass-category').textContent =
    (entry.category || 'GENERAL ADMISSION').toUpperCase();

  /* Guest name */
  document.getElementById('pass-name').textContent =
    entry.name || 'Honored Guest';

  /* Code label */
  document.getElementById('pass-code-label').textContent =
    entry.codeLabel || '—';

  /* Status pill */
  const pill = document.getElementById('pass-status-pill');
  const pillText = document.getElementById('pass-status-text');

  pill.className = 'mt-5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-m3-pill bg-m3-successContainer text-m3-onSuccessContainer text-xs font-semibold shadow-sm';
  pillText.textContent = 'Ready for Check-In';

  /* QR Code */
  const qrBox = document.getElementById('qrcode-container');
  qrBox.innerHTML = '';

  if (typeof QRCode === 'undefined') {
    qrBox.innerHTML = '<p class="text-red-500 text-xs text-center max-w-[200px]">QR engine failed to load.<br>Refresh the page.</p>';
    return;
  }

  if (!entry.token) {
    qrBox.innerHTML = '<p class="text-red-500 text-xs text-center max-w-[200px]">QR generation error.<br>Missing token data.</p>';
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