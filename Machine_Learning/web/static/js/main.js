/* =========================================================================
   K-MEANS DASHBOARD — FRONTEND LOGIC
   API base: /api/*   |  All fetch calls are relative (same-origin Flask)
   ========================================================================= */

const API = "";   // Flask serves on same origin

// ── State ─────────────────────────────────────────────────────────────────
let currentTab = "overview";
let currentGallery = [];           // Array of {url, name} for lightbox
let lightboxIdx = 0;

// Active version per segment (library / nolibrary)
const activeVersion = {
  rfm:            "library",
  demographic:    "library",
  productchannel: "library",
};

// Active processing sub-tab
let activeProcessing = "analysis";

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initApp();
  document.addEventListener("keydown", handleKeyboard);
});

async function initApp() {
  await checkServer();
  await loadOverview();
  await loadSegmentMetricsQuick();
}

// ── Server health ──────────────────────────────────────────────────────────
async function checkServer() {
  try {
    const r = await fetch(`${API}/api/overview`);
    if (r.ok) {
      setStatus("online", "API Online");
    } else {
      setStatus("error", "API Error");
    }
  } catch {
    setStatus("error", "Không kết nối được API");
  }
}

function setStatus(cls, text) {
  const dot  = document.getElementById("statusDot");
  const label = document.getElementById("statusText");
  dot.className = `status-dot ${cls}`;
  label.textContent = text;
}

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(tab) {
  // Hide all tabs, deactivate all nav
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));

  document.getElementById(`tab-${tab}`).classList.add("active");
  const navEl = document.getElementById(`nav-${tab}`);
  if (navEl) navEl.classList.add("active");

  currentTab = tab;
  document.getElementById("topbarTitle").textContent = navEl ? navEl.textContent.trim() : tab;

  // Lazy-load tab content
  if (tab === "rfm")            loadClusterTab("rfm", activeVersion.rfm);
  if (tab === "demographic")    loadClusterTab("demographic", activeVersion.demographic);
  if (tab === "productchannel") loadClusterTab("productchannel", activeVersion.productchannel);
  if (tab === "processing")     loadProcessingTab(activeProcessing);
  if (tab === "dataset")        loadDataset();
  if (tab === "metrics")        loadMetricsComparison();

  // Mobile: close sidebar
  if (window.innerWidth < 900) {
    document.getElementById("sidebar").classList.remove("open");
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ── Overview ───────────────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const data = await apiFetch("/api/overview");
    animateCounter("kpi-customers", data.total_customers);
    animateCounter("kpi-features", data.total_features);
  } catch (e) {
    console.error("Overview error", e);
  }
}

async function loadSegmentMetricsQuick() {
  const segments = [
    { key: "rfm",            el: "seg-rfm-metric",  label: "RFM" },
    { key: "demographic",    el: "seg-demo-metric",  label: "Demographic" },
    { key: "productchannel", el: "seg-pc-metric",    label: "Product & Channel" },
  ];
  for (const seg of segments) {
    try {
      const m = await apiFetch(`/api/metrics/${seg.key}`);
      const el = document.getElementById(seg.el);
      if (el && m.silhouette_score !== undefined) {
        el.textContent =
          `Silhouette: ${m.silhouette_score.toFixed(4)}  |  DB Index: ${m.davies_bouldin_index.toFixed(4)}  |  Clusters: ${m.n_clusters}`;
      } else if (el) {
        el.textContent = "Metrics: chưa có nhãn cụm trong CSV";
      }
    } catch {
      /* no-op */
    }
  }
}

// ── Cluster tabs ───────────────────────────────────────────────────────────
async function loadClusterTab(segment, version) {
  activeVersion[segment] = version;

  // Toggle buttons
  ["library","nolibrary"].forEach(v => {
    const btn = document.getElementById(`${segment}-btn-${v}`);
    if (btn) btn.classList.toggle("active", v === version);
  });

  const galleryEl = document.getElementById(`${segment}-gallery`);
  const metricsEl = document.getElementById(`${segment}-metrics-bar`);

  // Show spinner
  galleryEl.innerHTML = spinnerHTML();
  if (metricsEl) metricsEl.innerHTML = "";

  const graphKey = `${segment}_${version}`;

  try {
    const [graphsData, metricsData] = await Promise.all([
      apiFetch(`/api/graphs/${graphKey}`),
      apiFetch(`/api/metrics/${segment}`).catch(() => null),
    ]);

    // Metrics bar
    if (metricsEl && metricsData && metricsData.silhouette_score !== undefined) {
      metricsEl.innerHTML = `
        <div class="metric-pill"><span class="label">Silhouette</span><span class="value">${metricsData.silhouette_score.toFixed(4)}</span></div>
        <div class="metric-pill"><span class="label">Davies-Bouldin</span><span class="value">${metricsData.davies_bouldin_index.toFixed(4)}</span></div>
        <div class="metric-pill"><span class="label">Clusters</span><span class="value">${metricsData.n_clusters}</span></div>
        <div class="metric-pill"><span class="label">Rows</span><span class="value">${metricsData.n_rows.toLocaleString()}</span></div>
      `;
    }

    // Gallery
    const files = graphsData.files || [];
    if (files.length === 0) {
      galleryEl.innerHTML = `<div class="loading-state">📂 Không tìm thấy biểu đồ</div>`;
      return;
    }

    currentGallery = files.map(f => ({
      url:  `${API}/api/graph/${graphKey}/${f}`,
      name: f,
    }));

    galleryEl.innerHTML = files.map((f, i) => `
      <div class="gallery-card" onclick="openLightbox(${i})">
        <img src="${API}/api/graph/${graphKey}/${f}"
             alt="${f}"
             loading="lazy"
             onerror="this.src='';this.parentElement.style.display='none'" />
        <div class="gallery-card-overlay">
          <span class="overlay-icon">🔍</span>
        </div>
        <div class="gallery-card-footer">
          <span class="graph-name">${formatGraphName(f)}</span>
          <span class="gallery-zoom">⤢</span>
        </div>
      </div>
    `).join("");

  } catch (e) {
    galleryEl.innerHTML = `<div class="loading-state">⚠️ Lỗi tải biểu đồ: ${e.message}</div>`;
  }
}

// ── Processing tab ─────────────────────────────────────────────────────────
const PROC_MAP = {
  analysis: "processing_analysis",
  cleaning: "processing_cleaning",
  feature:  "feature_rfm",
};

async function loadProcessingTab(sub) {
  activeProcessing = sub;

  // Toggle buttons
  ["analysis","cleaning","feature"].forEach(k => {
    const btn = document.getElementById(`proc-btn-${k}`);
    if (btn) btn.classList.toggle("active", k === sub);
  });

  const galleryEl = document.getElementById("processing-gallery");
  galleryEl.innerHTML = spinnerHTML();

  const graphKey = PROC_MAP[sub];
  try {
    const data = await apiFetch(`/api/graphs/${graphKey}`);
    const files = data.files || [];

    if (files.length === 0) {
      galleryEl.innerHTML = `<div class="loading-state">📂 Không tìm thấy biểu đồ</div>`;
      return;
    }

    currentGallery = files.map(f => ({
      url:  `${API}/api/graph/${graphKey}/${f}`,
      name: f,
    }));

    galleryEl.innerHTML = files.map((f, i) => `
      <div class="gallery-card" onclick="openLightbox(${i})">
        <img src="${API}/api/graph/${graphKey}/${f}"
             alt="${f}"
             loading="lazy"
             onerror="this.src='';this.parentElement.style.display='none'" />
        <div class="gallery-card-overlay"><span class="overlay-icon">🔍</span></div>
        <div class="gallery-card-footer">
          <span class="graph-name">${formatGraphName(f)}</span>
          <span class="gallery-zoom">⤢</span>
        </div>
      </div>
    `).join("");
  } catch (e) {
    galleryEl.innerHTML = `<div class="loading-state">⚠️ ${e.message}</div>`;
  }
}

// ── Dataset Explorer ───────────────────────────────────────────────────────
let datasetLoaded = false;

async function loadDataset() {
  if (datasetLoaded) return;
  const wrapper = document.getElementById("datasetTableWrapper");
  wrapper.innerHTML = spinnerHTML();

  try {
    const data = await apiFetch("/api/dataset/sample");
    const { columns, rows } = data;

    const thead = `<tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr>`;
    const tbody = rows.map(r =>
      `<tr>${r.map(cell => `<td>${cell !== null && cell !== "" ? cell : "—"}</td>`).join("")}</tr>`
    ).join("");

    wrapper.innerHTML = `<table class="data-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
    datasetLoaded = true;
  } catch (e) {
    wrapper.innerHTML = `<div class="loading-state">⚠️ ${e.message}</div>`;
  }
}

// ── Metrics Comparison ─────────────────────────────────────────────────────
let metricsLoaded = false;

const SEG_LABELS = {
  rfm:            { name: "RFM",               badge: "rfm",  icon: "◉" },
  demographic:    { name: "Nhân khẩu học",      badge: "demo", icon: "◉" },
  productchannel: { name: "Sản phẩm & Kênh",   badge: "pc",   icon: "◉" },
};

async function loadMetricsComparison() {
  if (metricsLoaded) return;
  const grid = document.getElementById("metricsCompGrid");
  grid.innerHTML = spinnerHTML();

  try {
    const data = await apiFetch("/api/summary");
    const cards = Object.entries(data).map(([seg, m]) => {
      const meta = SEG_LABELS[seg] || { name: seg, badge: "rfm", icon: "◉" };

      if (m.error) return `
        <div class="metric-comp-card">
          <div class="mcc-title">${meta.icon} ${meta.name}</div>
          <p style="color:var(--text-muted);font-size:13px">⚠️ ${m.error}</p>
        </div>`;

      const silColor = m.silhouette_score > 0.5 ? "val-good" :
                       m.silhouette_score > 0.25 ? "val-moderate" : "val-info";
      const dbColor  = m.davies_bouldin_index < 1 ? "val-good" :
                       m.davies_bouldin_index < 2 ? "val-moderate" : "val-info";

      const distHTML = m.cluster_distribution
        ? Object.entries(m.cluster_distribution).map(([k,v]) =>
            `<span class="dist-pill">C${k}: ${v.toLocaleString()}</span>`
          ).join("")
        : "";

      return `
        <div class="metric-comp-card">
          <div class="mcc-title">
            ${meta.icon} ${meta.name}
            <span class="seg-badge ${meta.badge} mcc-badge">${meta.badge.toUpperCase()}</span>
          </div>
          <div class="mcc-metric-row">
            <span class="mcc-metric-name">Silhouette Score ↑</span>
            <span class="mcc-metric-val ${silColor}">${(m.silhouette_score || 0).toFixed(4)}</span>
          </div>
          <div class="mcc-metric-row">
            <span class="mcc-metric-name">Davies-Bouldin ↓</span>
            <span class="mcc-metric-val ${dbColor}">${(m.davies_bouldin_index || 0).toFixed(4)}</span>
          </div>
          <div class="mcc-metric-row">
            <span class="mcc-metric-name">Số cụm</span>
            <span class="mcc-metric-val val-info">${m.n_clusters || "—"}</span>
          </div>
          <div class="mcc-metric-row">
            <span class="mcc-metric-name">Số khách hàng</span>
            <span class="mcc-metric-val">${(m.n_rows || 0).toLocaleString()}</span>
          </div>
          ${distHTML ? `<div class="cluster-dist">${distHTML}</div>` : ""}
        </div>`;
    }).join("");

    grid.innerHTML = cards;
    metricsLoaded = true;
  } catch (e) {
    grid.innerHTML = `<div class="loading-state">⚠️ ${e.message}</div>`;
  }
}

// ── Lightbox ───────────────────────────────────────────────────────────────
function openLightbox(idx) {
  lightboxIdx = idx;
  renderLightbox();
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
}

function lightboxNav(dir) {
  lightboxIdx = (lightboxIdx + dir + currentGallery.length) % currentGallery.length;
  renderLightbox();
}

function renderLightbox() {
  const item = currentGallery[lightboxIdx];
  if (!item) return;
  document.getElementById("lightboxImg").src = item.url;
  document.getElementById("lightboxCaption").textContent =
    `${formatGraphName(item.name)}  (${lightboxIdx + 1} / ${currentGallery.length})`;

  const showNav = currentGallery.length > 1;
  document.getElementById("lbPrev").style.display = showNav ? "flex" : "none";
  document.getElementById("lbNext").style.display = showNav ? "flex" : "none";
}

function handleKeyboard(e) {
  const lb = document.getElementById("lightbox");
  if (!lb.classList.contains("open")) return;
  if (e.key === "Escape")     closeLightbox();
  if (e.key === "ArrowLeft")  lightboxNav(-1);
  if (e.key === "ArrowRight") lightboxNav(1);
}

// ── Animated counter ───────────────────────────────────────────────────────
function animateCounter(cardId, target) {
  const el = document.querySelector(`#${cardId} .kpi-value`);
  if (!el || !target) return;
  let current = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString();
    if (current >= target) clearInterval(timer);
  }, 16);
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function spinnerHTML() {
  return `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div><p>Đang tải...</p></div>`;
}

function formatGraphName(filename) {
  return filename
    .replace(/\.png$/i, "")
    .replace(/_/g, " ")
    .replace(/^\d+_/, "");
}
