;(() => {
  if (!window.OL) {
    console.error("apps.js: OL core not loaded");
    return;
  }

  const OL = window.OL;
  const state = (OL.state = OL.state || {});
  const utils = (OL.utils = OL.utils || {});

  const esc = utils.esc || (v => String(v == null ? "" : v));
  const LS_FILTER_KEY = "ol-apps-filters-v1";

  // ---------------------------------------------------------------------------
  // SIMPLE FILTER PERSISTENCE
  // ---------------------------------------------------------------------------
  function loadFilterPrefs() {
    try {
      const raw = localStorage.getItem(LS_FILTER_KEY);
      if (!raw) {
        return {
          persist: false,
          current: {
            q: "",
            zapierOnly: false,
          },
        };
      }
      const parsed = JSON.parse(raw);
      return {
        persist: !!parsed.persist,
        current: {
          q: parsed.current?.q || "",
          zapierOnly: !!parsed.current?.zapierOnly,
        },
      };
    } catch (e) {
      console.warn("apps.js: failed to load filter prefs", e);
      return {
        persist: false,
        current: {
          q: "",
          zapierOnly: false,
        },
      };
    }
  }

  const filterPrefs = loadFilterPrefs();
  state.ui = state.ui || {};
  state.ui.appsFilter = state.ui.appsFilter || filterPrefs.current;
  state.ui.appsViewMode = state.ui.appsViewMode || "details";

  function persistFilterPrefs() {
    if (!filterPrefs.persist) {
      localStorage.removeItem(LS_FILTER_KEY);
      return;
    }
    try {
      const payload = {
        persist: true,
        current: state.ui.appsFilter || {
          q: "",
          zapierOnly: false,
        },
      };
      localStorage.setItem(LS_FILTER_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("apps.js: failed to persist filters", e);
    }
  }

  // Expose a tiny hook if we ever need it elsewhere
  OL.setAppsFilterPersist = function (on) {
    filterPrefs.persist = !!on;
    persistFilterPrefs();
  };

  // ---------------------------------------------------------------------------
  // HELPERS / DERIVED DATA
  // ---------------------------------------------------------------------------

  function byName(a, b) {
    return esc(a.name).toLowerCase().localeCompare(esc(b.name).toLowerCase());
  }

  // Zapier-first sort; falls back to name
  function byNameWithZapierFirst(a, b) {
    const az = appHasZapier(a) ? 0 : 1;
    const bz = appHasZapier(b) ? 0 : 1;
    if (az !== bz) return az - bz;
    return byName(a, b);
  }

  function getFunctionsMap() {
    const map = new Map();
    (state.functions || []).forEach(fn => {
      if (fn && fn.id) map.set(fn.id, fn);
    });
    return map;
  }

  // Does this app have a Zapier integration (direct or via type)?
  function appHasZapier(app) {
    if (!app) return false;

    // Explicit flag (safe for future)
    if (app.hasZapier === true) return true;

    // Integrations metadata (present in many schemas)
    if (Array.isArray(app.integrations)) {
      return app.integrations.some(int =>
        int &&
        (
          int.type === "zapier" ||
          int.channel === "zapier" ||
          int.via === "zapier" ||
          int.kind === "zapier"
        )
      );
    }

    return false;
  }

  // Capsule for "Used In" counters; safe if nothing is defined yet
  function computeUsedInSummary(app) {
    const used = app && app.usedIn;
    if (!used) {
      return { total: 0, byType: {} };
    }
    const byType = {};
    let total = 0;
    Object.keys(used).forEach(k => {
      const v = Number(used[k]) || 0;
      if (v > 0) {
        byType[k] = v;
        total += v;
      }
    });
    return { total, byType };
  }

  // License/seat info; again safe default
  function computeLicenseSummary(app) {
    const lic = app && app.licenses;
    if (!lic) return { total: 0, assigned: 0 };
    return {
      total: Number(lic.totalSeats || lic.total || 0) || 0,
      assigned: Number(lic.assignedSeats || lic.assigned || 0) || 0,
    };
  }

  // Status ordering for pills: primary → evaluating → available
  const STATUS_RANK = {
    primary: 0,
    evaluating: 1,
    available: 2,
  };

  function normalizeStatus(s) {
    const val = String(s || "").toLowerCase();
    if (val === "primary") return "primary";
    if (val === "evaluating") return "evaluating";
    return "available";
  }

  function sortPillsWithStatus(a, b) {
    const sa = normalizeStatus(a.status);
    const sb = normalizeStatus(b.status);
    if (sa !== sb) {
      return (STATUS_RANK[sa] ?? 99) - (STATUS_RANK[sb] ?? 99);
    }
    return esc(a.label || "").toLowerCase().localeCompare(
      esc(b.label || "").toLowerCase()
    );
  }

  // ---------------------------------------------------------------------------
  // FILTER LOGIC
  // ---------------------------------------------------------------------------

  function getAppsFilter() {
    return state.ui.appsFilter || { q: "", zapierOnly: false };
  }

  function setAppsFilter(newFilter) {
    state.ui.appsFilter = {
      ...getAppsFilter(),
      ...(newFilter || {}),
    };
    persistFilterPrefs();
  }

  function applyAppsFilter(apps) {
    const f = getAppsFilter();
    let list = apps.slice();

    if (f.q && f.q.trim()) {
      const q = f.q.trim().toLowerCase();
      list = list.filter(app => {
        const hay = [
          app.name || "",
          app.notes || "",
          app.slug || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (f.zapierOnly) {
      list = list.filter(appHasZapier);
    }

    return list;
  }

  // ---------------------------------------------------------------------------
  // RENDER ROOT APPS PAGE
  // ---------------------------------------------------------------------------

  function renderApps() {
    const container = document.getElementById("view-apps");
    if (!container) return;

    const appsSorted = [...(state.apps || [])].sort(byNameWithZapierFirst);
    const filter = getAppsFilter();
    const viewMode = state.ui.appsViewMode || "details";

    container.innerHTML = `
      <section class="apps-section">
        <div class="section-header">
          <div class="section-header-main">
            <h1>Applications</h1>
            <div class="apps-filter-inline-note" id="appsFilterNote">
              Filters apply only to this section. 
              <span class="note-pill">Session-only by default</span>
            </div>
          </div>
          <div class="section-header-actions">
            <div class="apps-view-toggle-wrap">
              <div class="view-toggle" id="appsViewToggle">
                <button data-view="details" class="${viewMode === "details" ? "active" : ""}">Details</button>
                <button data-view="grid" class="${viewMode === "grid" ? "active" : ""}">Icons</button>
              </div>
            </div>
            <button class="btn small" id="addNewAppBtn">+ Add Application</button>
          </div>
        </div>

        <div class="apps-filters" id="appsFilters">
          <div class="apps-filters-left">
            <input 
              type="search" 
              id="appsFilterSearch" 
              class="input small" 
              placeholder="Filter by name, notes…" 
              value="${esc(filter.q)}"
            />
            <label class="chk-pill">
              <input type="checkbox" id="appsFilterZapier" ${filter.zapierOnly ? "checked" : ""}/>
              <span>Zapier-enabled only</span>
            </label>
          </div>
          <div class="apps-filters-right">
            <label class="chk-pill">
              <input type="checkbox" id="appsFilterPersist" ${filterPrefs.persist ? "checked" : ""}/>
              <span>Remember filters</span>
            </label>
            <button class="btn xsmall ghost" id="appsFilterClear">Clear</button>
          </div>
        </div>

        <div class="apps-legend">
          <span><strong>Integration:</strong></span>
          <span class="legend-pill int-direct">Direct</span>
          <span class="legend-pill int-zapier">Zapier</span>
          <span class="legend-pill int-both">Both</span>
          <span class="legend-separator"></span>
          <span><strong>Status:</strong></span>
          <span class="legend-pill status-primary">Primary</span>
          <span class="legend-pill status-available">Available</span>
          <span class="legend-pill status-evaluating">Evaluating</span>
          <span class="legend-hint">Click status pills to cycle, right-click to remove.</span>
        </div>

        <div id="appsListContainer"></div>
      </section>

      <section class="apps-section">
        <div class="section-header">
          <div class="section-header-main">
            <h2>Functions</h2>
            <div class="legend small">
              <span class="legend-pill status-primary">Primary App</span>
              <span class="legend-pill status-available">Available</span>
              <span class="legend-pill status-evaluating">Evaluating</span>
            </div>
          </div>
          <div class="section-header-actions">
            <button class="btn small ghost" id="addNewFunctionBtn">+ Add Function</button>
          </div>
        </div>
        <div id="functionsCards" class="functions-grid"></div>
      </section>

      <section class="apps-section">
        <div class="section-header">
          <div class="section-header-main">
            <h2>Integrations</h2>
            <div class="legend small">
              <span class="legend-pill int-direct">Direct</span>
              <span class="legend-pill int-zapier">Zapier</span>
              <span class="legend-pill int-both">Both</span>
            </div>
          </div>
          <div class="section-header-actions">
            <div class="view-toggle" id="integrationsViewToggle">
              <button data-mode="flip" class="active">Direction Preview</button>
              <button data-mode="single">One-Direction</button>
              <button data-mode="both">Bi-Directional</button>
            </div>
          </div>
        </div>
        <div id="integrationsCards" class="integrations-grid"></div>
      </section>
    `;

    wireAppsViewToggle();
    wireAppsFilters();
    wireIntegrationsViewToggle();

    const addBtn = document.getElementById("addNewAppBtn");
    if (addBtn) {
      addBtn.onclick = () => OL.openAppModalNew && OL.openAppModalNew();
    }

    const addFnBtn = document.getElementById("addNewFunctionBtn");
    if (addFnBtn) {
      addFnBtn.onclick = () => OL.openFunctionModalNew && OL.openFunctionModalNew();
    }

    renderAppsList(appsSorted);
    renderFunctionCards();
    renderIntegrationCards();
  }

  OL.renderApps = renderApps;

  // ---------------------------------------------------------------------------
  // APPS LIST RENDERING (DETAILS vs GRID)
  // ---------------------------------------------------------------------------

  function renderAppsList(allApps) {
    const container = document.getElementById("appsListContainer");
    if (!container) return;

    const appsFiltered = applyAppsFilter(allApps);
    const viewMode = state.ui.appsViewMode || "details";
    const fnMap = getFunctionsMap();

    if (!appsFiltered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">No apps match your current filters.</div>
          <div class="empty-body">Clear filters or add a new application.</div>
        </div>
      `;
      return;
    }

    if (viewMode === "grid") {
      container.innerHTML = `
        <div class="appsGrid">
          ${appsFiltered.map(app => appCardGridHTML(app, fnMap)).join("")}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="appsTable appsTable-cards">
          ${appsFiltered.map(app => appCardDetailsHTML(app, fnMap)).join("")}
        </div>
      `;
    }

    wireAppCardInteractions();
  }

  // DETAILS MODE: card with notes, functions list, used-in badge, license badge
  function appCardDetailsHTML(app, fnMap) {
    const fnPills = buildFunctionPillsForApp(app, fnMap);
    const usedSummary = computeUsedInSummary(app);
    const licenseSummary = computeLicenseSummary(app);

    const hasZap = appHasZapier(app);
    const intClass = hasZap
      ? (app.hasDirect && hasZap ? "int-both" : "int-zapier")
      : (app.hasDirect ? "int-direct" : "");

    const usedLabel =
      usedSummary.total > 0
        ? `${usedSummary.total} usage${usedSummary.total === 1 ? "" : "s"}`
        : "Not mapped yet";

    let usedTooltip = "";
    if (usedSummary.total > 0) {
      const parts = Object.entries(usedSummary.byType).map(
        ([k, v]) => `${v} ${k}`
      );
      usedTooltip = parts.length ? parts.join(", ") : "";
    }

    const licenseLabel =
      licenseSummary.total > 0
        ? `${licenseSummary.assigned}/${licenseSummary.total} seats used`
        : "Seats not tracked";

    return `
      <article class="appCard" data-id="${esc(app.id)}">
        <header class="appCard-header">
          <div class="appCard-main">
            <div class="appCard-iconWrap">
              ${renderAppIcon(app)}
            </div>
            <div class="appCard-titleBlock">
              <div class="appCard-titleRow">
                <h3 class="appCard-title">${esc(app.name || "Untitled App")}</h3>
                ${
                  intClass
                    ? `<span class="chip ${intClass}" title="Integration type">${hasZap ? "Zapier" : "Direct"}</span>`
                    : ""
                }
              </div>
              ${
                app.notes
                  ? `<div class="appCard-notes">${esc(app.notes)}</div>`
                  : ""
              }
            </div>
          </div>
          <div class="appCard-meta">
            <button class="btn xsmall ghost appCard-edit" data-id="${esc(
              app.id
            )}">Edit</button>
          </div>
        </header>

        <section class="appCard-body">
          <div class="appCard-row">
            <div class="appCard-label">Functions</div>
            <div class="appCard-pills">
              ${
                fnPills.length
                  ? fnPills.map(pill => functionPillHTML(pill)).join("")
                  : `<span class="hint">No functions mapped yet.</span>`
              }
            </div>
          </div>

          <div class="appCard-row appCard-row-meta">
            <div class="appCard-metaItem" ${
              usedTooltip ? `title="${esc(usedTooltip)}"` : ""
            }>
              <span class="meta-label">Used in</span>
              <span class="meta-value">${esc(usedLabel)}</span>
            </div>
            <div class="appCard-metaItem">
              <span class="meta-label">Licenses</span>
              <span class="meta-value">${esc(licenseLabel)}</span>
            </div>
          </div>
        </section>
      </article>
    `;
  }

  // ICON MODE: compact cards, show icon, name, and tiny badges
  function appCardGridHTML(app, fnMap) {
    const fnPills = buildFunctionPillsForApp(app, fnMap);
    const usedSummary = computeUsedInSummary(app);
    const hasZap = appHasZapier(app);
    const intClass = hasZap
      ? (app.hasDirect && hasZap ? "int-both" : "int-zapier")
      : (app.hasDirect ? "int-direct" : "");

    const fnCount = fnPills.length;
    const usedCount = usedSummary.total;

    return `
      <article class="appTile" data-id="${esc(app.id)}" title="${esc(
      app.name || ""
    )}">
        <div class="appTile-icon">
          ${renderAppIcon(app)}
        </div>
        <div class="appTile-body">
          <div class="appTile-title">${esc(app.name || "Untitled")}</div>
          <div class="appTile-metaRow">
            ${
              fnCount
                ? `<span class="mini-pill">${fnCount} function${
                    fnCount === 1 ? "" : "s"
                  }</span>`
                : `<span class="mini-pill muted">No functions</span>`
            }
            ${
              usedCount
                ? `<span class="mini-pill">${usedCount} use${
                    usedCount === 1 ? "" : "s"
                  }</span>`
                : ""
            }
            ${
              intClass
                ? `<span class="mini-pill ${intClass}">${
                    hasZap ? "Zapier" : "Direct"
                  }</span>`
                : ""
            }
          </div>
        </div>
      </article>
    `;
  }

  function renderAppIcon(app) {
    // If you already have OL.appIconHTML, use that
    if (typeof OL.appIconHTML === "function") {
      return OL.appIconHTML(app);
    }

    const letter = (app.name || "?").trim().charAt(0).toUpperCase();
    return `
      <div class="app-icon-box small">
        ${esc(letter)}
      </div>
    `;
  }

  function buildFunctionPillsForApp(app, fnMap) {
    const list = [];
    const mappings = Array.isArray(app.functions) ? app.functions : [];

    mappings.forEach(m => {
      if (!m || !m.id) return;
      const fn = fnMap.get(m.id);
      const label = fn?.name || m.label || "Untitled";
      list.push({
        id: m.id,
        appId: app.id,
        label,
        status: normalizeStatus(m.status),
      });
    });

    return list.sort(sortPillsWithStatus);
  }

  function functionPillHTML(pill) {
    const status = normalizeStatus(pill.status);
    return `
      <button 
        class="pill fn-pill status-${status}"
        data-fn-id="${esc(pill.id)}"
        data-app-id="${esc(pill.appId)}"
      >
        <span class="pill-label">${esc(pill.label)}</span>
        <span class="pill-status">${status}</span>
      </button>
    `;
  }

  // ---------------------------------------------------------------------------
  // INTERACTIONS: VIEW TOGGLE, FILTERS, CARD CLICKS
  // ---------------------------------------------------------------------------

  function wireAppsViewToggle() {
    const wrap = document.getElementById("appsViewToggle");
    if (!wrap) return;

    wrap.addEventListener("click", evt => {
      const btn = evt.target.closest("button[data-view]");
      if (!btn) return;
      const view = btn.getAttribute("data-view");
      if (!view) return;

      state.ui.appsViewMode = view;
      wrap.querySelectorAll("button").forEach(b => {
        b.classList.toggle("active", b === btn);
      });

      const appsSorted = [...(state.apps || [])].sort(byNameWithZapierFirst);
      renderAppsList(appsSorted);
    });
  }

  function wireAppsFilters() {
    const search = document.getElementById("appsFilterSearch");
    const zapChk = document.getElementById("appsFilterZapier");
    const clearBtn = document.getElementById("appsFilterClear");
    const persistChk = document.getElementById("appsFilterPersist");

    const applyAndRender = () => {
      const appsSorted = [...(state.apps || [])].sort(byNameWithZapierFirst);
      renderAppsList(appsSorted);
      highlightFilterNote();
    };

    if (search) {
      search.addEventListener("input", () => {
        setAppsFilter({ q: search.value || "" });
        applyAndRender();
      });
    }

    if (zapChk) {
      zapChk.addEventListener("change", () => {
        setAppsFilter({ zapierOnly: !!zapChk.checked });
        applyAndRender();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        setAppsFilter({ q: "", zapierOnly: false });
        if (search) search.value = "";
        if (zapChk) zapChk.checked = false;
        applyAndRender();
      });
    }

    if (persistChk) {
      persistChk.addEventListener("change", () => {
        filterPrefs.persist = !!persistChk.checked;
        if (!persistChk.checked) {
          localStorage.removeItem(LS_FILTER_KEY);
        } else {
          persistFilterPrefs();
        }
        highlightFilterNote();
      });
    }

    // Initial subtle highlight so users notice what filters do
    highlightFilterNote(true);
  }

  function highlightFilterNote(initial) {
    const note = document.getElementById("appsFilterNote");
    if (!note) return;

    note.classList.remove("pulse");
    // small delay to re-trigger animation class
    setTimeout(() => {
      note.classList.add("pulse");
      if (!initial) {
        setTimeout(() => note.classList.remove("pulse"), 600);
      } else {
        setTimeout(() => note.classList.remove("pulse"), 1000);
      }
    }, 20);
  }

  function wireAppCardInteractions() {
    const container = document.getElementById("appsListContainer");
    if (!container) return;

    // Open modal on card click
    container.querySelectorAll(".appCard, .appTile").forEach(card => {
      const id = card.getAttribute("data-id");
      if (!id) return;

      // Main click anywhere opens modal
      card.addEventListener("click", evt => {
        // Don't trigger if pill or edit button explicitly handled below
        if (evt.target.closest(".fn-pill") || evt.target.closest(".appCard-edit")) {
          return;
        }
        if (OL.openAppModal) {
          OL.openAppModal(id);
        }
      });

      const editBtn = card.querySelector(".appCard-edit");
      if (editBtn) {
        editBtn.addEventListener("click", evt => {
          evt.stopPropagation();
          if (OL.openAppModal) {
            OL.openAppModal(id);
          }
        });
      }
    });

    // Function pills: left-click cycles status, right-click removes
    container.querySelectorAll(".fn-pill").forEach(pillEl => {
      const fnId = pillEl.getAttribute("data-fn-id");
      const appId = pillEl.getAttribute("data-app-id");
      if (!fnId || !appId) return;

      pillEl.addEventListener("click", evt => {
        evt.stopPropagation();
        cycleFunctionStatus(appId, fnId);
      });

      pillEl.addEventListener("contextmenu", evt => {
        evt.preventDefault();
        evt.stopPropagation();
        removeFunctionMapping(appId, fnId);
      });
    });
  }

  function cycleFunctionStatus(appId, fnId) {
    const apps = state.apps || [];
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    app.functions = Array.isArray(app.functions) ? app.functions : [];
    const mapping = app.functions.find(m => m.id === fnId);
    if (!mapping) return;

    const current = normalizeStatus(mapping.status);
    let next;
    if (current === "primary") next = "evaluating";
    else if (current === "evaluating") next = "available";
    else next = "primary";
    mapping.status = next;

    const appsSorted = [...apps].sort(byNameWithZapierFirst);
    renderAppsList(appsSorted);
  }

  function removeFunctionMapping(appId, fnId) {
    const apps = state.apps || [];
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    app.functions = (app.functions || []).filter(m => m.id !== fnId);

    const appsSorted = [...apps].sort(byNameWithZapierFirst);
    renderAppsList(appsSorted);
  }

  // ---------------------------------------------------------------------------
  // FUNCTIONS SECTION (cards) — basic version
  // ---------------------------------------------------------------------------

  function renderFunctionCards() {
    const container = document.getElementById("functionsCards");
    if (!container) return;

    const functions = state.functions || [];
    if (!functions.length) {
      container.innerHTML = `
        <div class="empty-state small">
          <div class="empty-title">No functions defined yet.</div>
          <div class="empty-body">Use “Add Function” to define what each app can do.</div>
        </div>
      `;
      return;
    }

    const appsById = new Map();
    (state.apps || []).forEach(app => {
      if (app && app.id) appsById.set(app.id, app);
    });

    container.innerHTML = functions
      .map(fn => functionCardHTML(fn, appsById))
      .join("");

    container.querySelectorAll(".fnCard").forEach(card => {
      const fnId = card.getAttribute("data-id");
      if (!fnId) return;

      card.addEventListener("click", evt => {
        if (evt.target.closest(".fnCard-appPill")) return;
        if (OL.openFunctionModal) OL.openFunctionModal(fnId);
      });
    });
  }

  function functionCardHTML(fn, appsById) {
    const links = [];

    (fn.apps || []).forEach(link => {
      if (!link.appId) return;
      const app = appsById.get(link.appId);
      if (!app) return;
      links.push({
        appId: app.id,
        label: app.name,
        status: normalizeStatus(link.status),
      });
    });

    links.sort(sortPillsWithStatus);

    return `
      <article class="fnCard" data-id="${esc(fn.id)}">
        <header class="fnCard-header">
          <div class="fnCard-main">
            <h3 class="fnCard-title">${esc(fn.name || "Untitled Function")}</h3>
            ${fn.description ? `<div class="fnCard-notes">${esc(fn.description)}</div>` : ""}
          </div>
          <div class="fnCard-meta">
            <button class="btn xsmall ghost fnCard-edit">Edit</button>
          </div>
        </header>
        <section class="fnCard-body">
          <div class="fnCard-label">Apps</div>
          <div class="fnCard-apps">
            ${
              links.length
                ? links
                    .map(
                      l => `
              <button 
                class="pill fnCard-appPill status-${l.status}" 
                data-app-id="${esc(l.appId)}"
              >
                <span class="pill-label">${esc(l.label)}</span>
                <span class="pill-status">${l.status}</span>
              </button>`
                    )
                    .join("")
                : `<span class="hint">No apps mapped yet.</span>`
            }
          </div>
        </section>
      </article>
    `;
  }

  // ---------------------------------------------------------------------------
  // INTEGRATIONS SECTION — basic preview (we can evolve later)
  // ---------------------------------------------------------------------------

  function wireIntegrationsViewToggle() {
    const wrap = document.getElementById("integrationsViewToggle");
    if (!wrap) return;

    // For now, mode only affects styling; underlying data is the same.
    wrap.addEventListener("click", evt => {
      const btn = evt.target.closest("button[data-mode]");
      if (!btn) return;
      wrap.querySelectorAll("button").forEach(b =>
        b.classList.toggle("active", b === btn)
      );
      // If we later support different renderings per mode, we can
      // read btn.dataset.mode and call renderIntegrationCards(mode).
    });
  }

  function renderIntegrationCards() {
    const container = document.getElementById("integrationsCards");
    if (!container) return;

    const apps = state.apps || [];
    if (!apps.length) {
      container.innerHTML = `
        <div class="empty-state small">
          <div class="empty-title">No apps yet.</div>
          <div class="empty-body">Add apps to see available integration pairs.</div>
        </div>
      `;
      return;
    }

    const pairs = buildIntegrationPairs(apps);
    if (!pairs.length) {
      container.innerHTML = `
        <div class="empty-state small">
          <div class="empty-title">No integrations mapped yet.</div>
          <div class="empty-body">Edit an app to add its integrations.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = pairs.map(buildIntegrationCardHTML).join("");
  }

  function buildIntegrationPairs(apps) {
    const byId = new Map();
    apps.forEach(app => {
      if (app && app.id) byId.set(app.id, app);
    });

    const seenKeys = new Set();
    const pairs = [];

    apps.forEach(app => {
      const list = app.integrations || [];
      list.forEach(int => {
        if (!int || !int.appId) return;
        const other = byId.get(int.appId);
        if (!other) return;

        const aId = app.id;
        const bId = other.id;
        const key = aId < bId ? `${aId}__${bId}` : `${bId}__${aId}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        const types = collectIntegrationTypes(app, other);
        pairs.push({
          a: app,
          b: other,
          types, // { direct: n, zapier: n, both: n }
        });
      });
    });

    return pairs.sort((p1, p2) => {
      const n1 = esc(p1.a.name + " " + p1.b.name).toLowerCase();
      const n2 = esc(p2.a.name + " " + p2.b.name).toLowerCase();
      return n1.localeCompare(n2);
    });
  }

  function collectIntegrationTypes(appA, appB) {
    // For now we just see what each app says about the other and classify:
    // direct / zapier / both
    const types = { direct: 0, zapier: 0, both: 0 };

    function scanSide(from, to) {
      (from.integrations || []).forEach(int => {
        if (!int || int.appId !== to.id) return;
        const t = (int.type || int.channel || int.via || "").toLowerCase();
        if (t === "both" || t === "bi" || t === "bi-directional") {
          types.both++;
        } else if (t === "zapier") {
          types.zapier++;
        } else if (t === "direct") {
          types.direct++;
        }
      });
    }

    scanSide(appA, appB);
    scanSide(appB, appA);

    // Fallback: if both apps have Zapier, treat as zapier; if either has direct flag, treat as direct
    if (!types.direct && !types.zapier && !types.both) {
      const zap = appHasZapier(appA) && appHasZapier(appB);
      const dir = appA.hasDirect || appB.hasDirect;
      if (zap && dir) types.both = 1;
      else if (zap) types.zapier = 1;
      else if (dir) types.direct = 1;
    }

    return types;
  }

  function buildIntegrationCardHTML(pair) {
    const { a, b, types } = pair;
    const total =
      (types.direct || 0) + (types.zapier || 0) + (types.both || 0);

    const modeSummary = [
      types.direct ? `${types.direct} direct` : "",
      types.zapier ? `${types.zapier} Zapier` : "",
      types.both ? `${types.both} both` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    return `
      <article class="intCard" data-a="${esc(a.id)}" data-b="${esc(b.id)}">
        <header class="intCard-header">
          <div class="intCard-side intCard-side-left">
            <div class="intCard-appIcon">${renderAppIcon(a)}</div>
            <div class="intCard-appName">${esc(a.name || "")}</div>
          </div>

          <div class="intCard-center">
            <div class="intCard-arrows">
              <span class="arrow arrow-top">⇄</span>
            </div>
            <div class="intCard-counts">
              <span class="mini-pill int-direct">${types.direct || 0}</span>
              <span class="mini-pill int-zapier">${types.zapier || 0}</span>
              <span class="mini-pill int-both">${types.both || 0}</span>
            </div>
            <div class="intCard-subtext">${total ? esc(modeSummary) : "Integration exists, details TBD"}</div>
          </div>

          <div class="intCard-side intCard-side-right">
            <div class="intCard-appIcon">${renderAppIcon(b)}</div>
            <div class="intCard-appName">${esc(b.name || "")}</div>
          </div>
        </header>
      </article>
    `;
  }

  // ---------------------------------------------------------------------------
  // EXPOSE SOME HELPERS IF WE WANT THEM LATER
  // ---------------------------------------------------------------------------

  OL.appHasZapier = appHasZapier;
  OL.computeUsedInSummary = computeUsedInSummary;
  OL.computeLicenseSummary = computeLicenseSummary;
})();
