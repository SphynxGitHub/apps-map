(() => {
  if (!window.OL) {
    console.error("apps.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { state } = OL;
  const { esc } = OL.utils;

  /* =====================================================
        HELPERS
  ====================================================== */
  function getAppNameById(id) {
    const apps = state.apps || [];
    const a = apps.find(x => x.id === id);
    return a ? a.name : "(unknown)";
  }

  function byNameWithZapierFirst(a, b) {
    const an = (a.name || "").toLowerCase();
    const bn = (b.name || "").toLowerCase();
    if (an === "zapier" && bn !== "zapier") return -1;
    if (bn === "zapier" && an !== "zapier") return 1;
    return an.localeCompare(bn);
  }

  function countFunctionsUsingApp(appId) {
    return (state.functions || [])
      .filter(fn => (fn.apps || []).includes(appId))
      .length;
  }

  function countIntegrationsForApp(appId) {
    const out = { direct: 0, zapier: 0, both: 0 };
    const ints = state.integrations || [];
    ints.forEach(int => {
      if (int.appA === appId || int.appB === appId) {
        const t = int.type || "zapier";
        if (t === "both") out.both++;
        else if (t === "direct") out.direct++;
        else out.zapier++;
      }
    });
    return out;
  }

  function formatFlipArrow(direction) {
    if (direction === "flip") {
      return `
      <span class="flip-arrow">
        <span class="arrow up">→</span>
        <span class="arrow down grey">←</span>
      </span>`;
    }
    if (direction === "AtoB") {
      return `<span class="flip-arrow"><span class="arrow">→</span></span>`;
    }
    if (direction === "BtoA") {
      return `<span class="flip-arrow"><span class="arrow">←</span></span>`;
    }
    if (direction === "both") {
      return `<span class="flip-arrow"><span class="arrow">↔</span></span>`;
    }
    return "";
  }

  /* =====================================================
        APP VIEW MODE
  ====================================================== */
  state.appViewMode = state.appViewMode || "details";

  OL.setAppViewMode = function(mode) {
    state.appViewMode = mode;
    OL.persist && OL.persist();
    OL.renderApps();
  };

  /* =====================================================
        MAIN RENDER
  ====================================================== */
  OL.renderApps = function renderApps() {
    const container = document.getElementById("view-apps");
    if (!container) return;

    const appsSorted = [...(state.apps || [])].sort(byNameWithZapierFirst);

    container.innerHTML = `
      <section class="apps-section">
        <div class="section-header">
          <h1>Applications</h1>
        </div>
        <div class="section-actions">
          <button class="btn small" id="addNewAppBtn">+ Add Application</button>
        </div>
        <div class="view-toggle">
          <button onclick="OL.setAppViewMode('icon')" class="${state.appViewMode === 'icon' ? 'active' : ''}">Icon</button>
          <button onclick="OL.setAppViewMode('details')" class="${state.appViewMode === 'details' ? 'active' : ''}">Details</button>
        </div>
        <div id="appsCards" class="cards-grid"></div>
      </section>

      <section class="apps-section">
        <div class="section-header">
          <h2>Functions</h2>
          <div class="pill-key functions-key">
            <span class="pill fn" data-status="primary">Primary</span>
            <span class="pill fn" data-status="evaluating">Evaluating</span>
            <span class="pill fn" data-status="available">Available</span>
          </div>
        </div>
        <div class="section-actions">
          <button class="btn small" id="addNewFunctionBtn">+ Add Function</button>
        </div>
        <div class="view-toggle">            
          <span class="pill-key-help">Click to cycle status; Right-click to delete</span>
        </div>
        <div id="functionsCards" class="cards-grid"></div>
      </section>

      <section class="apps-section">
        <div class="section-header">
          <h2>Integrations</h2>
          <div class="pill-key integrations-key">
            <span class="pill fn" data-status="direct">Direct</span>
            <span class="pill fn" data-status="zapier">Zapier</span>
            <span class="pill fn" data-status="both">Both</span>
          </div>
        </div>
        <div class="view-toggle">
          <button onclick="OL.setAppViewMode('flip')" class="${state.appViewMode === 'flip' ? 'active' : ''}">Flip</button>
          <button onclick="OL.setAppViewMode('one-direction')" class="${state.appViewMode === 'one-direction' ? 'active' : ''}">One Direction</button>
        </div>
        <div id="integrationsCards" class="cards-grid"></div>
      </section>
    `;

    document.getElementById("addNewAppBtn").onclick = () => OL.openAppModalNew && OL.openAppModalNew();

    renderAppCards(appsSorted);
    if (OL.renderFunctionCards) {
      OL.renderFunctionCards();
    }
    if (OL.renderIntegrationCards) {
      OL.renderIntegrationCards();
    }

    wireCardClickHandlers();
  };

  /* =====================================================
        RENDER APP CARDS
  ====================================================== */
  function renderAppCards(appsSorted) {
    const container = document.getElementById("appsCards");
    container.innerHTML = "";

    appsSorted.forEach(app => {
      container.insertAdjacentHTML("beforeend", renderAppCard(app, state.appViewMode));
    });
  }

  function renderAppCard(app, mode = "details") {
    const iconHtml = OL.appIconHTML(app);

    if (mode === "icon") {
      return `
      <div class="card card-icon" data-app-id="${app.id}">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon">${iconHtml}</div>
            <div class="card-title">${esc(app.name || "")}</div>
          </div>
        </div>
      </div>`;
    }

    return `
    <div class="card card-details" data-app-id="${app.id}">
      <div class="card-header">
        <div class="card-header-left">
          <div class="card-icon">${iconHtml}</div>
          <div class="card-title">${esc(app.name || "")}</div>
        </div>
        <div class="card-close" onclick="OL.deleteApp('${app.id}')">×</div>
      </div>

      <div class="card-body">

        <div class="card-section">
          <div class="card-section-title">Status</div>
          <div class="card-section-content">
            <span class="pill">${esc(app.status || "Available")}</span>
          </div>
        </div>

        <div class="card-section">
          <div class="card-section-title">Functions</div>
          <div class="card-section-content">
            ${renderAppFunctions(app)}
          </div>
        </div>

        <div class="card-section">
          <div class="card-section-title">Notes</div>
          <div class="card-section-content">
            <div class="modal-notes-display ${!app.notes ? "muted" : ""}">
              ${esc(app.notes || "No notes")}
            </div>
          </div>
        </div>

        <div class="card-section">
          <div class="card-section-title">Integrations</div>
          <div class="card-section-content">
            ${renderAppIntegrations(app)}
          </div>
        </div>

      </div>
    </div>`;
  }

  function renderAppFunctions(app) {
    return (state.functions || [])
      .filter(fn => (fn.apps || []).includes(app.id))
      .map(fn => `<span class="pill">${esc(fn.name)}</span>`)
      .join("");
  }

  function renderAppIntegrations(app) {
    const ints = state.integrations || [];
    const related = ints.filter(i => i.appA === app.id || i.appB === app.id);

    if (!related.length) {
      return `<span class="pill muted">None</span>`;
    }

    return related.map(int => {
      const otherId = (int.appA === app.id) ? int.appB : int.appA;
      return `
        <span class="pill integration-pill" data-app-id="${otherId}">
          ${esc(getAppNameById(otherId))}
          ${formatFlipArrow(int.direction)}
        </span>`;
    }).join("");
  }

  /* =====================================================
        DELETE APP
  ====================================================== */
  OL.deleteApp = function (appId) {
    if (!confirm(`Delete "${getAppNameById(appId)}"?`)) return;

    state.apps = (state.apps || []).filter(a => a.id !== appId);

    (state.functions || []).forEach(fn => {
      if (fn.apps) fn.apps = fn.apps.filter(a => a !== appId);
    });

    OL.persist && OL.persist();
    OL.renderApps();
  };

  /* =====================================================
        INTEGRATION FLIP
  ====================================================== */
  document.addEventListener("click", e => {
    const arrow = e.target.closest(".arrow");
    if (!arrow) return;

    const pill = e.target.closest(".integration-pill");
    if (!pill) return;

    const card = pill.closest(".card");
    const appIdA = card.dataset.appId;
    const appIdB = pill.dataset.appId;

    const rec = state.integrations.find(i =>
      (i.appA === appIdA && i.appB === appIdB) ||
      (i.appA === appIdB && i.appB === appIdA)
    );
    if (!rec) return;

    const order = ["flip", "AtoB", "BtoA", "both"];
    rec.direction = order[(order.indexOf(rec.direction) + 1) % order.length];

    OL.persist && OL.persist();
    OL.renderApps();
  });

  /* =====================================================
        RIGHT CLICK DELETE INTEGRATION
  ====================================================== */
  document.addEventListener("contextmenu", e => {
    const pill = e.target.closest(".integration-pill");
    if (!pill) return;

    e.preventDefault();

    const card = pill.closest(".card");
    const appIdA = card.dataset.appId;
    const appIdB = pill.dataset.appId;

    if (!confirm(`Remove integration between ${getAppNameById(appIdA)} and ${getAppNameById(appIdB)}?`))
      return;

    state.integrations = state.integrations.filter(i =>
      !((i.appA === appIdA && i.appB === appIdB) ||
        (i.appA === appIdB && i.appB === appIdA))
    );

    OL.persist && OL.persist();
    OL.renderApps();
  });

  /* =====================================================
        CARD CLICK HANDLERS
  ====================================================== */
  function wireCardClickHandlers() {
    // APP card
    document.querySelectorAll('.card[data-app-id] .card-header-left').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        OL.openAppModal(el.closest('.card').dataset.appId);
      };
    });

    // FN card
    document.querySelectorAll('.card[data-fn-id] .card-header-left').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        OL.openFunctionModal(el.closest('.card').dataset.fnId);
      };
    });

    // INT card — if they exist
    document.querySelectorAll('#integrationsCards .card .card-header-left').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        OL.openIntegrationModal(el.closest('.card').dataset.appId);
      };
    });
  }

  /* =====================================================
        PATCH RENDER
  ====================================================== */
  const __renderApps = OL.renderApps;
  OL.renderApps = function() {
    __renderApps();
    wireCardClickHandlers();
  };

})();
