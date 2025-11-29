;(() => {
  if (!window.OL) {
    console.error("functions.js: OL core not found");
    return;
  }

  const OL = window.OL;
  const { state, persist, utils } = OL;
  const { esc, uid } = utils;

  const statusOrder = {
    "primary": 1,
    "evaluating": 2,
    "available": 3
  };

  // ------------------------------------------------------------
  // Cross-map functions → apps
  // ------------------------------------------------------------
  function buildFunctionIndex() {
    const map = new Map();
    (state.functions || []).forEach(fn => {
      if (!fn?.id) return;
      map.set(fn.id, { fn, apps: [] });
    });

    (state.apps || []).forEach(app => {
      (app.functions || []).forEach(fref => {
        if (!fref?.id) return;

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

  // ============================================================
  // Render Functions main view
  // ============================================================
  function renderFunctionsView() {
    const root = document.getElementById("view");
    if (!root) return;

    OL.updateBreadcrumb?.("/ Apps / Functions");

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

  function addNewFunction() {
    const name = (prompt("Name this function:") || "").trim();
    if (!name) return;

    state.functions = state.functions || [];
    state.functions.push({ id: uid(), name });

    persist();
    renderFunctionsList();
  }

  // ============================================================
  // Render function cards
  // ============================================================
  function renderFunctionsList() {
    const listEl = document.getElementById("functionsList");
    if (!listEl) return;

    const groups = buildFunctionIndex();

    if (!groups.length) {
      listEl.innerHTML = `<p class="muted">No functions found.</p>`;
      return;
    }

    listEl.innerHTML = groups.map(renderFunctionCard).join("");

    // Attach click handlers properly
    groups.forEach(group => {
      const fnId = group.fn.id;
      const cardEl = listEl.querySelector(`.fn-card[data-fn-id="${fnId}"]`);
      if (!cardEl) return;
    
      // Clicking on left section opens modal
      const mainEl = cardEl.querySelector(".fn-main");
      if (mainEl) {
        mainEl.onclick = (e) => {
          e.stopPropagation();
          OL.openFunctionModal(fnId);
        };
      }
    
      // Clicking on right pill area should NOT open modal
      const pillWrap = cardEl.querySelector(".fnAppsWrap");
      if (pillWrap) {
        pillWrap.onclick = (e) => {
          e.stopPropagation();
        };
      }
    });

    // Attach pill click & right-click
    groups.forEach(group => {
      const fnId = group.fn.id;
      group.apps.forEach(link => {
        const pillSel = `.fnAppsWrap .fnAppPill[data-fn-id="${fnId}"][data-app-id="${link.app.id}"]`;
        const pillEl = listEl.querySelector(pillSel);
        if (!pillEl) return;

        pillEl.onclick = (e) => {
          e.stopPropagation();
          cycleAssignmentStatus(link.app, fnId);
          persist();
          renderFunctionsList();
          OL.renderApps?.();
        };

        pillEl.oncontextmenu = (e) => {
          e.preventDefault();
          removeAssignment(link.app, fnId);
          persist();
          renderFunctionsList();
          OL.renderApps?.();
        };
      });
    });
  }

  function renderFunctionCard(group) {
    const fn = group.fn;
    const appsSorted = group.apps.slice().sort((a, b) =>
      statusOrder[a.status || "available"] - statusOrder[b.status || "available"]
    );
    const appsHTML = appsSorted.length
      ? appsSorted.map(link => functionAppPillHTML(link)).join("")
      : `<span class="pill pill-empty">No apps mapped</span>`;

    return `
      <div class="card fn-card" data-fn-id="${fn.id}">
        <div class="row" style="justify-content:space-between; align-items:flex-start; gap:12px;">
          <div class="fn-main"><div class="fn-name">${esc(fn.name)}</div></div>
          <div class="fnAppsWrap">${appsHTML}</div>
        </div>
      </div>
    `;
  }

  function functionAppPillHTML(link) {
    const { app, status, fnId } = link;
    return `
      <span class="pill fnAppPill ${statusClassForFn(status)}"
            data-fn-id="${fnId}"
            data-app-id="${app.id}">
        ${esc(app.name)}
      </span>
    `;
  }

  // ============================================================
  // Assign/remove/cycle
  // ============================================================
  function statusClassForFn(status) {
    if (status === "primary") return "fnAppPill-primary";
    if (status === "evaluating") return "fnAppPill-evaluating";
    return "fnAppPill-available";
  }

  function cycleAssignmentStatus(app, fnId) {
    const entry = app.functions?.find(f => f.id === fnId);
    if (!entry) return;

    if (!entry.status || entry.status === "available") entry.status = "primary";
    else if (entry.status === "primary") entry.status = "evaluating";
    else entry.status = "available";
  }

  function removeAssignment(app, fnId) {
    app.functions = (app.functions || []).filter(f => f.id !== fnId);
  }

  // ============================================================
  // Function Modal
  // ============================================================
  OL.openFunctionModal = function(fnId) {
    const groups = buildFunctionIndex();
    const group = groups.find(g => g.fn.id === fnId);
    if (!group) return;

    const fn = group.fn;
    const appsLinked = group.apps || [];
    const allApps = [...(state.apps || [])].sort((a, b) => (a.name||"").localeCompare(b.name||""));
    const linkedIds = new Set(appsLinked.map(x => x.app.id));

    const appOptions =
      allApps.filter(a => !linkedIds.has(a.id))
      .map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`)
      .join("");

    const appsSorted = appsLinked.slice().sort((a, b) =>
      statusOrder[a.status || "available"] - statusOrder[b.status || "available"]
    );
    
    const appsHtml = appsSorted.length
      ? appsSorted.map(link => `
          <span class="pill fnAppPill ${statusClassForFn(link.status)}"
                data-app-id="${link.app.id}"
                data-fn-id="${fn.id}">
            ${esc(link.app.name)}
          </span>
        `).join("")
      : `<span class="pill pill-empty">No apps mapped</span>`;

    OL.openModal({
      contentHTML: `
        <div class="modal">
          <div class="modal-head">
            <div class="modal-title-text" contenteditable="true" id="fnModalTitle">${esc(fn.name)}</div>
          </div>
          <div class="modal-body">

          <div class="int-modal-legend" style="margin-top:6px;">
            <span class="int-modal-legend-label">Status</span>
            <span><span class="integration-type-dot primary"></span>Primary</span>
            <span><span class="integration-type-dot evaluating"></span>Evaluating</span>
            <span><span class="integration-type-dot available"></span>Available</span>
          </div>

            <div id="fnModalApps">${appsHtml}</div>

            <div class="row" style="margin-top:6px; gap:6px;">
              <select id="fnAddAppSelect">
                <option value="">— Select App —</option>
                ${appOptions}
              </select>
              <button class="btn small" id="fnAddAppButton">+ Add</button>
            </div>

            <label class="modal-section-label" style="margin-top:12px;">Notes</label>
            <textarea id="fnModalNotes" class="modal-textarea">${esc(fn.notes || "")}</textarea>
          </div>
        </div>
      `
    });

    // title edit
    document.getElementById("fnModalTitle").onblur = () => {
      fn.name = document.getElementById("fnModalTitle").textContent.trim();
      persist();
      renderFunctionsList();
      OL.renderApps?.();
    };

    // notes edit
    document.getElementById("fnModalNotes").oninput = () => {
      fn.notes = document.getElementById("fnModalNotes").value;
      persist();
    };

    // add app
    document.getElementById("fnAddAppButton").onclick = () => {
      const appId = document.getElementById("fnAddAppSelect").value;
      const app = state.apps.find(a => a.id === appId);
      if (!app) return;

      app.functions ||= [];
      if (!app.functions.find(f => f.id === fnId)) {
        app.functions.push({ id: fnId, status: "available" });
      }

      persist();
      renderFunctionsList();
      OL.renderApps?.();
      OL.openFunctionModal(fnId);
    };

    // cycle/remove inside modal
    appsLinked.forEach(link => {
      const pillEl = document.querySelector(
        `.fnAppPill[data-fn-id="${fn.id}"][data-app-id="${link.app.id}"]`
      );
      if (!pillEl) return;

      pillEl.onclick = () => {
        cycleAssignmentStatus(link.app, fn.id);
        persist();
        renderFunctionsList();
        OL.renderApps?.();
        OL.openFunctionModal(fnId);
      };

      pillEl.oncontextmenu = (e) => {
        e.preventDefault();
        removeAssignment(link.app, fn.id);
        persist();
        renderFunctionsList();
        OL.renderApps?.();
        OL.openFunctionModal(fnId);
      };
    });
  };

  // expose
  OL.renderFunctionsView = renderFunctionsView;
  OL.renderFunctions = renderFunctionsView;
})();
