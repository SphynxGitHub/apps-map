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
  // wire function card click -> open function modal
  filtered.forEach(group => {
    const fnId = group.fn.id;
    const cardEl = listEl.querySelector(`.fn-card[data-fn-id="${fnId}"]`);
    if (!cardEl) return;
    cardEl.onclick = () => {
      if (typeof OL.openFunctionModal === "function") {
        OL.openFunctionModal(fnId);
      }
    };
  });


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

// ------------------------------------------------------------
// Function Modal (restored)
// ------------------------------------------------------------
function statusClassForFn(status) {
  if (status === "primary") return "fnAppPill-primary";
  if (status === "evaluating") return "fnAppPill-evaluating";
  return "fnAppPill-available";
}

OL.openFunctionModal = function(fnId) {
  const groups = buildFunctionIndex();
  const group = groups.find(g => g.fn && g.fn.id === fnId);
  if (!group) return;

  const fn = group.fn;
  const appsLinked = group.apps || [];

  const appsHtml = appsLinked.length
    ? appsLinked.map(link => {
        const app = link.app;
        const status = link.status || "available";
        return `
          <span class="pill fnAppPill ${statusClassForFn(status)}"
                data-app-id="${app.id}"
                data-fn-id="${fn.id}">
            ${esc(app.name || "")}
          </span>
        `;
      }).join("")
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

  if (typeof OL.openModal !== "function") {
    console.error("openFunctionModal: OL.openModal is not available");
    return;
  }

  OL.openModal({ contentHTML: modalHtml });

  // Title editing
  const titleEl = document.getElementById("fnModalTitle");
  if (titleEl) {
    titleEl.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        titleEl.blur();
      }
    });
    titleEl.addEventListener("blur", () => {
      const newName = titleEl.textContent.trim();
      if (!newName) return;
      fn.name = newName;
      if (typeof OL.persist === "function") OL.persist();
      if (typeof OL.renderFunctions === "function") OL.renderFunctions();
      if (typeof OL.renderApps === "function") OL.renderApps();
    });
  }

  // Notes editing
  const notesEl = document.getElementById("fnModalNotes");
  if (notesEl) {
    notesEl.addEventListener("input", () => {
      fn.notes = notesEl.value;
      if (typeof OL.persist === "function") OL.persist();
    });
  }

  // App pills inside modal – click to cycle status, right-click to unassign
  const appsWrap = document.getElementById("fnModalApps");
  if (appsWrap) {
    appsLinked.forEach(link => {
      const selector = `.fnAppPill[data-fn-id="${fn.id}"][data-app-id="${link.app.id}"]`;
      const pillEl = appsWrap.querySelector(selector);
      if (!pillEl) return;

      pillEl.addEventListener("click", e => {
        e.stopPropagation();
        cycleAssignmentStatus(link.app, fn.id);
        if (typeof OL.persist === "function") OL.persist();
        // refresh both views so everything stays in sync
        if (typeof OL.renderFunctions === "function") OL.renderFunctions();
        if (typeof OL.renderApps === "function") OL.renderApps();
        // also refresh this modal
        OL.openFunctionModal(fn.id);
      });

      pillEl.addEventListener("contextmenu", e => {
        e.preventDefault();
        removeAssignment(link.app, fn.id);
        if (typeof OL.persist === "function") OL.persist();
        if (typeof OL.renderFunctions === "function") OL.renderFunctions();
        if (typeof OL.renderApps === "function") OL.renderApps();
        OL.openFunctionModal(fn.id);
      });
    });
  }
};

})();
