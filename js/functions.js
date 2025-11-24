;(() => {
  if (!window.OL) {
    console.error("functions.js: OL core not found");
    return;
  }

  const OL = window.OL;
  const { state, persist, utils } = OL;
  const { esc, uid } = utils;

  // ------------------------------------------------------------
  // Build cross-index of functions ←→ apps
  // ------------------------------------------------------------
  function buildFunctionIndex() {
    const map = new Map();

    // Ensure each function has a bucket
    (state.functions || []).forEach(fn => {
      if (!fn || !fn.id) return;
      map.set(fn.id, { fn, apps: [] });
    });

    // Walk each app's assigned functions
    (state.apps || []).forEach(app => {
      const assigned = app.functions || [];
      assigned.forEach(fref => {
        if (!fref || !fref.id) return;
        if (!map.has(fref.id)) {
          // function exists on an app but not in state.functions → create stub
          const stub = { id: fref.id, name: fref.name || "(unnamed function)" };
          state.functions.push(stub);
          map.set(fref.id, { fn: stub, apps: [] });
        }
        const bucket = map.get(fref.id);
        bucket.apps.push({
          fnId: fref.id,
          app,
          status: fref.status || "available"
        });
      });
    });

    return Array.from(map.values());
  }

  // ------------------------------------------------------------
  // Public entry: render Functions view
  // ------------------------------------------------------------
  function renderFunctionsView() {
    const root = document.getElementById("view");
    if (!root) return;

    if (OL.updateBreadcrumb) {
      OL.updateBreadcrumb("/ Apps / Functions");
    }

    const wrapper = document.createElement("div");
    wrapper.className = "card";

    // If app filter UI exists, we embed it
    const hasFilterUI = OL.appFilterUI && typeof OL.appFilterUI.renderInlineFilter === "function";

    wrapper.innerHTML = `
      <div class="sticky">
        <div class="row" style="align-items:center; justify-content:space-between; padding:10px 14px;">
          <h2>Functions</h2>
          <div class="row" style="gap:8px; align-items:center;">
            ${hasFilterUI ? `<div id="functionsAppFilter"></div>` : ""}
            <button class="btn small" id="fnAddButton">+ Add Function</button>
          </div>
        </div>
      </div>
      <div id="functionsList" style="margin-top:8px;"></div>
    `;

    root.innerHTML = "";
    root.appendChild(wrapper);

    if (hasFilterUI) {
      const filterHost = document.getElementById("functionsAppFilter");
      OL.appFilterUI.renderInlineFilter(filterHost);
    }

    const addBtn = document.getElementById("fnAddButton");
    addBtn.onclick = () => {
      const name = (prompt("New function name:") || "").trim();
      if (!name) return;
      const newFn = { id: uid(), name };
      state.functions = state.functions || [];
      state.functions.push(newFn);
      persist();
      renderFunctionsList();
    };

    renderFunctionsList();
  }

  // ------------------------------------------------------------
  // Render list body
  // ------------------------------------------------------------
  function renderFunctionsList() {
    const listEl = document.getElementById("functionsList");
    if (!listEl) return;

    const groups = buildFunctionIndex();

    // get selected app filter if available
    let selectedAppIds = [];
    if (OL.appFilterUI && typeof OL.appFilterUI.getSelectedAppIds === "function") {
      selectedAppIds = OL.appFilterUI.getSelectedAppIds() || [];
    }

    const filtered = groups.filter(group => {
      if (!selectedAppIds.length) return true;
      return group.apps.some(link => selectedAppIds.includes(link.app.id));
    });

    if (!filtered.length) {
      listEl.innerHTML = `<p class="muted">No functions match the current filters.</p>`;
      return;
    }

    const html = filtered.map(group => renderFunctionCard(group)).join("");
    listEl.innerHTML = html;

    // wire pills (click = cycle state, right-click = remove)
    filtered.forEach(group => {
      const fnId = group.fn.id;
      group.apps.forEach(link => {
        const selector = `.fnAppsWrap .fnAppPill[data-fn-id="${fnId}"][data-app-id="${link.app.id}"]`;
        const pillEl = listEl.querySelector(selector);
        if (!pillEl) return;

        pillEl.onclick = (e) => {
          e.stopPropagation();
          cycleAssignmentStatus(link.app, fnId);
          persist();
          renderFunctionsList();
          // also refresh apps grid so colors stay in sync
          if (OL.renderApps) OL.renderApps();
        };

        pillEl.oncontextmenu = (e) => {
          e.preventDefault();
          removeAssignment(link.app, fnId);
          persist();
          renderFunctionsList();
          if (OL.renderApps) OL.renderApps();
        };
      });
    });
  }

  function renderFunctionCard(group) {
    const fn = group.fn;
    const appsHTML = group.apps.length
      ? group.apps.map(link => functionAppPillHTML(link)).join("")
      : `<span class="pill pill-empty">No apps mapped</span>`;

    return `
      <div class="card fn-card" data-fn-id="${fn.id}">
        <div class="row" style="justify-content:space-between; align-items:flex-start; gap:12px;">
          <div class="fn-main">
            <div class="fn-name">${esc(fn.name || "")}</div>
          </div>
          <div class="fnAppsWrap">
            ${appsHTML}
          </div>
        </div>
      </div>
    `;
  }

  function functionAppPillHTML(link) {
    const { app, status, fnId } = link;
    const baseClass = "pill fnAppPill";
    let stateClass = "";
    // mirror same meaning as in app modal:
    // available (neutral), primary (strong), evaluating (muted)
    if (status === "primary") stateClass = " fnAppPill-primary";
    else if (status === "evaluating") stateClass = " fnAppPill-evaluating";
    else stateClass = " fnAppPill-available";

    const label = typeof OL.appLabelHTML === "function"
      ? OL.appLabelHTML(app)
      : esc(app.name || "");

    return `
      <span class="${baseClass}${stateClass}"
            data-fn-id="${fnId}"
            data-app-id="${app.id}">
        ${label}
      </span>
    `;
  }

  // ------------------------------------------------------------
  // Mutators (shared with app-modal semantics)
  // ------------------------------------------------------------
  function cycleAssignmentStatus(app, fnId) {
    if (!app) return;
    app.functions = app.functions || [];
    const entry = app.functions.find(f => f.id === fnId);
    if (!entry) return;

    if (entry.status === "available" || !entry.status) {
      entry.status = "primary";
    } else if (entry.status === "primary") {
      entry.status = "evaluating";
    } else {
      entry.status = "available";
    }
  }

  function removeAssignment(app, fnId) {
    if (!app) return;
    app.functions = (app.functions || []).filter(f => f.id !== fnId);
  }

  // ------------------------------------------------------------
  // Public exports
  // ------------------------------------------------------------
  OL.renderFunctionsView = renderFunctionsView;
  // alias in case routing calls `renderFunctions`
  OL.renderFunctions = renderFunctionsView;

})();
