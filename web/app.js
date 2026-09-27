/**
 * JCI Digital Pass Portal - Strict Single-Use Burn Engine
 * Live Connected with Supabase, Session Recovery & Canvas Path Exporter
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
  passTable: document.getElementById("pass-table"),
  passCodeLabel: document.getElementById("pass-code-label"),
  passStatusText: document.getElementById("pass-status-text"),
  passStatusPill: document.getElementById("pass-status-pill"),
  qrContainer: document.getElementById("qrcode-container"),
  errorMessage: document.getElementById("error-message"),
  modalSwitch: document.getElementById("modal-switch-confirm"),
};

// ==========================================================================
// 3. INITIALIZATION, QUERY PARSING & RELOAD SESSION RECOVERY
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Check if user already claimed a pass in this browser session (Protection against accidental reloads)
  const cachedPass = sessionStorage.getItem("jci_active_pass");
  if (cachedPass) {
    try {
      const record = JSON.parse(cachedPass);
      renderPassUI(record);
      return;
    } catch (_) {
      sessionStorage.removeItem("jci_active_pass");
    }
  }

  // 2. Otherwise, check URL parameter
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

// Warn user before accidental page reload / navigation while on the pass screen
window.addEventListener("beforeunload", (event) => {
  if (currentAttendee && views.pass && !views.pass.classList.contains("hidden")) {
    event.preventDefault();
    event.returnValue = "";
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

    // Status Validations
    if (record.status === "CLAIMED") {
      throw new Error(`This code (${code}) has already been used to generate a pass. Each invitation code can only be used once.`);
    }

    if (record.status === "CHECKED_IN") {
      throw new Error(`This pass has already been scanned and checked in at the event entrance.`);
    }

    if (record.status === "REVOKED") {
      throw new Error(`This invitation code has been revoked by event administrators.`);
    }

    // Burn code in Supabase (ACTIVE -> CLAIMED)
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

    record.status = "CLAIMED";
    
    // Save to session so accidental reloads won't lock out the user
    sessionStorage.setItem("jci_active_pass", JSON.stringify(record));
    
    renderPassUI(record);

  } catch (err) {
    elements.errorMessage.textContent = err.message || "Failed to process pass.";
    showView("error");
  }
}

// ==========================================================================
// 5. UI RENDERER (With Anti-Widow Name Scaler & Sanitized Table Number)
// ==========================================================================
function renderPassUI(record) {
  currentAttendee = record;

  // Title locked to INVITED GUEST
  elements.passCategory.textContent = "INVITED GUEST";
  elements.passName.textContent = record.full_name;

  // Auto-fit font size based on guest name length so it stays on 1 line
  const nameLen = record.full_name.length;
  if (nameLen > 26) {
    elements.passName.className = "font-luxury text-sm sm:text-base font-extrabold text-slate-100 tracking-wide leading-tight w-full px-2 text-center [text-wrap:balance] my-1";
  } else if (nameLen > 18) {
    elements.passName.className = "font-luxury text-base sm:text-lg font-extrabold text-slate-100 tracking-wide leading-tight w-full px-2 text-center [text-wrap:balance] my-1";
  } else {
    elements.passName.className = "font-luxury text-xl sm:text-2xl font-extrabold text-slate-100 tracking-wide leading-tight w-full px-2 text-center [text-wrap:balance] my-1";
  }

  // Sanitize: Strip leading "Table " or "TABLE " so only the clean identifier shows inside the circle
  const rawTable = record.table_number || "1";
  const cleanNumber = rawTable.replace(/^table\s*/i, "").trim() || rawTable;
  elements.passTable.textContent = cleanNumber;

  // Dynamically adjust font scale so 3+ character tables (e.g. "102", "VIP") never overflow
  if (cleanNumber.length > 3) {
    elements.passTable.className = "font-luxury text-xl font-black text-gold-gradient tracking-tight leading-none px-2 max-w-[100px] truncate";
  } else {
    elements.passTable.className = "font-luxury text-2xl sm:text-3xl font-black text-gold-gradient tracking-tight leading-none px-2 max-w-[100px] truncate";
  }

  elements.passCodeLabel.textContent = record.code;

  elements.passStatusText.textContent = "Pass Claimed (Save Now)";
  elements.passStatusPill.className =
    "mt-6 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-semibold tracking-wider shadow-sm";

  // Generate QR Code Client-Side
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
// 6. ACCIDENTAL CLICK PROTECTION (SWITCH CODE MODAL)
// ==========================================================================
function requestSwitchCode() {
  if (elements.modalSwitch) {
    elements.modalSwitch.classList.remove("hidden");
  } else {
    if (confirm("Are you sure you want to leave this pass? Once you leave, this single-use code cannot be entered again.")) {
      confirmSwitchCode();
    }
  }
}

function closeSwitchModal() {
  if (elements.modalSwitch) {
    elements.modalSwitch.classList.add("hidden");
  }
}

function confirmSwitchCode() {
  closeSwitchModal();

  // Clear session cache so it won't reload the old pass
  sessionStorage.removeItem("jci_active_pass");

  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.pushState({ path: cleanUrl }, "", cleanUrl);

  elements.inputCode.value = "";
  elements.qrContainer.innerHTML = "";
  currentAttendee = null;
  showView("input");
}

// ==========================================================================
// 7. HIGH-RES TICKET EXPORT (Explicit Path Isolation)
// ==========================================================================
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
  const height = 580 * scale;

  canvas.width = width;
  canvas.height = height;

  // 1. Background: Deep Obsidian Midnight Card
  ctx.beginPath();
  ctx.fillStyle = "#070E1E";
  ctx.roundRect(0, 0, width, height, 32 * scale);
  ctx.fill();

  // 2. Outer Gold Trim
  ctx.beginPath();
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2 * scale;
  ctx.roundRect(6 * scale, 6 * scale, width - 12 * scale, height - 12 * scale, 28 * scale);
  ctx.stroke();

  // 3. Top Accent Gold Bar
  ctx.beginPath();
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "#BF953F");
  grad.addColorStop(0.5, "#FCF6BA");
  grad.addColorStop(1, "#AA771C");
  ctx.fillStyle = grad;
  ctx.fillRect(20 * scale, 16 * scale, width - 40 * scale, 4 * scale);

  // 4. Category Tag: "INVITED GUEST"
  ctx.beginPath();
  ctx.fillStyle = "rgba(212, 175, 55, 0.15)";
  ctx.roundRect(50 * scale, 30 * scale, width - 100 * scale, 26 * scale, 13 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${10 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#ECC466";
  ctx.fillText("INVITED GUEST", width / 2, 43 * scale);

  // 5. Guest Name (Auto-scaled for downloaded canvas pass)
  const nameLength = currentAttendee.full_name.length;
  const nameFontSize = nameLength > 26 ? 14 : (nameLength > 18 ? 16 : 19);
  ctx.font = `bold ${nameFontSize * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(currentAttendee.full_name, width / 2, 80 * scale);

  // -------------------------------------------------------------
  // 6. GILDED CIRCULAR TABLE MEDALLION
  // -------------------------------------------------------------
  const centerX = width / 2;
  const circleY = 135 * scale;
  const radius = 36 * scale;

  // Outer Dashed Gold Ring
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([4 * scale, 3 * scale]);
  ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
  ctx.lineWidth = 1.2 * scale;
  ctx.arc(centerX, circleY, radius + 4 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Solid Deep Navy Sapphire Base
  ctx.beginPath();
  ctx.fillStyle = "#0A1733";
  ctx.arc(centerX, circleY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner Dark Center
  ctx.beginPath();
  ctx.fillStyle = "#050C1F";
  ctx.arc(centerX, circleY, radius - 2 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Outer Gold Border
  ctx.beginPath();
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2 * scale;
  ctx.arc(centerX, circleY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner Hairline Gold Border
  ctx.beginPath();
  ctx.strokeStyle = "rgba(253, 230, 138, 0.4)";
  ctx.lineWidth = 1 * scale;
  ctx.arc(centerX, circleY, radius - 4 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Medallion Typography
  const rawTable = currentAttendee.table_number || "1";
  const cleanNumber = rawTable.replace(/^table\s*/i, "").trim() || rawTable;

  // "TABLE" Header
  ctx.font = `bold ${8 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#FDE68A";
  ctx.fillText("TABLE", centerX, circleY - 14 * scale);

  // Large Table Number
  const fontSize = cleanNumber.length > 3 ? 15 : 21;
  ctx.font = `bold ${fontSize * scale}px "Cinzel", serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(cleanNumber, centerX, circleY + 2 * scale);

  // "RESERVED" Subtitle
  ctx.font = `bold ${7 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("RESERVED", centerX, circleY + 17 * scale);

  // -------------------------------------------------------------
  // 7. PASS IDENTIFIER
  // -------------------------------------------------------------
  ctx.font = `500 ${10 * scale}px monospace`;
  ctx.fillStyle = "#64748B";
  ctx.fillText(`PASS ID: ${currentAttendee.code}`, width / 2, 192 * scale);

  // -------------------------------------------------------------
  // 8. WHITE CERAMIC PLATE FOR QR CODE
  // -------------------------------------------------------------
  const plateSize = 210 * scale;
  const plateX = (width - plateSize) / 2;
  const plateY = 208 * scale;

  ctx.beginPath();
  ctx.fillStyle = "#FFFFFF";
  ctx.roundRect(plateX, plateY, plateSize, plateSize, 20 * scale);
  ctx.fill();

  // Draw QR Code
  const qrSize = 180 * scale;
  const qrX = (width - qrSize) / 2;
  const qrY = plateY + (plateSize - qrSize) / 2;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // -------------------------------------------------------------
  // 9. FOOTER NOTICES & BRANDING
  // -------------------------------------------------------------
  ctx.font = `500 ${10 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#CBD5E1";
  ctx.fillText("Present this QR at the entrance terminal", width / 2, 452 * scale);

  ctx.font = `bold ${10 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#D4AF37";
  ctx.fillText("JCI DAGUPAN BANGUS", width / 2, 492 * scale);

  ctx.font = `400 ${9 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#64748B";
  ctx.fillText("Official Digital Credential • Single-Use Pass", width / 2, 514 * scale);

  // Trigger Download
  const downloadLink = document.createElement("a");
  downloadLink.download = `JCI-PASS-${currentAttendee.code}.png`;
  downloadLink.href = canvas.toDataURL("image/png");
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}