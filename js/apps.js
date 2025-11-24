;(() => {
  if (!window.OL) {
    console.error("apps.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { state } = OL;
  const { esc } = OL.utils;

  // -------------------------
  // Helpers
  // -------------------------

  function byNameWithZapierFirst(a, b) {
    const an = (a.name || "").toLowerCase();
    const bn = (b.name || "").toLowerCase();
    const az = an === "zapier";
    const bz = bn === "zapier";
    if (az && !bz) return -1;
    if (bz && !az) return 1;
    return an.localeCompare(bn);
  }

  function getZapierApp() {
    return (state.apps || []).find(
      a => (a.name || "").toLowerCase() === "zapier"
    ) || null;
  }

  // Build integration pair summary used in both apps + integrations views
  function buildIntegrationPairs() {
    const apps = state.apps || [];
    const zap = getZapierApp();
    const pairs = new Map(); // key: "aId|bId" (sorted)

    function pairKey(aId, bId) {
      return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
    }

    function bumpPair(aId, bId, type) {
      const key = pairKey(aId, bId);
      let rec = pairs.get(key);
      if (!rec) {
        rec = {
          appAId: aId < bId ? aId : bId,
          appBId: aId < bId ? bId : aId,
          direct: 0,
          zapier: 0,
          both: 0,
        };
        pairs.set(key, rec);
      }
      if (type === "both") rec.both++;
      else if (type === "direct") rec.direct++;
      else rec.zapier++;
    }

    // Manual integrations defined directly on each app
    apps.forEach(app => {
      (app.integrations || []).forEach(int => {
        const otherId = int.appId;
        const type = int.type || "zapier";
        if (!otherId) return;
        bumpPair(app.id, otherId, type);
      });
    });

    // Zapier-mediated implied connections
    if (zap) {
      const zapId = zap.id;
      const zapClients = apps.filter(a =>
        (a.integrations || []).some(
          int => int.appId === zapId && (int.type === "zapier" || int.type === "both")
        )
      );

      for (let i = 0; i < zapClients.length; i++) {
        for (let j = i + 1; j < zapClients.length; j++) {
          const a = zapClients[i];
          const b = zapClients[j];
          const key = pairKey(a.id, b.id);
          const existing = pairs.get(key);

          if (existing) {
            if (existing.direct > 0 && existing.zapier === 0 && existing.both === 0) {
              existing.both++;
              existing.zapier = 0;
            } else if (existing.zapier > 0 && existing.direct === 0 && existing.both === 0) {
              // keep as zapier-only
            } else if (existing.both > 0) {
              // already both
            } else {
              existing.zapier++;
            }
          } else {
            bumpPair(a.id, b.id, "zapier");
          }
        }
      }
    }

    return Array.from(pairs.values());
  }

  // Aggregate stats per app: functions + integrations
  function computeAppStats() {
    const stats = new Map();
    const apps = state.apps || [];

    // base counts from per-app functions
    apps.forEach(app => {
      stats.set(app.id, {
        fnCount: (app.functions || []).length,
        direct: 0,
        zapier: 0,
        both: 0,
      });
    });

    // aggregate integration data
    const pairs = buildIntegrationPairs();
    pairs.forEach(rec => {
      const a = stats.get(rec.appAId);
      const b = stats.get(rec.appBId);
      if (!a || !b) return;
      a.direct += rec.direct;
      a.zapier += rec.zapier;
      a.both   += rec.both;
      b.direct += rec.direct;
      b.zapier += rec.zapier;
      b.both   += rec.both;
    });

    return stats;
  }

  function nextFnState(s) {
    if (s === "primary") return "evaluating";
    if (s === "evaluating") return "available";
    return "primary";
  }

  // -------------------------
  // PUBLIC ENTRY
  // -------------------------

  OL.renderApps = function renderApps() {
    const container = document.getElementById("view-apps");
    if (!container) return;

    const appsSorted = [...(state.apps || [])].sort(byNameWithZapierFirst);

    container.innerHTML = `
      <section class="apps-section">
        <div class="section-header">
          <h1>Applications</h1>
          <div class="view-toggle" id="appsViewToggle">
            <button data-view="details">Details</button>
            <button data-view="grid">Icons</button>
          </div>
        </div>

        <div class="apps-legend">
          <span><strong>Status:</strong></span>
          <span class="legend-pill status-primary">Primary</span>
          <span class="legend-pill status-available">Available</span>
          <span class="legend-pill status-evaluating">Evaluating</span>
          <span class="legend-separator"></span>
          <span><strong>Integration:</strong></span>
          <span class="legend-pill int-direct">Direct</span>
          <span class="legend-pill int-zapier">Zapier</span>
          <span class="legend-pill int-both">Both</span>
          <span class="legend-separator"></span>
          <span class="legend-hint">Right-click pills to remove (in modals / functions)</span>
        </div>

        <div id="appsListContainer"></div>
        <div class="appsAddNew">
          <button class="btn small" id="addNewAppBtn">+ Add Application</button>
        </div>
      </section>

      <section class="apps-section">
        <div class="section-header">
          <h2>Functions</h2>
        </div>
        <div id="functionsCards" class="functions-grid"></div>
      </section>

      <section class="apps-section">
        <div class="section-header">
          <h2>Integrations</h2>
          <div class="view-toggle" id="integrationsViewToggle">
            <button data-mode="flip">Flip</button>
            <button data-mode="single">One-Direction</button>
            <button data-mode="both">Bi-Directional</button>
          </div>
        </div>
        <div id="integrationsCards" class="integrations-grid"></div>
      </section>
    `;

    wireAppsViewToggle();
    wireIntegrationsViewToggle();

    const addBtn = document.getElementById("addNewAppBtn");
    if (addBtn) addBtn.onclick = () => OL.openAppModalNew();

    renderAppsList(appsSorted);
    renderFunctionCards();
    renderIntegrationCards();
  };

  // -------------------------
  // APPS LIST (DETAILS / GRID)
  // -------------------------

  function wireAppsViewToggle() {
    const viewMode = state.appsViewMode || "details";
    state.appsViewMode = viewMode;

    const toggle = document.getElementById("appsViewToggle");
    if (!toggle) return;

    toggle.querySelectorAll("button").forEach(btn => {
      const v = btn.dataset.view;
      if (!v) return;

      if (v === viewMode) btn.classList.add("active");
      else btn.classList.remove("active");

      btn.onclick = () => {
        state.appsViewMode = v;
        OL.persist();
        wireAppsViewToggle();
        renderAppsList(
          [...(state.apps || [])].sort(byNameWithZapierFirst)
        );
      };
    });
  }

  function renderAppsList(appsSorted) {
    const container = document.getElementById("appsListContainer");
    if (!container) return;

    const mode = state.appsViewMode || "details";
    container.innerHTML = "";

    const stats = computeAppStats();

    if (mode === "grid") {
      // ICON GRID MODE
      const grid = document.createElement("div");
      grid.className = "card-grid card-grid--apps apps-grid";

      appsSorted.forEach(app => {
        const s = stats.get(app.id) || { fnCount:0, direct:0, zapier:0, both:0 };

        const card = document.createElement("div");
        card.className = "card app-card card--app";
        card.dataset.id = app.id;

        card.innerHTML = `
          <div class="card-header app-card-header">
            <div class="app-icon-box small">
              ${OL.appIconHTML(app)}
            </div>
            <div class="app-card-title-block">
              <div class="app-card-title">${esc(app.name || "")}</div>
              <div class="app-card-meta">
                <span>${s.fnCount || 0} functions</span>
              </div>
            </div>
          </div>
        `;

        card.onclick = () => OL.openAppModal(app.id);
        grid.appendChild(card);
      });

      container.appendChild(grid);
      return;
    }

    // DETAILS CARD MODE
    const list = document.createElement("div");
    list.className = "apps-list";

    appsSorted.forEach(app => {
      const s = stats.get(app.id) || { fnCount:0, direct:0, zapier:0, both:0 };

      const card = document.createElement("div");
      card.className = "card app-card card--app";
      card.dataset.id = app.id;

      card.innerHTML = `
        <div class="card-header app-card-header">
          <div class="app-icon-box small">
            ${OL.appIconHTML(app)}
          </div>
          <div class="app-card-title-block">
            <div class="app-card-title">${esc(app.name || "")}</div>
            <div class="app-card-meta">
              <span>${s.fnCount || 0} functions</span>
              <span>${s.direct}/${s.zapier}/${s.both} integrations</span>
            </div>
          </div>
        </div>
      `;

      card.onclick = () => OL.openAppModal(app.id);
      list.appendChild(card);
    });

    container.appendChild(list);
  }

  // -------------------------
  // FUNCTIONS CARDS
  // -------------------------

  function renderFunctionCards() {
    const box = document.getElementById("functionsCards");
    if (!box) return;
    box.innerHTML = "";

    const apps = state.apps || [];
    const fnMeta = new Map();      // functionId -> fn object
    const byFnId = new Map();      // functionId -> [{ app, assignment }, ...]

    (state.functions || []).forEach(fn => {
      if (fn && fn.id) fnMeta.set(fn.id, fn);
    });

    apps.forEach(app => {
      (app.functions || []).forEach(assign => {
        const fnId = assign.id;
        if (!fnId) return;
        if (!byFnId.has(fnId)) byFnId.set(fnId, []);
        byFnId.get(fnId).push({ app, assignment: assign });
      });
    });

    if (!byFnId.size) {
      box.innerHTML = `<div class="empty-hint">No functions mapped to any apps yet.</div>`;
      return;
    }

    for (const [fnId, appAssignments] of byFnId.entries()) {
      const fn = fnMeta.get(fnId) || { id: fnId, name: "(Unlabeled function)" };

      const card = document.createElement("div");
      card.className = "card function-card card--function";

      card.innerHTML = `
        <div class="card-header function-card-header">
          <div class="function-icon">
            ${esc((fn.name || fnId).slice(0, 2))}
          </div>
          <div class="function-title">${esc(fn.name || fnId)}</div>
        </div>
        <div class="card-body">
          <div class="function-apps-label">Apps</div>
          <div class="function-apps-list"></div>
        </div>
      `;

      const list = card.querySelector(".function-apps-list");

      // sort by status then alpha: primary → evaluating → available
      const sortedAssignments = [...appAssignments].sort((a, b) => {
        const order = { primary:0, evaluating:1, available:2 };
        const sa = order[a.assignment.status || "available"];
        const sb = order[b.assignment.status || "available"];
        if (sa !== sb) return sa - sb;
        const an = (a.app.name || "").toLowerCase();
        const bn = (b.app.name || "").toLowerCase();
        return an.localeCompare(bn);
      });

      sortedAssignments.forEach(({ app, assignment }) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "app-pill";
        pill.dataset.status = assignment.status || "available";

        pill.innerHTML = `
          <span class="pill-icon">${OL.appIconHTML(app)}</span>
          <span class="pill-label">${esc(app.name || "")}</span>
        `;

        // left-click cycles status
        pill.onclick = e => {
          e.stopPropagation();
          assignment.status = nextFnState(assignment.status);
          OL.persist();
          renderFunctionCards();
        };

        // right-click removes mapping
        pill.oncontextmenu = e => {
          e.preventDefault();
          app.functions = (app.functions || []).filter(f => f !== assignment);
          OL.persist();
          renderFunctionCards();
        };

        list.appendChild(pill);
      });

      box.appendChild(card);
    }
  }

  // -------------------------
  // INTEGRATIONS CARDS
  // -------------------------

  function wireIntegrationsViewToggle() {
    const mode = state.integrationsViewMode || "flip";
    state.integrationsViewMode = mode;

    const toggle = document.getElementById("integrationsViewToggle");
    if (!toggle) return;

    toggle.querySelectorAll("button").forEach(btn => {
      const v = btn.dataset.mode;
      if (!v) return;

      if (v === mode) btn.classList.add("active");
      else btn.classList.remove("active");

      btn.onclick = () => {
        state.integrationsViewMode = v;
        OL.persist();
        wireIntegrationsViewToggle();
        renderIntegrationCards();
      };
    });
  }

  function renderIntegrationCards() {
    const box = document.getElementById("integrationsCards");
    if (!box) return;
    box.innerHTML = "";

    const pairs = buildIntegrationPairs();
    if (!pairs.length) {
      box.innerHTML = `<div class="empty-hint">No integrations mapped yet.</div>`;
      return;
    }

    const appsById = new Map((state.apps || []).map(a => [a.id, a]));
    const mode = state.integrationsViewMode || "flip";

    if (mode === "single") {
      pairs.forEach(rec => {
        const appA = appsById.get(rec.appAId);
        const appB = appsById.get(rec.appBId);
        if (!appA || !appB) return;

        box.appendChild(buildIntegrationCard(appA, appB, rec, "AtoB", "single"));
        box.appendChild(buildIntegrationCard(appB, appA, rec, "BtoA", "single"));
      });
    } else if (mode === "both") {
      pairs.forEach(rec => {
        const appA = appsById.get(rec.appAId);
        const appB = appsById.get(rec.appBId);
        if (!appA || !appB) return;
        box.appendChild(buildIntegrationCard(appA, appB, rec, "both", "both"));
      });
    } else {
      // flip mode
      pairs.forEach(rec => {
        const appA = appsById.get(rec.appAId);
        const appB = appsById.get(rec.appBId);
        if (!appA || !appB) return;
        box.appendChild(buildIntegrationCard(appA, appB, rec, "AtoB", "flip"));
      });
    }
  }

  function buildIntegrationCard(sourceApp, targetApp, rec, dirMode, viewMode) {
    const card = document.createElement("div");
    card.className = "card integration-card card--integration";

    const directCount = rec.direct;
    const zapCount    = rec.zapier;
    const bothCount   = rec.both;
    const hasZapier   = zapCount > 0 || bothCount > 0;

    let intClass = "";
    if (bothCount > 0) intClass = "int-both";
    else if (directCount > 0) intClass = "int-direct";
    else if (zapCount > 0) intClass = "int-zapier";

    let arrowBlock = "";
    if (viewMode === "flip") {
      arrowBlock = `
        <div class="integration-arrows flip-mode">
          <div class="arrow-row active">
            <span class="arrow-app">${esc(sourceApp.name)}</span>
            <span class="arrow-symbol">&#8594;</span>
            <span class="arrow-app">${esc(targetApp.name)}</span>
          </div>
          <div class="arrow-row inactive">
            <span class="arrow-app">${esc(targetApp.name)}</span>
            <span class="arrow-symbol">&#8594;</span>
            <span class="arrow-app">${esc(sourceApp.name)}</span>
          </div>
        </div>
      `;
    } else if (viewMode === "single") {
      arrowBlock = `
        <div class="integration-arrows single-mode">
          <span class="arrow-app">${esc(sourceApp.name)}</span>
          <span class="arrow-symbol">&#8594;</span>
          <span class="arrow-app">${esc(targetApp.name)}</span>
        </div>
      `;
    } else {
      arrowBlock = `
        <div class="integration-arrows both-mode">
          <div class="arrow-row">
            <span class="arrow-app">${esc(sourceApp.name)}</span>
            <span class="arrow-symbol">&#8594;</span>
            <span class="arrow-app">${esc(targetApp.name)}</span>
          </div>
          <div class="arrow-row">
            <span class="arrow-app">${esc(targetApp.name)}</span>
            <span class="arrow-symbol">&#8594;</span>
            <span class="arrow-app">${esc(sourceApp.name)}</span>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="integration-card-header ${intClass}">
        ${arrowBlock}
      </div>
      <div class="integration-card-body">
        <div class="integration-summary">
          <span>Direct: ${directCount}</span>
          <span>Zapier: ${zapCount}</span>
          <span>Both: ${bothCount}</span>
        </div>
        ${hasZapier ? `<div class="integration-zap-hint">⚡ Zapier-mediated connection available</div>` : ""}
      </div>
    `;

    if (viewMode === "flip") {
      card.onclick = () => {
        const newDir = dirMode === "AtoB" ? "BtoA" : "AtoB";
        const parent = card.parentElement;
        if (!parent) return;
        const replacement = buildIntegrationCard(
          targetApp,
          sourceApp,
          rec,
          newDir,
          "flip"
        );
        parent.replaceChild(replacement, card);
      };
    }

    return card;
  }
})();
