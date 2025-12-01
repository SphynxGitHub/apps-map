(() => {
  if (!window.OL) {
    console.error("apps.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { state } = OL;
  const { esc } = OL.utils;

  /* =====================================================
        SORT — with Zapier priority
  ====================================================== */
  function byNameWithZapierFirst(a, b) {
    const an = (a.name || "").toLowerCase();
    const bn = (b.name || "").toLowerCase();
    if (an === "zapier" && bn !== "zapier") return -1;
    if (bn === "zapier" && an !== "zapier") return 1;
    return an.localeCompare(bn);
  }

  /* =====================================================
        APP VIEW MODE — details | icon
  ====================================================== */
  state.appViewMode = state.appViewMode || "details";
  function setAppViewMode(mode) {
    state.appViewMode = mode;
    OL.persist && OL.persist();
    OL.renderApps();
  }
  OL.setAppViewMode = setAppViewMode;

  /* =====================================================
        COUNT HELPERS
  ====================================================== */
  function countFunctionsUsingApp(appId) {
    return (state.functions || [])
      .filter(fn => (fn.apps || []).includes(appId))
      .length;
  }

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

  /* =====================================================
        PUBLIC ENTRY
  ====================================================== */
  OL.renderApps = function renderApps() {
    const container = document.getElementById("view-apps");
    if (!container) return;

    const appsSorted = [...(state.apps || [])].sort(byNameWithZapierFirst);

    container.innerHTML = `
      <section class="apps-section">
        <div class="section-header">
          <h1>Applications</h1>
          <div class="right-section">
            <button class="btn small" id="addNewAppBtn">+ Add Application</button>
            <div class="view-toggle">
              <button onclick="OL.setAppViewMode('icon')" class="${state.appViewMode === 'icon' ? 'active' : ''}">Icon</button>
              <button onclick="OL.setAppViewMode('details')" class="${state.appViewMode === 'details' ? 'active' : ''}">Details</button>
            </div>
          </div>
        </div>
        <div id="appsCards" class="cards-grid"></div>
      </section>

      <section class="apps-section">
        <div class="section-header">
          <h2>Functions</h2>
          <div class="right-section">
            <button class="btn small" id="addNewFunctionBtn">+ Add Function</button>
          </div>
        </div>

        <div id="functionsCards" class="cards-grid"></div>
      </section>

      <section class="apps-section">
        <div class="section-header">
          <h2>Integrations</h2>
        </div>
        <div id="integrationsCards" class="cards-grid"></div>
      </section>
    `;

    document.getElementById("addNewAppBtn").onclick = () => OL.openAppModalNew && OL.openAppModalNew();

    renderAppCards(appsSorted);
    renderFunctionCards();
    renderIntegrationCards();
  };

  /* =====================================================
        APP CARDS
  ====================================================== */
  function renderAppCards(appsSorted) {
    const container = document.getElementById("appsCards");
    if (!container) return;
    container.innerHTML = "";

    appsSorted.forEach(app => {
      container.insertAdjacentHTML("beforeend", renderAppCard(app, state.appViewMode));
    });
  }

  function renderAppCard(app, mode = "details") {
    const iconHtml = OL.appIconHTML(app);
    const appStatus = (app.status || "").toLowerCase();
    const fnCount = countFunctionsUsingApp(app.id);
    const intCounts = countIntegrationsForApp(app.id);
    const totalInts = intCounts.direct + intCounts.zapier + intCounts.both;
  
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
  
        </div>
      </div>`;
  }

  function renderAppFunctions(app) {
    return (state.functions || [])
      .filter(fn => (fn.apps || []).includes(app.id))
      .map(fn => `
        <button class="pill" data-fn-id="${fn.id}">
          ${esc(fn.name)}
        </button>
      `)
      .join("");
  }

  /* =====================================================
        DELETE APP
  ====================================================== */
  OL.deleteApp = function (appId) {
    const app = (state.apps || []).find(a => a.id === appId);
    if (!app) return;

    if (!confirm(`Delete "${app.name || "this app"}"?`)) return;

    // remove app itself
    state.apps = (state.apps || []).filter(a => a.id !== appId);

    // wipe references
    (state.functions || []).forEach(fn => {
      if (fn.apps) fn.apps = fn.apps.filter(a => a !== appId);
    });

    OL.persist && OL.persist();
    OL.renderApps && OL.renderApps();
  };

  /* =====================================================
        FUNCTION CARDS
  ====================================================== */
  function renderFunctionCards() {
    if (typeof OL.renderFunctionCards === "function") {
      OL.renderFunctionCards();
      return;
    }
  }

  /* =====================================================
        INTEGRATION CARDS
  ====================================================== */
  function renderIntegrationCards() {
    if (typeof OL.renderIntegrationCards === "function") {
      OL.renderIntegrationCards();
      return;
    }
  }

  OL.renderAppCard = renderAppCard;

})();
