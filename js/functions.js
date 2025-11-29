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

    (state.functions || []).forEach(fn => {
      if (!fn || !fn.id) return;
      map.set(fn.id, { fn, apps: [] });
    });

    (state.apps || []).forEach(app => {
      (app.functions || []).forEach(fref => {
        if (!fref || !fref.id) return;
        if (!map.has(fref.id)) {
          const stub = { id: fref.id, name: fref.name || "(unnamed function)" };
          state.functions.push(stub);
          map.set(fref.id, { fn: stub, apps: [] });
        }
        map.get(fref.id).apps.push({
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

    wrapper.innerHTML = `
      <div class="sticky">
        <div class="row" style="align-items:center; justify-content:space-between; padding:10px 14px;">
          <h2>Functions</h2>
          <div class="row" style="gap:8px; align-items:center;">
            <button class="btn small" id="fnAddButton">+ Add Function</button>
          </div>
        </div>
      </div>
      <div id="functionsList" style="margin-top:8px;"></div>
    `;

    root.innerHTML = "";
    root.appendChild(wrapper);

    document.getElementById("fnAddButton").onclick = addNewFunction;
    renderFunctionsList();
  }

  function addNewFunction(){
    const name = (prompt("New function name:") || "").trim();
    if (!name) return;
    const newFn = { id: uid(), name };
    state.functions = state.functions || [];
    state.functions.push(newFn);
    persist();
    renderFunctionsList();
  }

  // ------------------------------------------------------------
  // Render list body
  // ------------------------------------------------------------
  function renderFunctionsList() {
    const listEl = document.getElementById("functionsList");
    if (!listEl) return;
  
    const groups = buildFunctionIndex();
    const filtered = groups;  // No app filter at present
    
    if (!filtered.length) {
      listEl.innerHTML = `<p class="muted">No functions found.</p>`;
      return;
    }
    
    listEl.innerHTML = filtered.map(group => renderFunctionCard(group)).join("");

    // Card click → open modal
    filtered.forEach(group => {
      const cardEl = listEl.querySelector(`.fn-card[data-fn-id="${group.fn.id}"]`);
      if (cardEl) {
        cardEl.addEventListener("click", () => OL.openFunctionModal(group.fn.id));
      }
    });

    // Wire pills
    filtered.forEach(group => {
      group.apps.forEach(link => {
        const pill = listEl.querySelector(
          `.fnAppPill[data-fn-id="${group.fn.id}"][data-app-id="${link.app.id}"]`
        );

        if (!pill) return;

        pill.onclick = e => {
          e.stopPropagation();
          cycleAssignmentStatus(link.app, group.fn.id);
          persist();
          renderFunctionsList();
          if (OL.renderApps) OL.renderApps();
        };

        pill.oncontextmenu = e => {
          e.preventDefault();
          removeAssignment(link.app, group.fn.id);
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
    let stateClass = "";
    if (status === "primary") stateClass = "fnAppPill-primary";
    else if (status === "evaluating") stateClass = "fnAppPill-evaluating";
    else stateClass = "fnAppPill-available";

    return `
      <span class="pill fnAppPill ${stateClass}"
            data-fn-id="${fnId}"
            data-app-id="${app.id}">
        ${esc(app.name || "")}
      </span>
    `;
  }

  function cycleAssignmentStatus(app, fnId) {
    if (!app) return;
    app.functions = app.functions || [];
    const entry = app.functions.find(f => f.id === fnId);
    if (!entry) return;

    if (entry.status === "available" || !entry.status) entry.status = "primary";
    else if (entry.status === "primary") entry.status = "evaluating";
    else entry.status = "available";
  }

  function removeAssignment(app, fnId) {
    if (!app) return;
    app.functions = (app.functions || []).filter(f => f.id !== fnId);
  }

 // ------------------------------------------------------------------
  // Function Modal (upgraded for 2-way reflection & assignment control)
  // ------------------------------------------------------------------
  OL.openFunctionModal = function(fnId) {
    const groups = buildFunctionIndex();
    const group = groups.find(g => g.fn && g.fn.id === fnId);
    if (!group) return;
  
    const fn = group.fn;
    const appsLinked = group.apps || [];
  
    const allApps = (OL.state.apps || []).slice().sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  
    const linkedAppIds = new Set(appsLinked.map(x => x.app.id));
  
    // Build dropdown list of apps NOT yet assigned
    const appOptions = allApps
      .filter(a => !linkedAppIds.has(a.id))
      .map(a => `<option value="${esc(a.id)}">${esc(a.name || "")}</option>`)
      .join("");
  
    const appsHtml = appsLinked.length
      ? appsLinked
          .map(link => {
            const app = link.app;
            const status = link.status || "available";
            return `
              <span class="pill fnAppPill ${statusClassForFn(status)}"
                    data-fn-id="${fn.id}"
                    data-app-id="${app.id}">
                ${esc(app.name || "")}
              </span>
            `;
          })
          .join("")
      : `<span class="pill pill-empty">No apps mapped</span>`;
  
    const modalHtml = `
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title-text" contenteditable="true" id="fnModalTitle">
            ${esc(fn.name || "")}
          </div>
        </div>
  
        <div class="modal-body">
  
          <label class="modal-section-label">Used in Apps</label>
          <div id="fnModalApps">${appsHtml}</div>
  
          <div class="row" style="margin-top:6px; gap:6px;">
            <select id="fnAddAppSelect">
              <option value="">— Select App —</option>
              ${appOptions}
            </select>
            <button class="btn small" id="fnAddAppButton">+ Add</button>
          </div>
  
          <div class="row" style="margin-top:10px; gap:10px; font-size:11px; color:#9ca3af;">
            <span class="pill fnAppPill-primary">Primary</span>
            <span class="pill fnAppPill-available">Available</span>
            <span class="pill fnAppPill-evaluating">Evaluating</span>
          </div>
  
          <label class="modal-section-label" style="margin-top:12px;">Notes</label>
          <textarea id="fnModalNotes" class="modal-textarea">${esc(fn.notes || "")}</textarea>
  
        </div>
      </div>
    `;
  
    OL.openModal({ contentHTML: modalHtml });
  
    // =======================
    //  Title editing
    // =======================
    const titleEl = document.getElementById("fnModalTitle");
    titleEl.addEventListener("blur", () => {
      fn.name = titleEl.textContent.trim();
      OL.persist();
      OL.renderFunctions();
      OL.renderApps();
    });
  
    // =======================
    //  Notes editing
    // =======================
    const notesEl = document.getElementById("fnModalNotes");
    notesEl.addEventListener("input", () => {
      fn.notes = notesEl.value;
      OL.persist();
    });
  
    // =======================
    //  Add App
    // =======================
    document.getElementById("fnAddAppButton").onclick = () => {
      const select = document.getElementById("fnAddAppSelect");
      const appId = select.value;
      if (!appId) return;
  
      const app = OL.state.apps.find(a => a.id === appId);
      if (!app) return;
  
      // Assign function to app properly
      app.functions = app.functions || [];
      if (!app.functions.find(f => f.id === fn.id)) {
        app.functions.push({ id: fn.id, status: "available" });
      }
  
      OL.persist();
      OL.renderFunctions();
      OL.renderApps();
      OL.openFunctionModal(fnId);
    };
  
    // =======================
    //  Cycle or Remove
    // =======================
    appsLinked.forEach(link => {
      const pillEl = document.querySelector(
        `.fnAppPill[data-fn-id="${fn.id}"][data-app-id="${link.app.id}"]`
      );
  
      pillEl.onclick = () => {
        cycleAssignmentStatus(link.app, fn.id);
        OL.persist();
        OL.renderFunctions();
        OL.renderApps();
        OL.openFunctionModal(fnId);
      };
  
      pillEl.oncontextmenu = (e) => {
        e.preventDefault();
        removeAssignment(link.app, fn.id);
        OL.persist();
        OL.renderFunctions();
        OL.renderApps();
        OL.openFunctionModal(fnId);
      };
    });
  };
  // ------------------------------------------------------------
  // Export
  // ------------------------------------------------------------
  OL.renderFunctionsView = renderFunctionsView;
  OL.renderFunctions = renderFunctionsView;

})();
