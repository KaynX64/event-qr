/**
 * JCI Digital Pass Portal - Strict Single-Use Burn Engine
 * Live Connected with Supabase & Imperial Gala Canvas Exporter
 */

// ==========================================================================
// 1. SUPABASE CONFIGURATION (LIVE VERIFIED)
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

    // 4. Render pass on screen
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
    "mt-6 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-semibold tracking-wider shadow-sm";

  // Generate QR Code
  elements.qrContainer.innerHTML = "";
  qrCodeInstance = new QRCode(elements.qrContainer, {
    text: record.qr_payload,
    width: 200,
    height: 200,
    colorDark: "#030814",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.H,
  });

  showView("pass");
}

// ==========================================================================
// 6. NAVIGATION & TICKET EXPORT (Imperial Gala Black-Tie Canvas Ticket)
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

  // Create High-Res Banquet Ticket Canvas (2x Retina scale)
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const scale = 2;

  const width = 380 * scale;
  const height = 520 * scale;

  canvas.width = width;
  canvas.height = height;

  // Background: Deep Obsidian Midnight Card
  ctx.fillStyle = "#070E1E";
  ctx.roundRect(0, 0, width, height, 32 * scale);
  ctx.fill();

  // Outer Gold Trim
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2 * scale;
  ctx.roundRect(6 * scale, 6 * scale, width - 12 * scale, height - 12 * scale, 28 * scale);
  ctx.stroke();

  // Top Accent Gold Bar
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "#BF953F");
  grad.addColorStop(0.5, "#FCF6BA");
  grad.addColorStop(1, "#AA771C");
  ctx.fillStyle = grad;
  ctx.fillRect(20 * scale, 16 * scale, width - 40 * scale, 4 * scale);

  // Category Badge
  ctx.fillStyle = "rgba(212, 175, 55, 0.15)";
  ctx.roundRect(40 * scale, 35 * scale, width - 80 * scale, 30 * scale, 15 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  ctx.font = `bold ${11 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#ECC466";
  ctx.textAlign = "center";
  ctx.fillText(currentAttendee.category.toUpperCase(), width / 2, 54 * scale);

  // Guest Name
  ctx.font = `bold ${20 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(currentAttendee.full_name, width / 2, 98 * scale);

  // Pass Code Label
  ctx.font = `500 ${11 * scale}px monospace`;
  ctx.fillStyle = "#94A3B8";
  ctx.fillText(`PASS ID: ${currentAttendee.code}`, width / 2, 120 * scale);

  // White Ceramic Plate for QR (Ensures flawless camera contrast)
  const plateSize = 220 * scale;
  const plateX = (width - plateSize) / 2;
  const plateY = 145 * scale;

  ctx.fillStyle = "#FFFFFF";
  ctx.roundRect(plateX, plateY, plateSize, plateSize, 20 * scale);
  ctx.fill();

  // Draw QR
  const qrSize = 190 * scale;
  const qrX = (width - qrSize) / 2;
  const qrY = plateY + (plateSize - qrSize) / 2;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Security Notice Footer
  ctx.font = `500 ${10 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#CBD5E1";
  ctx.fillText("Present this QR at the official entrance terminal", width / 2, 410 * scale);

  ctx.font = `bold ${10 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#D4AF37";
  ctx.fillText("JUNIOR CHAMBER INTERNATIONAL (JCI)", width / 2, 455 * scale);

  ctx.font = `400 ${9 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#64748B";
  ctx.fillText("Official Digital Credential • Single-Use Entry", width / 2, 475 * scale);

  // Export to PNG & Trigger Download
  const downloadLink = document.createElement("a");
  downloadLink.download = `JCI-GALA-PASS-${currentAttendee.code}.png`;
  downloadLink.href = canvas.toDataURL("image/png");
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}