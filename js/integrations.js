;(() => {
  if (!window.OL) {
    console.error("integrations.js: OL not loaded");
    return;
  }

  const OL = window.OL;
  const { state, utils, persist } = OL;
  const { esc } = utils;

  // Ensure collection
  if (!Array.isArray(state.integrationsMatrix)) {
    state.integrationsMatrix = [];
  }

  // Seed one sample Calendly <-> Wealthbox relationship if empty
  if (state.integrationsMatrix.length === 0 && state.apps && state.apps.length) {
    const calendly = state.apps.find(a => /calendly/i.test(a.name));
    const wb       = state.apps.find(a => /wealthbox/i.test(a.name));
    if (calendly && wb) {
      state.integrationsMatrix.push({
        id: utils.uid(),
        aId: calendly.id,
        bId: wb.id,
        category: "Scheduling",
        aToB: {
          type: "zapier",
          actions: [
            "Meeting booked → create contact in CRM",
            "Meeting booked → create task / workflow"
          ]
        },
        bToA: {
          type: "direct",
          actions: [
            "Update scheduling link from CRM fields"
          ]
        }
      });
      persist();
    }
  }

  // View modes: flip | one-way | bi
  state.integrationsViewMode = state.integrationsViewMode || "flip";

  // ============================================================
  // PUBLIC ENTRY: RENDER TECH COMPARISON ROUTE
  // ============================================================
  OL.renderTechComparison = function () {
    const view = document.getElementById("view");
    if (!view) return;

    OL.updateBreadcrumb && OL.updateBreadcrumb("/ Apps / Tech Comparison");

    view.innerHTML = `
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="row" style="gap:8px;align-items:center;">
            <h2 style="margin:0;font-size:16px;">Integration Cards</h2>
            <span class="muted" style="font-size:12px;">App-to-app flows with direction + actions</span>
          </div>
          <div class="seg-group">
            <button class="seg-btn ${state.integrationsViewMode === "flip" ? "active" : ""}" data-int-view="flip">Flip</button>
            <button class="seg-btn ${state.integrationsViewMode === "one-way" ? "active" : ""}" data-int-view="one-way">One Direction</button>
            <button class="seg-btn ${state.integrationsViewMode === "bi" ? "active" : ""}" data-int-view="bi">Bi-Directional</button>
          </div>
        </div>
        <div id="integrationsCards" class="grid cols-2"></div>
      </div>
    `;

    // Wire toggle
    view.querySelectorAll("[data-int-view]").forEach(btn => {
      btn.onclick = () => {
        state.integrationsViewMode = btn.dataset.intView;
        persist();
        OL.renderTechComparison();
      };
    });

    renderCards();
  };

  // ============================================================
  // CARD RENDERING
  // ============================================================
  function renderCards() {
    const container = document.getElementById("integrationsCards");
    if (!container) return;
    container.innerHTML = "";

    const rels = state.integrationsMatrix || [];
    if (!rels.length) {
      container.innerHTML = `<div class="muted">No integrations mapped yet.</div>`;
      return;
    }

    rels.forEach(rel => {
      const a = state.apps.find(x => x.id === rel.aId);
      const b = state.apps.find(x => x.id === rel.bId);
      if (!a || !b) return;

      const card = document.createElement("div");
      card.className = "card integration-card";

      if (state.integrationsViewMode === "flip") {
        card.innerHTML = buildFlipCard(rel, a, b);
      } else if (state.integrationsViewMode === "one-way") {
        card.innerHTML = buildOneWayCard(rel, a, b);
      } else {
        card.innerHTML = buildBiCard(rel, a, b);
      }

      // Wire flip control (for flip mode)
      if (state.integrationsViewMode === "flip") {
        wireFlip(card, rel);
      }

      container.appendChild(card);
    });
  }

  // ------------------------------------------------------------
  // FLIP VIEW: single card, two arrows stacked, top arrow = active dir
  // ------------------------------------------------------------
  function buildFlipCard(rel, a, b) {
    const dir = rel._activeDir || "aToB"; // aToB or bToA
    const forward = dir === "aToB";
    const from = forward ? a : b;
    const to   = forward ? b : a;
    const data = forward ? rel.aToB : rel.bToA;

    const forwardArrowClass = forward ? "arrow active" : "arrow";
    const backwardArrowClass = !forward ? "arrow active" : "arrow";

    const typeClass = getTypeClass(data.type);

    return `
      <div class="row integration-header">
        <div class="row app-pair">
          ${OL.appIconHTML(from)}
          <span class="app-name">${esc(from.name)}</span>
          <div class="flip-arrows">
            <span class="${forwardArrowClass}">➜</span>
            <span class="${backwardArrowClass}">➜</span>
          </div>
          <span class="app-name">${esc(to.name)}</span>
          ${OL.appIconHTML(to)}
        </div>
        <span class="pill category-pill" style="background:${categoryColor(rel.category)}">
          ${esc(rel.category || "Uncategorized")}
        </span>
      </div>
      <div class="integration-body ${typeClass}">
        <div class="muted" style="font-size:11px;margin-bottom:4px;">
          ${labelType(data.type)} integration from <strong>${esc(from.name)}</strong> to <strong>${esc(to.name)}</strong>
        </div>
        <ul class="integration-actions">
          ${(data.actions || []).map(a => `<li>${esc(a)}</li>`).join("") || "<li class='muted'>No actions defined yet.</li>"}
        </ul>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn small ghost flip-toggle" data-rel-id="${rel.id}">Flip Direction</button>
        </div>
      </div>
    `;
  }

  function wireFlip(card, rel) {
    const btn = card.querySelector(".flip-toggle");
    if (!btn) return;
    btn.onclick = () => {
      rel._activeDir = rel._activeDir === "bToA" ? "aToB" : "bToA";
      persist();
      OL.renderTechComparison();
    };
  }

  // ------------------------------------------------------------
  // ONE DIRECTION VIEW: two cards (A→B and B→A separately)
  // ------------------------------------------------------------
  function buildOneWayCard(rel, a, b) {
    // We render combined DOM for both directions, but visually as two “sub-cards”
    return `
      <div class="one-way-wrapper">
        ${buildOneWaySub(rel, a, b, "aToB")}
        ${buildOneWaySub(rel, b, a, "bToA")}
      </div>
    `;
  }

  function buildOneWaySub(rel, from, to, key) {
    const data = rel[key];
    if (!data) return "";
    const typeClass = getTypeClass(data.type);

    return `
      <div class="one-way-card ${typeClass}">
        <div class="row app-pair">
          ${OL.appIconHTML(from)}
          <span class="app-name">${esc(from.name)}</span>
          <span class="arrow single">➜</span>
          <span class="app-name">${esc(to.name)}</span>
          ${OL.appIconHTML(to)}
        </div>
        <div class="row" style="justify-content:space-between;align-items:center;margin:6px 0 4px;">
          <span class="pill category-pill" style="background:${categoryColor(rel.category)}">
            ${esc(rel.category || "Uncategorized")}
          </span>
          <span class="muted" style="font-size:11px;">${labelType(data.type)} integration</span>
        </div>
        <ul class="integration-actions">
          ${(data.actions || []).map(a => `<li>${esc(a)}</li>`).join("") || "<li class='muted'>No actions defined yet.</li>"}
        </ul>
      </div>
    `;
  }

  // ------------------------------------------------------------
  // BI-DIRECTIONAL VIEW: single card, showing both directions with <-> label
  // ------------------------------------------------------------
  function buildBiCard(rel, a, b) {
    const aType = labelType(rel.aToB?.type);
    const bType = labelType(rel.bToA?.type);

    const biType = combineTypes(rel.aToB?.type, rel.bToA?.type);
    const typeClass = getTypeClass(biType);

    return `
      <div class="bi-card ${typeClass}">
        <div class="row app-pair">
          ${OL.appIconHTML(a)}
          <span class="app-name">${esc(a.name)}</span>
          <span class="arrow bi">⇄</span>
          <span class="app-name">${esc(b.name)}</span>
          ${OL.appIconHTML(b)}
        </div>
        <div class="row" style="justify-content:space-between;align-items:center;margin:6px 0 4px;">
          <span class="pill category-pill" style="background:${categoryColor(rel.category)}">
            ${esc(rel.category || "Uncategorized")}
          </span>
          <span class="muted" style="font-size:11px;">
            ${aType || "—"} from ${esc(a.name)} · ${bType || "—"} from ${esc(b.name)}
          </span>
        </div>

        <div class="grid cols-2">
          <div>
            <div class="muted" style="font-size:11px;margin-bottom:4px;">
              ${esc(a.name)} ➜ ${esc(b.name)}
            </div>
            <ul class="integration-actions">
              ${(rel.aToB?.actions || []).map(x => `<li>${esc(x)}</li>`).join("") || "<li class='muted'>No actions.</li>"}
            </ul>
          </div>
          <div>
            <div class="muted" style="font-size:11px;margin-bottom:4px;">
              ${esc(b.name)} ➜ ${esc(a.name)}
            </div>
            <ul class="integration-actions">
              ${(rel.bToA?.actions || []).map(x => `<li>${esc(x)}</li>`).join("") || "<li class='muted'>No actions.</li>"}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function labelType(t) {
    if (t === "zapier") return "Zapier";
    if (t === "direct") return "Direct";
    if (t === "both") return "Direct + Zapier";
    return "Unknown";
  }

  function getTypeClass(t) {
    if (t === "zapier") return "int-zapier";
    if (t === "direct") return "int-direct";
    if (t === "both") return "int-both";
    return "int-unknown";
  }

  function categoryColor(cat) {
    if (!cat) return "rgba(148, 163, 184, 0.25)";
    const key = cat.toLowerCase();
    if (key.includes("sched")) return "rgba(31, 211, 189, 0.22)";
    if (key.includes("email")) return "rgba(96, 165, 250, 0.22)";
    if (key.includes("crm")) return "rgba(244, 114, 182, 0.22)";
    return "rgba(148, 163, 184, 0.2)";
  }

  function combineTypes(aType, bType) {
    const s = new Set([aType, bType].filter(Boolean));
    if (s.size === 1) return [...s][0];
    if (s.size === 0) return "unknown";
    return "both";
  }

})();
