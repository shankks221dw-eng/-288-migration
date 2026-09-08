/* ==========================================================================
   SERVER 288 — MIGRATION REGISTRATION
   Frontend logic for the public registration/update form.
   ========================================================================== */

// ---- CONFIG ---------------------------------------------------------------
// Paste your deployed Google Apps Script Web App URL here after deployment.
// See README.md → "Deploy the backend".
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwZJSbR-IxSYkzYg61ctkb8ZrBKJENvi_x66PPpyZWcm5mgdqpZazDvk5ojt40PblVf/exec",
};

// ---- STATE ------------------------------------------------------------
const state = {
  lang: detectLanguage(),
  step: 1,
  updateId: null,      // set when this page is loaded as an update link
  isLocked: false,
  data: {
    sourceServer: "",
    allianceName: "",
    playerName: "",
    migrationId: "",
    migrationScore: "",
    migrationType: "",
    groupSize: "",
    targetAlliance: "",
    apc: [
      { faction: "", power: "", unit: "M" },
      { faction: "", power: "", unit: "M" },
      { faction: "", power: "", unit: "M" },
      { faction: "", power: "", unit: "M" },
    ],
    season: "",
    bgb: "",
  },
};

const FACTIONS = ["Fighter", "Shooter", "Rider"];
const FACTION_KEYS = { Fighter: "factionFighter", Shooter: "factionShooter", Rider: "factionRider" };

// ---- INIT ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  state.updateId = params.get("update");

  buildLangSelect();
  buildSourceServerOptions();
  buildApcBlocks();
  wireEvents();
  applyTranslations();
  renderStepper();

  if (state.updateId) {
    loadForUpdate(state.updateId);
  }
});

// ---- I18N RENDERING -------------------------------------------------------
function buildLangSelect() {
  const sel = document.getElementById("langSelect");
  sel.innerHTML = "";
  Object.keys(LANG_META).forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = LANG_META[code].label;
    sel.appendChild(opt);
  });
  sel.value = state.lang;
  sel.addEventListener("change", () => {
    state.lang = sel.value;
    localStorageSafeSet("s288_lang", state.lang);
    applyTranslations();
    renderStepper();
    buildApcBlocks(true);
    if (document.getElementById("panelReview").style.display !== "none") renderReview();
  });
}

const STATIC_MAP = {
  brandTitle: "appTitle", brandTagline: "tagline", navAdmin: "navAdmin",
  s1Title: "step1Title", s2Title: "step2Title", s3Title: "step3Title",
  lblSourceServer: "sourceServer", lblAlliance: "allianceName", lblPlayerName: "playerName",
  lblMigrationId: "migrationId", lblScore: "migrationScore", lblType: "migrationType",
  lblGroupSize: "groupSize", lblTargetAlliance: "targetAlliance",
  choiceIndividual: "typeIndividual", choiceGroup: "typeGroup",
  choiceNotDecided: "targetNotDecided",
  lblSeason: "seasonAvailability", seasonYes: "availYes", seasonNo: "availNo", seasonOcc: "availOccasionally",
  lblBgb: "bgbAvailability", bgb01Btn: "bgb01", bgb10Btn: "bgb10", bgb19Btn: "bgb19",
  toStep2: "btnNext", toStep3: "btnNext", toReview: "btnNext",
  toStep1Back: "btnBack", toStep2Back: "btnBack",
  reviewTitleEl: "reviewStepTitle", reviewEdit: "btnEdit", submitBtn: "btnSubmit",
  reviewPlayerInfoTitle: "reviewPlayerInfo", reviewApcInfoTitle: "reviewApcInfo", reviewAvailabilityTitle: "reviewAvailability",
  successTitleEl: "successTitle", successMessageEl: "successMessage",
  refLabel: "referenceNumberLabel", updateLinkLabelEl: "updateLinkLabel",
  copyLinkBtn: "btnCopyLink", saveLinkWarningEl: "saveLinkWarning",
};

function applyTranslations() {
  const lang = state.lang;
  const meta = LANG_META[lang] || LANG_META.en;
  document.documentElement.lang = lang;
  document.documentElement.dir = meta.dir;

  Object.keys(STATIC_MAP).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(STATIC_MAP[id], lang);
  });

  document.title = t("appTitle", lang);
  document.getElementById("sourceServer").placeholder = t("sourceServerPlaceholder", lang);
  document.getElementById("migrationScore").placeholder = "325,000,000";

  document.querySelectorAll(".tag-required").forEach((el) => (el.textContent = t("mandatory", lang)));
  document.querySelectorAll(".tag-optional").forEach((el) => (el.textContent = t("optional", lang)));

  document.getElementById("statusPill").textContent = state.isLocked ? t("statusLocked", lang) : t("statusUnlocked", lang);

  renderStepLabel();
}

function renderStepLabel() {
  const titles = { 1: "step1Title", 2: "step2Title", 3: "step3Title", 4: "reviewStepTitle" };
  const key = titles[state.step] || "step1Title";
  document.getElementById("stepLabel").innerHTML =
    `<span class="num">${state.step <= 3 ? state.step : "•"}/4</span> ${t(key, state.lang)}`;
}

function renderStepper() {
  document.querySelectorAll(".step-dot").forEach((dot) => {
    const n = Number(dot.dataset.step);
    dot.classList.toggle("done", n < state.step);
    dot.classList.toggle("active", n === state.step);
  });
  renderStepLabel();
}

// ---- SOURCE SERVER COMBO ---------------------------------------------
function buildSourceServerOptions() {
  const input = document.getElementById("sourceServer");
  const list = document.getElementById("sourceServerList");
  const all = [];
  for (let i = 100; i <= 300; i++) {
    if (i === 288) continue; // can't migrate from 288 to 288
    all.push(i);
  }
  function render(filter) {
    list.innerHTML = "";
    const matches = all.filter((n) => String(n).startsWith(filter)).slice(0, 30);
    if (!filter || matches.length === 0) {
      list.classList.remove("open");
      return;
    }
    matches.forEach((n) => {
      const opt = document.createElement("div");
      opt.className = "combo-option";
      opt.textContent = n;
      opt.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = n;
        state.data.sourceServer = String(n);
        list.classList.remove("open");
        clearError("sourceServer");
      });
      list.appendChild(opt);
    });
    list.classList.add("open");
  }
  input.addEventListener("input", () => {
    state.data.sourceServer = input.value.trim();
    render(input.value.trim());
  });
  input.addEventListener("focus", () => render(input.value.trim()));
  input.addEventListener("blur", () => setTimeout(() => list.classList.remove("open"), 120));
}

// ---- APC BLOCKS ---------------------------------------------------------
function buildApcBlocks(preserve) {
  const container = document.getElementById("apcContainer");
  container.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const idx = i + 1;
    const isOptional = idx === 4;
    const block = document.createElement("div");
    block.className = "apc-block";
    block.innerHTML = `
      <div class="apc-block-title">${t("apc" + idx + "Title", state.lang)}</div>
      <div class="field">
        <label class="field-label">
          <span class="tag ${isOptional ? "tag-optional" : "tag-required"}">${t(isOptional ? "optional" : "mandatory", state.lang)}</span>
          ${t("apcFaction", state.lang)}
        </label>
        <div class="choice-group" id="apcFactionGroup${i}">
          ${FACTIONS.map((f) => `<button type="button" class="choice-btn" data-value="${f}" data-idx="${i}">${t(FACTION_KEYS[f], state.lang)}</button>`).join("")}
        </div>
        <div class="field-error" id="err_apcFaction${i}"></div>
      </div>
      <div class="field">
        <label class="field-label">
          <span class="tag ${isOptional ? "tag-optional" : "tag-required"}">${t(isOptional ? "optional" : "mandatory", state.lang)}</span>
          ${t("apcPower", state.lang)}
        </label>
        <div class="power-input">
          <input type="text" inputmode="decimal" id="apcPowerVal${i}" placeholder="${t("powerPlaceholder", state.lang)}" />
          <select id="apcPowerUnit${i}">
            <option value="M">M</option>
            <option value="G">G</option>
          </select>
        </div>
        <div class="field-error" id="err_apcPower${i}"></div>
      </div>
    `;
    container.appendChild(block);
  }

  // wire faction buttons + restore state
  for (let i = 0; i < 4; i++) {
    document.querySelectorAll(`#apcFactionGroup${i} .choice-btn`).forEach((btn) => {
      btn.classList.toggle("selected", state.data.apc[i].faction === btn.dataset.value);
      btn.addEventListener("click", () => {
        state.data.apc[i].faction = btn.dataset.value;
        document.querySelectorAll(`#apcFactionGroup${i} .choice-btn`).forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        clearError("apcFaction" + i);
      });
    });
    const valInput = document.getElementById("apcPowerVal" + i);
    const unitSel = document.getElementById("apcPowerUnit" + i);
    valInput.value = state.data.apc[i].power || "";
    unitSel.value = state.data.apc[i].unit || "M";
    valInput.addEventListener("input", () => {
      state.data.apc[i].power = valInput.value;
      clearError("apcPower" + i);
    });
    unitSel.addEventListener("change", () => { state.data.apc[i].unit = unitSel.value; });
  }
}

// ---- CHOICE BUTTON WIRING (generic) ---------------------------------
function wireChoiceGroup(groupId, stateKey, onSelect) {
  document.querySelectorAll(`#${groupId} .choice-btn`).forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(`#${groupId} .choice-btn`).forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.data[stateKey] = btn.dataset.value;
      clearError(stateKey);
      if (onSelect) onSelect(btn.dataset.value);
    });
  });
}

function wireEvents() {
  wireChoiceGroup("migrationTypeGroup", "migrationType", (val) => {
    document.getElementById("groupSizeField").style.display = val === "Group" ? "block" : "none";
  });
  wireChoiceGroup("targetAllianceGroup", "targetAlliance");
  wireChoiceGroup("seasonGroup", "season");
  wireChoiceGroup("bgbGroup", "bgb");

  ["allianceName", "playerName", "migrationId"].forEach((id) => {
    document.getElementById(id).addEventListener("input", (e) => {
      state.data[id] = e.target.value;
      clearError(id);
    });
  });
  document.getElementById("migrationScore").addEventListener("input", (e) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    state.data.migrationScore = digits;
    e.target.value = digits ? Number(digits).toLocaleString("en-US") : "";
    clearError("migrationScore");
  });
  document.getElementById("groupSize").addEventListener("input", (e) => {
    state.data.groupSize = e.target.value;
    clearError("groupSize");
  });

  document.getElementById("toStep2").addEventListener("click", () => { if (validateStep1()) goStep(2); });
  document.getElementById("toStep1Back").addEventListener("click", () => goStep(1));
  document.getElementById("toStep3").addEventListener("click", () => { if (validateStep2()) goStep(3); });
  document.getElementById("toStep2Back").addEventListener("click", () => goStep(2));
  document.getElementById("toReview").addEventListener("click", () => { if (validateStep3()) { goStep(4); renderReview(); } });
  document.getElementById("reviewEdit").addEventListener("click", () => goStep(1));
  document.getElementById("submitBtn").addEventListener("click", submitRegistration);
  document.getElementById("copyLinkBtn").addEventListener("click", copyUpdateLink);
}

function goStep(n) {
  state.step = n;
  [1, 2, 3].forEach((i) => (document.getElementById("panel" + i).style.display = i === n ? "block" : "none"));
  document.getElementById("panelReview").style.display = n === 4 ? "block" : "none";
  document.getElementById("panelSuccess").style.display = "none";
  renderStepper();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---- VALIDATION -----------------------------------------------------------
function setError(field, msgKey) {
  const el = document.getElementById("err_" + field);
  const wrap = el ? el.closest(".field") : null;
  if (el) el.textContent = msgKey ? t(msgKey, state.lang) : "";
  if (wrap) wrap.classList.toggle("has-error", !!msgKey);
}
function clearError(field) { setError(field, null); }

function validateStep1() {
  let ok = true;
  const d = state.data;
  const server = Number(d.sourceServer);
  if (!d.sourceServer || isNaN(server) || server < 100 || server > 300 || server === 288) {
    setError("sourceServer", "errServerRange"); ok = false;
  } else clearError("sourceServer");

  ["allianceName", "playerName", "migrationId"].forEach((f) => {
    if (!d[f] || !d[f].trim()) { setError(f, "errRequired"); ok = false; } else clearError(f);
  });

  if (!d.migrationScore || d.migrationScore.length < 8 || d.migrationScore.length > 9) {
    setError("migrationScore", "errScoreDigits"); ok = false;
  } else clearError("migrationScore");

  if (!d.migrationType) { setError("migrationType", "errRequired"); ok = false; } else clearError("migrationType");

  if (d.migrationType === "Group") {
    const gs = Number(d.groupSize);
    if (!d.groupSize || isNaN(gs) || gs < 2 || !Number.isInteger(gs)) {
      setError("groupSize", "errGroupSize"); ok = false;
    } else clearError("groupSize");
  }

  if (!d.targetAlliance) { setError("targetAlliance", "errRequired"); ok = false; } else clearError("targetAlliance");

  return ok;
}

function validPowerString(v) {
  if (!v) return false;
  return /^\d+(\.\d+)?$/.test(v.trim());
}

function validateStep2() {
  let ok = true;
  for (let i = 0; i < 4; i++) {
    const apc = state.data.apc[i];
    const isOptional = i === 3;
    const hasFaction = !!apc.faction;
    const hasPower = validPowerString(apc.power);

    if (isOptional) {
      const anyFilled = hasFaction || (apc.power && apc.power.trim());
      if (anyFilled) {
        if (!hasFaction) { setError("apcFaction" + i, "errRequired"); ok = false; } else clearError("apcFaction" + i);
        if (!hasPower) { setError("apcPower" + i, "errPower"); ok = false; } else clearError("apcPower" + i);
      } else {
        clearError("apcFaction" + i); clearError("apcPower" + i);
      }
    } else {
      if (!hasFaction) { setError("apcFaction" + i, "errRequired"); ok = false; } else clearError("apcFaction" + i);
      if (!hasPower) { setError("apcPower" + i, "errPower"); ok = false; } else clearError("apcPower" + i);
    }
  }
  return ok;
}

function validateStep3() {
  let ok = true;
  if (!state.data.season) { setError("season", "errRequired"); ok = false; } else clearError("season");
  if (!state.data.bgb) { setError("bgb", "errRequired"); ok = false; } else clearError("bgb");
  return ok;
}

// ---- REVIEW ---------------------------------------------------------------
function powerDisplay(apc) {
  if (!apc.faction && !apc.power) return "—";
  return `${t(FACTION_KEYS[apc.faction] || apc.faction, state.lang)} — ${apc.power || "?"} ${apc.unit}`;
}

function reviewRow(labelKey, value) {
  return `<div class="review-row"><span class="k">${t(labelKey, state.lang)}</span><span class="v">${value}</span></div>`;
}

function renderReview() {
  const d = state.data;
  document.getElementById("reviewPlayerRows").innerHTML =
    reviewRow("sourceServer", d.sourceServer) +
    reviewRow("allianceName", escapeHtml(d.allianceName)) +
    reviewRow("playerName", escapeHtml(d.playerName)) +
    reviewRow("migrationId", escapeHtml(d.migrationId)) +
    reviewRow("migrationScore", Number(d.migrationScore || 0).toLocaleString("en-US")) +
    reviewRow("migrationType", t(d.migrationType === "Group" ? "typeGroup" : "typeIndividual", state.lang)) +
    (d.migrationType === "Group" ? reviewRow("groupSize", d.groupSize) : "") +
    reviewRow("targetAlliance", d.targetAlliance === "Not decided" ? t("targetNotDecided", state.lang) : d.targetAlliance);

  document.getElementById("reviewApcRows").innerHTML = d.apc.map((apc, i) =>
    reviewRow("apc" + (i + 1) + "Title", powerDisplay(apc))
  ).join("");

  document.getElementById("reviewAvailRows").innerHTML =
    reviewRow("seasonAvailability", t("avail" + capitalize(d.season), state.lang)) +
    reviewRow("bgbAvailability", t("bgb" + (d.bgb || "").slice(0, 2), state.lang));
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- BACKEND CALLS ----------------------------------------------------
// Sent as text/plain to avoid a CORS preflight against Apps Script.
async function callApi(payload) {
  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf("PASTE_YOUR") === 0) {
    throw new Error("API_NOT_CONFIGURED");
  }
  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("HTTP_" + res.status);
  return res.json();
}

function showBanner(msgKey) {
  const el = document.getElementById("banner");
  el.innerHTML = `<div class="banner banner-error">${t(msgKey, state.lang)}</div>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function clearBanner() { document.getElementById("banner").innerHTML = ""; }

async function submitRegistration() {
  clearBanner();
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.innerHTML = `<span class="spinner"></span>${t("submitting", state.lang)}`;

  const payload = {
    action: state.updateId ? "update" : "submit",
    updateId: state.updateId || undefined,
    lang: state.lang,
    ...state.data,
  };

  try {
    const resp = await callApi(payload);
    if (resp.ok) {
      if (state.updateId) {
        showSuccessAfterUpdate();
      } else {
        showSuccess(resp.reference, resp.updateId);
      }
    } else if (resp.error === "duplicate") {
      showBanner("errDuplicate");
    } else if (resp.error === "locked") {
      showBanner("updateLocked");
    } else {
      showBanner("errGeneric");
    }
  } catch (e) {
    if (e.message === "API_NOT_CONFIGURED") {
      showBanner("errGeneric");
      console.error("Set CONFIG.API_URL in app.js to your deployed Apps Script Web App URL.");
    } else {
      showBanner("errNetwork");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function showSuccess(reference, updateId) {
  document.getElementById("panelReview").style.display = "none";
  document.getElementById("panelSuccess").style.display = "block";
  document.getElementById("refNumber").textContent = reference;
  const link = `${window.location.origin}${window.location.pathname}?update=${encodeURIComponent(updateId)}`;
  document.getElementById("updateLinkInput").value = link;
  document.getElementById("statusPill").textContent = t("statusUnlocked", state.lang);
  document.getElementById("statusPill").className = "status-pill status-unlocked";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSuccessAfterUpdate() {
  document.getElementById("panelReview").style.display = "none";
  document.getElementById("panelSuccess").style.display = "block";
  document.getElementById("successTitleEl").textContent = t("successTitle", state.lang);
  document.getElementById("successMessageEl").textContent = t("successMessage", state.lang);
  document.getElementById("refNumber").parentElement.style.display = "none";
  document.getElementById("updateLinkInput").value = window.location.href;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function copyUpdateLink() {
  const input = document.getElementById("updateLinkInput");
  input.select();
  navigator.clipboard && navigator.clipboard.writeText(input.value).catch(() => {});
  const btn = document.getElementById("copyLinkBtn");
  const original = btn.textContent;
  btn.textContent = t("btnCopied", state.lang);
  setTimeout(() => (btn.textContent = original), 1500);
}

// ---- UPDATE MODE ------------------------------------------------------
async function loadForUpdate(updateId) {
  document.querySelectorAll(".step-panel").forEach((p) => (p.style.display = "none"));
  const loadingBanner = document.createElement("div");
  loadingBanner.className = "banner banner-info";
  loadingBanner.textContent = t("loading", state.lang);
  document.getElementById("banner").appendChild(loadingBanner);

  try {
    const resp = await callApi({ action: "getForUpdate", updateId });
    clearBanner();
    if (!resp.ok) {
      showBanner("updateLoadError");
      return;
    }
    const rec = resp.record;
    state.isLocked = resp.status === "Locked";
    document.getElementById("submitBtn").textContent = t("btnUpdate", state.lang);

    // populate state
    Object.assign(state.data, rec);
    document.getElementById("sourceServer").value = rec.sourceServer || "";
    document.getElementById("allianceName").value = rec.allianceName || "";
    document.getElementById("playerName").value = rec.playerName || "";
    document.getElementById("migrationId").value = rec.migrationId || "";
    document.getElementById("migrationScore").value = rec.migrationScore ? Number(rec.migrationScore).toLocaleString("en-US") : "";
    if (rec.migrationType) document.querySelector(`#migrationTypeGroup [data-value="${rec.migrationType}"]`)?.classList.add("selected");
    if (rec.migrationType === "Group") document.getElementById("groupSizeField").style.display = "block";
    document.getElementById("groupSize").value = rec.groupSize || "";
    if (rec.targetAlliance) document.querySelector(`#targetAllianceGroup [data-value="${rec.targetAlliance}"]`)?.classList.add("selected");
    buildApcBlocks(true);
    if (rec.season) document.querySelector(`#seasonGroup [data-value="${rec.season}"]`)?.classList.add("selected");
    if (rec.bgb) document.querySelector(`#bgbGroup [data-value="${rec.bgb}"]`)?.classList.add("selected");

    if (state.isLocked) {
      showBanner("updateLocked");
      document.querySelectorAll("input, select, button.choice-btn, #submitBtn").forEach((el) => (el.disabled = true));
    } else {
      goStep(1);
    }
  } catch (e) {
    clearBanner();
    showBanner(e.message === "API_NOT_CONFIGURED" ? "errGeneric" : "errNetwork");
  }
}
