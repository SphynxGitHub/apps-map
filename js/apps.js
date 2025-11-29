;(() => {
  if (!window.OL) {
    console.error("apps.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { state } = OL;
  const { esc } = OL.utils;

  // ------------------------------------------------
  // HELPERS
  // ------------------------------------------------

  // Sort apps alphabetically, but keep Zapier first.
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

  // App-level helper: how many functions mapped to this app?
  function countFunctionsUsingApp(appId) {
    const app = (state.apps || []).find(a => a.id === appId);
    if (!app || !Array.isArray(app.functions)) return 0;
    return app.functions.length;
  }

  // App-level helper: count integrations by type for this app only
  function countIntegrationsForApp(appId) {
    const app = (state.apps || []).find(a => a.id === appId);
    const out = { direct: 0, zapier: 0, both: 0 };
    if (!app || !Array.isArray(app.integrations)) return out;

    app.integrations.forEach(int => {
      const t = (int && int.type) || "zapier";
      if (t === "both") out.both++;
      else if (t === "direct") out.direct++;
      else out.zapier++;
    });

    return out;
  }

  // ------------------------------------------------
  // PUBLIC ENTRY: APPS PAGE
  // ------------------------------------------------
  OL.renderApps = function renderApps() {
    const container = document.getElementById("view-apps");
    if (!container) return;

    const appsSorted = [...(state.apps || [])].sort(byNameWithZapierFirst);

    container.innerHTML = `
      <!-- Applications -->
      <section class="apps-section">
        <div class="section-header">
          <h1>Applications</h1>
          <div class="view-toggle" id="appsViewToggle">
            <button data-view="details">Details</button>
            <button data-view="grid">Icons</button>
          </div>
        </div>
        <div id="appsListContainer"></div>
        <div class="appsAddNew">
          <button class="btn small" id="addNewAppBtn">+ Add Application</button>
        </div>
      </section>

      <!-- Functions -->
      <section class="apps-section">
        <div class="section-header">
          <h2>Functions</h2>
          <div class="apps-legend">
            <span><strong>Status:</strong></span>
            <span class="legend-pill status-primary">Primary</span>
            <span class="legend-pill status-available">Available</span>
            <span class="legend-pill status-evaluating">Evaluating</span>
            <span class="legend-hint">Click to cycle • Right-click to remove</span>
          </div>
        </div>
        <div id="functionsCards" class="functions-grid"></div>
      </section>

      <!-- Integrations -->
      <section class="apps-section">
        <div class="section-header">
          <h2>Integrations</h2>
          <div class="view-toggle" id="integrationsViewToggle">
            <button data-mode="flip">Flip</button>
            <button data-mode="single">One-Direction</button>
            <button data-mode="both">Bi-Directional</button>
          </div>
        </div>
        <div class="apps-legend">
          <span><strong>Integration Type:</strong></span>
          <span class="legend-pill int-direct">Direct</span>
          <span class="legend-pill int-zapier">Zapier</span>
          <span class="legend-pill int-both">Both</span>
        </div>
        <div id="integrationsCards" class="integrations-grid"></div>
      </section>
    `;

    // Wire buttons / toggles
    wireAppsViewToggle();
    wireIntegrationsViewToggle();

    const addBtn = document.getElementById("addNewAppBtn");
    if (addBtn) {
      addBtn.onclick = () => OL.openAppModalNew && OL.openAppModalNew();
    }

    // Render subsections
    renderAppsList(appsSorted);
    renderFunctionCards();
    renderIntegrationCards();
  };

  // ------------------------------------------------
  // APPS LIST (DETAILS / GRID)
  // ------------------------------------------------
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
        OL.persist && OL.persist();
        wireAppsViewToggle();
        renderAppsList([...(state.apps || [])].sort(byNameWithZapierFirst));
      };
    });
  }

  function renderAppsList(appsSorted) {
    const container = document.getElementById("appsListContainer");
    if (!container) return;

    const mode = state.appsViewMode || "details";
    container.innerHTML = "";

    // GRID MODE (icons only)
    if (mode === "grid") {
      const grid = document.createElement("div");
      grid.className = "apps-grid";

      appsSorted.forEach(app => {
        const appStatus = (app.status || "").toLowerCase();
        let statusClass = "";
        if (appStatus === "evaluating") statusClass = " app-card-evaluating";
        else if (appStatus === "deprecated") statusClass = " app-card-deprecated";

        const card = document.createElement("div");
        card.className = "app-card" + statusClass;
        card.dataset.id = app.id;

        card.innerHTML = `
          <div class="app-card-header">
            ${OL.appIconHTML(app)}
            <div class="app-card-title-block">
              <div class="app-card-title-row">
                <div class="app-card-title">${esc(app.name || "")}</div>
              </div>
            </div>
          </div>
        `;

        card.onclick = () => OL.openAppModal && OL.openAppModal(app.id);
        grid.appendChild(card);
      });

      container.appendChild(grid);
      return;
    }

    // DETAILS MODE: show counts + status
    const list = document.createElement("div");
    list.className = "apps-list";

    appsSorted.forEach(app => {
      const appStatus = (app.status || "").toLowerCase();
      let statusClass = "";
      if (appStatus === "evaluating") statusClass = " app-card-evaluating";
      else if (appStatus === "deprecated") statusClass = " app-card-deprecated";

      const fnCount = countFunctionsUsingApp(app.id);
      const intCounts = countIntegrationsForApp(app.id);
      const totalInts = intCounts.direct + intCounts.zapier + intCounts.both;

      let statusLabelHTML = "";
      if (appStatus === "evaluating") {
        statusLabelHTML = `<span class="app-card-status app-status-evaluating">Evaluating</span>`;
      } else if (appStatus === "deprecated") {
        statusLabelHTML = `<span class="app-card-status app-status-deprecated">Deprecated</span>`;
      }

      const card = document.createElement("div");
      card.className = "app-card" + statusClass;
      card.dataset.id = app.id;

      card.innerHTML = `
        <div class="app-card-header">
          ${OL.appIconHTML(app)}
          <div class="app-card-title-block">
            <div class="app-card-title-row">
              <div class="app-card-title">${esc(app.name || "")}</div>
              ${statusLabelHTML}
            </div>
            <div class="app-card-meta">
              <span>${fnCount} function${fnCount === 1 ? "" : "s"}</span>
              <span>${totalInts} integration${totalInts === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
      `;

      card.onclick = () => OL.openAppModal && OL.openAppModal(app.id);
      list.appendChild(card);
    });

    container.appendChild(list);
  }
  
  // ============================================================
  // ADD FUNCTION TO APP
  // ============================================================
  OL.assignFunctionToApp = function(appId, functionId) {
    const app = OL.state.apps.find(a => a.id === appId);
    if (!app) return;
    if (!app.functions) app.functions = [];
  
    // Find how many apps have this function already
    const existingMappings = OL.state.apps
      .map(a => a.functions || [])
      .flat()
      .filter(fn => fn.id === functionId);
  
    let newStatus;
    if (existingMappings.length === 0) {
      // FIRST APP FOR THIS FUNCTION
      newStatus = "primary";
    } else {
      // Function already exists on other apps
      newStatus = "available";
    }
  
    // Create mapping object
    const newMapping = {
      id: functionId,
      status: newStatus
    };
  
    // Add mapping to this app
    app.functions.push(newMapping);
  
    OL.persist();
  
    // Rerender UI if currently inside Functions or Apps
    if (window.location.hash === "#/apps") {
      if (typeof OL.renderApps === "function") {
        OL.renderApps();
      }
    }
  };
  function onAddFunctionFromAppModal(appId, functionId) {
    OL.assignFunctionToApp(appId, functionId);
    OL.openAppModal(appId); // refresh modal view
  }

  // ------------------------------------------------
  // FUNCTIONS CARDS (driven off app.function assignments)
  // ------------------------------------------------
  function renderFunctionCards() {
    const box = document.getElementById("functionsCards");
    if (!box) return;
    box.innerHTML = "";

    const apps = state.apps || [];
    const fnMeta = new Map();  // fnId -> fn object (from state.functions)
    const byFnId = new Map();  // fnId -> [{ app, assignment }, ...]

    (state.functions || []).forEach(fn => {
      if (fn && fn.id) fnMeta.set(fn.id, fn);
    });

    // Walk all apps and collect assignments by function id
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
      card.className = "function-card";

      card.innerHTML = `
        <div class="function-card-header">
          <div class="function-icon">${(fn.name || "?").slice(0, 2)}</div>
          <div class="function-title">${esc(fn.name || fnId)}</div>
        </div>
        <div class="function-card-body">
          <div class="function-apps-label">Apps</div>
          <div class="function-apps-list"></div>
        </div>
      `;

      const list = card.querySelector(".function-apps-list");

      appAssignments.forEach(({ app, assignment }) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "app-pill";
        pill.dataset.status = assignment.status || "available";
        pill.innerHTML = `
          <span class="pill-icon">${OL.appIconHTML(app)}</span>
          <span class="pill-label">${esc(app.name || "")}</span>
        `;

        // Right-click: unassign this app from the function
        pill.oncontextmenu = e => {
          e.preventDefault();
          app.functions = (app.functions || []).filter(f => f !== assignment);
          OL.persist && OL.persist();
          renderFunctionCards();
        };

        list.appendChild(pill);
      });

      // Click whole card -> open function modal if present
      card.onclick = () => {
        if (typeof OL.openFunctionModal === "function") {
          OL.openFunctionModal(fnId);
        }
      };

      box.appendChild(card);
    }
  }

  function nextFnState(s) {
    if (s === "primary") return "evaluating";
    if (s === "evaluating") return "available";
    return "primary";
  }

  // ------------------------------------------------
  // INTEGRATIONS CARDS
  // ------------------------------------------------

  OL.assignIntegration = function(appAId, appBId, type) {
    const appA = OL.state.apps.find(a => a.id === appAId);
    const appB = OL.state.apps.find(a => a.id === appBId);
    if (!appA || !appB) return;
  
    if (!appA.integrations) appA.integrations = [];
    if (!appB.integrations) appB.integrations = [];
  
    // Add record on A
    if (!appA.integrations.some(i => i.appId === appBId)) {
      appA.integrations.push({ appId: appBId, type });
    }
  
    // Add record on B
    if (!appB.integrations.some(i => i.appId === appAId)) {
      appB.integrations.push({ appId: appAId, type });
    }
  
    OL.persist && OL.persist();
    OL.renderApps && OL.renderApps();
  };

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
        OL.persist && OL.persist();
        wireIntegrationsViewToggle();
        renderIntegrationCards();
      };
    });
  }

  function buildIntegrationPairs() {
    const apps = state.apps || [];
    const zap = getZapierApp();
    const pairs = new Map(); // key: "aId|bId" (sorted), value: record

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
          both: 0
        };
        pairs.set(key, rec);
      }
      if (type === "both") rec.both++;
      else if (type === "direct") rec.direct++;
      else rec.zapier++;
    }

    // Manual integrations defined on each app
    apps.forEach(app => {
      (app.integrations || []).forEach(int => {
        const otherId = int.appId;
        const type = int.type || "zapier";
        if (!otherId) return;
        bumpPair(app.id, otherId, type);
      });
    });

    // Zapier-mediated pairs (if Zapier app present)
    if (zap) {
      const zapId = zap.id;
      const zapClients = apps.filter(a =>
        (a.integrations || []).some(
          int =>
            int.appId === zapId &&
            (int.type === "zapier" || int.type === "both")
        )
      );

      for (let i = 0; i < zapClients.length; i++) {
        for (let j = i + 1; j < zapClients.length; j++) {
          const a = zapClients[i];
          const b = zapClients[j];
          const key = pairKey(a.id, b.id);
          const existing = pairs.get(key);
          if (existing) {
            // If direct already exists, mark as both
            if (existing.direct > 0 && existing.zapier === 0 && existing.both === 0) {
              existing.both++;
              existing.direct = 0;
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

    pairs.forEach(rec => {
      const appA = appsById.get(rec.appAId);
      const appB = appsById.get(rec.appBId);
      if (!appA || !appB) return;

      const card = buildIntegrationCard(appA, appB, rec, mode);
      box.appendChild(card);
    });
  }

  function buildIntegrationCard(sourceApp, targetApp, rec, viewMode) {
    const card = document.createElement("div");
    card.className = "integration-card";
  
    const directCount = rec.direct;
    const zapCount    = rec.zapier;
    const bothCount   = rec.both;
  
    let intClass = "";
    if (bothCount > 0) intClass = "int-both";
    else if (directCount > 0) intClass = "int-direct";
    else if (zapCount > 0) intClass = "int-zapier";
  
    const total = directCount + zapCount + bothCount;
  
    // Arrow block (visual only, no flip logic here)
    let arrowBlock = "";
    if (viewMode === "flip") {
      arrowBlock = `
        <div class="integration-arrows flip-compressed">
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
          <span>· Total: ${total}</span>
        </div>
      </div>
    `;
  
    // Entire card opens the capabilities modal
    card.addEventListener("click", () => {
      if (typeof OL.openIntegrationModal === "function") {
        OL.openIntegrationModal(sourceApp.id, targetApp.id);
      }
    });
  
    return card;
  }
})();
