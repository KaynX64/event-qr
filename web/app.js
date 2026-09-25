/**
 * JCI Digital Pass Portal - Strict Single-Use Burn Engine
 */

// ==========================================================================
// 1. SUPABASE CONFIGURATION
// ==========================================================================
const SUPABASE_URL = "https://xwluratinqcvyqmfuuoa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bHVyYXRpbnFjdnlxbWZ1dW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDQ1NTcsImV4cCI6MjEwNTkyMDU1N30.ND-NhlMi_DBo7osQCwAMJGsGsG1t42QL-Eg7830b05Q";

let currentAttendee = null;
let qrCodeInstance = null;

// ==========================================================================
// 2. DOM ELEMENT REFERENCES
// ==========================================================================
const views = {
  input: document.getElementById("view-input"),
  loading: document.getElementById("view-loading"),
  pass: document.getElementById("view-pass"),
  error: document.getElementById("view-error"),
};

const elements = {
  form: document.getElementById("code-form"),
  inputCode: document.getElementById("input-code"),
  passCategory: document.getElementById("pass-category"),
  passName: document.getElementById("pass-name"),
  passCodeLabel: document.getElementById("pass-code-label"),
  passStatusText: document.getElementById("pass-status-text"),
  passStatusPill: document.getElementById("pass-status-pill"),
  qrContainer: document.getElementById("qrcode-container"),
  errorMessage: document.getElementById("error-message"),
};

// ==========================================================================
// 3. INITIALIZATION & QUERY PARAMETER PARSING
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get("code") || urlParams.get("c");

  if (codeFromUrl) {
    const sanitizedCode = codeFromUrl.trim().toUpperCase();
    elements.inputCode.value = sanitizedCode;
    processStrictSingleUseCode(sanitizedCode);
  } else {
    showView("input");
  }
});

function showView(targetView) {
  Object.keys(views).forEach((key) => {
    if (key === targetView) {
      views[key].classList.remove("hidden");
    } else {
      views[key].classList.add("hidden");
    }
  });
}

function handleManualSubmit(event) {
  event.preventDefault();
  const code = elements.inputCode.value.trim().toUpperCase();
  if (!code) return;

  const newUrl = `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(code)}`;
  window.history.pushState({ path: newUrl }, "", newUrl);

  processStrictSingleUseCode(code);
}

// ==========================================================================
// 4. STRICT SINGLE-USE CLAIM & BURN LOGIC
// ==========================================================================
async function processStrictSingleUseCode(code) {
  showView("loading");

  try {
    // 1. Fetch attendee record
    const getEndpoint = `${SUPABASE_URL}/rest/v1/attendees?code=eq.${encodeURIComponent(code)}&select=*`;
    const getRes = await fetch(getEndpoint, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!getRes.ok) {
      throw new Error(`Database connection failed: HTTP ${getRes.status}`);
    }

    const data = await getRes.json();
    if (!data || data.length === 0) {
      throw new Error(`Invitation code "${code}" does not exist in the guest registry.`);
    }

    const record = data[0];

    // 2. CHECK STATUS: Is it already CLAIMED, CHECKED_IN, or REVOKED?
    if (record.status === "CLAIMED") {
      throw new Error(`This code (${code}) has already been used to generate a pass. Each invitation code can only be used once.`);
    }

    if (record.status === "CHECKED_IN") {
      throw new Error(`This pass has already been scanned and checked in at the event entrance.`);
    }

    if (record.status === "REVOKED") {
      throw new Error(`This invitation code has been revoked by event administrators.`);
    }

    // 3. BURN CODE: Status is 'ACTIVE', so immediately change it to 'CLAIMED' in Supabase!
    const patchEndpoint = `${SUPABASE_URL}/rest/v1/attendees?code=eq.${encodeURIComponent(code)}`;
    const patchRes = await fetch(patchEndpoint, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        status: "CLAIMED",
        claimed_at: new Date().toISOString()
      })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`Failed to update status in database: ${errText}`);
    }

    // 4. Render the pass on the screen so the user can download it
    record.status = "CLAIMED";
    renderPassUI(record);

  } catch (err) {
    elements.errorMessage.textContent = err.message || "Failed to process pass.";
    showView("error");
  }
}

// ==========================================================================
// 5. UI RENDERER
// ==========================================================================
function renderPassUI(record) {
  currentAttendee = record;

  elements.passCategory.textContent = record.category || "GENERAL ADMISSION";
  elements.passName.textContent = record.full_name;
  elements.passCodeLabel.textContent = record.code;

  elements.passStatusText.textContent = "Pass Claimed (Save Now)";
  elements.passStatusPill.className =
    "mt-5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-m3-pill bg-m3-successContainer text-m3-onSuccessContainer text-xs font-semibold shadow-sm";

  // Generate QR Code
  elements.qrContainer.innerHTML = "";
  qrCodeInstance = new QRCode(elements.qrContainer, {
    text: record.qr_payload,
    width: 200,
    height: 200,
    colorDark: "#0F172A",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.H,
  });

  showView("pass");
}

// ==========================================================================
// 6. NAVIGATION & DOWNLOAD
// ==========================================================================
function switchCode() {
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.pushState({ path: cleanUrl }, "", cleanUrl);

  elements.inputCode.value = "";
  elements.qrContainer.innerHTML = "";
  currentAttendee = null;
  showView("input");
}

function downloadQRCode() {
  if (!currentAttendee) return;

  const qrCanvas = elements.qrContainer.querySelector("canvas");
  if (!qrCanvas) {
    alert("Pass is still rendering. Please try again.");
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const scale = 2;

  const width = 360 * scale;
  const height = 480 * scale;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#FFFFFF";
  ctx.roundRect(0, 0, width, height, 28 * scale);
  ctx.fill();

  ctx.fillStyle = "#1E40AF";
  ctx.fillRect(0, 0, width, 10 * scale);

  ctx.fillStyle = "#DBEAFE";
  ctx.roundRect(40 * scale, 30 * scale, width - 80 * scale, 28 * scale, 14 * scale);
  ctx.fill();

  ctx.font = `bold ${11 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#1E3A8A";
  ctx.textAlign = "center";
  ctx.fillText(currentAttendee.category.toUpperCase(), width / 2, 48 * scale);

  ctx.font = `bold ${18 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#0F172A";
  ctx.fillText(currentAttendee.full_name, width / 2, 85 * scale);

  ctx.font = `500 ${11 * scale}px monospace`;
  ctx.fillStyle = "#64748B";
  ctx.fillText(`ACCESS CODE: ${currentAttendee.code}`, width / 2, 105 * scale);

  const qrSize = 180 * scale;
  const qrX = (width - qrSize) / 2;
  const qrY = 130 * scale;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  ctx.font = `500 ${10 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("Present this QR at the check-in gate", width / 2, 350 * scale);
  ctx.fillText("Junior Chamber International (JCI)", width / 2, 440 * scale);

  const downloadLink = document.createElement("a");
  downloadLink.download = `Pass-${currentAttendee.code}.png`;
  downloadLink.href = canvas.toDataURL("image/png");
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}