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
      .map(fn => `
        <button class="pill" data-fn-id="${fn.id}">
          ${esc(fn.name)}
        </button>
      `)
      .join("");
  }
  function renderAppIntegrations(app) {
    if (!app.integrations || !app.integrations.length) {
      return `<span class="pill muted">None</span>`;
    }
  
    return app.integrations.map(int => {
      const otherId = (int.appA === app.id) ? int.appB : int.appA;
      return `
        <span class="pill integration-pill" data-int-id="${otherId}">
          ${esc(OL.getAppName(otherId))}
          ${formatFlipArrow(int.direction)}
        </span>
      `;
    }).join("");
  }
  
  document.addEventListener("contextmenu", e => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
  
    e.preventDefault();
    const appIdA = pill.closest(".card").dataset.appId;
    const appIdB = pill.dataset.intId;
  
    OL.removeIntegration(appIdA, appIdB);
  });
  
  OL.removeIntegration = function(appIdA, appIdB) {
    state.integrations = state.integrations.filter(i =>
      !((i.appA === appIdA && i.appB === appIdB) ||
        (i.appA === appIdB && i.appB === appIdA))
    );
    OL.persist && OL.persist();
    OL.renderApps();
  };

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
  }

  /*=======================================================
      CARD CLICK HANDLERS
  ========================================================*/
  function wireCardClickHandlers() {
    document.querySelectorAll('.card[data-app-id] .card-header-left').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const id = el.closest('.card').dataset.appId;
        OL.openAppModal(id);
      };
    });
  
    document.querySelectorAll('.card[data-fn-id] .card-header-left').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const id = el.closest('.card').dataset.fnId;
        OL.openFunctionModal(id);
      };
    });
  
    document.querySelectorAll('#integrationsCards .card .card-header-left').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const id = el.closest('.card').dataset.appId;
        OL.openIntegrationModal(id);
      };
    });
  }
  const _renderApps = OL.renderApps;
  OL.renderApps = function() {
    _renderApps();
    wireCardClickHandlers();
  };

  /* =====================================================
        EVENT: flip integration arrows
  ===================================================== */
  document.addEventListener("click", e => {
    const arrow = e.target.closest(".arrow");
    if (!arrow) return;
  
    const pill = e.target.closest(".integration-pill");
    if (!pill) return;
  
    const card = pill.closest(".card");
    if (!card) return;
  
    const appIdA = card.dataset.appId;
    const appIdB = pill.dataset.intId;
  
    const rec = OL.state.integrations.find(i =>
      (i.appA === appIdA && i.appB === appIdB) ||
      (i.appA === appIdB && i.appB === appIdA)
    );
    if (!rec) return;
  
    const order = ["flip", "AtoB", "BtoA", "both"];
    let i = order.indexOf(rec.direction);
    i = (i + 1) % order.length;
    rec.direction = order[i];
  
    OL.persist && OL.persist();
    OL.renderApps();
  });

})();
