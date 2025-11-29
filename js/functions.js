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

  // ------------------------------------------------------------
  // CLEAN + CORRECT MODAL
  // ------------------------------------------------------------
  OL.openFunctionModal = function(fnId) {
    const group = buildFunctionIndex().find(g => g.fn.id === fnId);
    if (!group) return;
    const fn = group.fn;

    const appsHtml = group.apps.length
      ? group.apps.map(link => functionAppPillHTML(link)).join("")
      : `<span class="pill pill-empty">No apps mapped</span>`;

    const notesValue = fn.notes || "";

    const modalHtml = `
      <div class="modal-head">
        <div class="modal-title-text" contenteditable="true" id="fnModalTitle">
          ${esc(fn.name || "")}
        </div>
      </div>
      <div class="modal-body">
        <label class="modal-section-label">Used in Apps</label>
        <div id="fnModalApps">${appsHtml}</div>

        <label class="modal-section-label">Notes</label>
        <textarea id="fnModalNotes" class="modal-textarea">${esc(notesValue)}</textarea>
      </div>
    `;

    OL.openModal({ contentHTML: modalHtml });

    wireModalEvents(fnId);
  };

  function wireModalEvents(fnId){
    const fn = (state.functions || []).find(f => f.id === fnId);

    const titleEl = document.getElementById("fnModalTitle");
    titleEl?.addEventListener("blur", () => {
      const newName = titleEl.textContent.trim();
      if (!newName) return;
      fn.name = newName;
      persist();
      renderFunctionsList();
      OL.renderApps?.();
    });

    const notesEl = document.getElementById("fnModalNotes");
    notesEl?.addEventListener("input",() => {
      fn.notes = notesEl.value;
      persist();
    });

    const appsWrap = document.getElementById("fnModalApps");
    if (!appsWrap) return;

    buildFunctionIndex()
      .find(g => g.fn.id === fnId)
      .apps.forEach(link => {
        const pill = appsWrap.querySelector(
          `.fnAppPill[data-fn-id="${fnId}"][data-app-id="${link.app.id}"]`
        );

        pill?.addEventListener("click", e => {
          e.stopPropagation();
          cycleAssignmentStatus(link.app, fnId);
          persist();
          renderFunctionsList();
          OL.renderApps?.();
          OL.openFunctionModal(fnId);
        });

        pill?.addEventListener("contextmenu", e => {
          e.preventDefault();
          removeAssignment(link.app, fnId);
          persist();
          renderFunctionsList();
          OL.renderApps?.();
          OL.openFunctionModal(fnId);
        });
      });
  }

  // ------------------------------------------------------------
  // Export
  // ------------------------------------------------------------
  OL.renderFunctionsView = renderFunctionsView;
  OL.renderFunctions = renderFunctionsView;

})();
