;(() => {
  if (!window.OL) {
    console.error("functions.js: OL core not found");
    return;
  }

  const OL = window.OL;
  const { state, persist, utils } = OL;
  const { esc, uid } = utils;

  const statusOrder = {
    primary: 1,
    evaluating: 2,
    available: 3
  };

  // ------------------------------------------------------------
  // Cross-map functions → apps
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
  // Status helpers
  // ------------------------------------------------------------
  function statusClassForFn(status) {
    if (status === "primary") return "fnAppPill-primary";
    if (status === "evaluating") return "fnAppPill-evaluating";
    return "fnAppPill-available";
  }

  function normalizeStatus(s) {
    if (s === "primary" || s === "evaluating" || s === "available") return s;
    return "available";
  }

  function cycleAssignmentStatus(app, fnId) {
    if (!app) return;
    app.functions = app.functions || [];
    const entry = app.functions.find(f => f.id === fnId);
    if (!entry) return;

    const current = normalizeStatus(entry.status);
    if (current === "available") {
      entry.status = "primary";
    } else if (current === "primary") {
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
  // Public entry: render Functions view (/ Apps / Functions)
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
      <div id="functionsList" class="functions-grid" style="margin-top:8px;"></div>
    `;

    root.innerHTML = "";
    root.appendChild(wrapper);

    const addBtn = document.getElementById("fnAddButton");
    if (addBtn) {
      addBtn.onclick = () => {
        const name = (prompt("Name this function:") || "").trim();
        if (!name) return;
        const newFn = { id: uid(), name };
        state.functions = state.functions || [];
        state.functions.push(newFn);
        persist();
        renderFunctionsList();
      };
    }

    renderFunctionsList();
  }

  // ------------------------------------------------------------
  // Render list body
  // ------------------------------------------------------------
  function renderFunctionsList() {
    const listEl = document.getElementById("functionsList");
    if (!listEl) return;

    const groups = buildFunctionIndex();

    if (!groups.length) {
      listEl.innerHTML = `<p class="muted">No functions found.</p>`;
      return;
    }

    listEl.innerHTML = groups.map(renderFunctionCard).join("");

    // Wire up card header click (open modal) and pills (cycle/remove)
    groups.forEach(group => {
      const fnId = group.fn.id;
      const card = listEl.querySelector(`.function-card[data-fn-id="${fnId}"]`);
      if (!card) return;

      const header = card.querySelector(".function-card-header");
      const body   = card.querySelector(".function-card-body");

      // Only clicking the header opens the modal
      if (header) {
        header.onclick = (e) => {
          e.stopPropagation();
          if (typeof OL.openFunctionModal === "function") {
            OL.openFunctionModal(fnId);
          }
        };
      }

      if (body) {
        body.onclick = (e) => {
          e.stopPropagation();
        };
      }

      const pills = card.querySelectorAll(".app-pill");
      pills.forEach(pill => {
        pill.onclick = (e) => {
          e.stopPropagation();
          const appId = pill.getAttribute("data-app-id");
          const app = (state.apps || []).find(a => a.id === appId);
          if (!app) return;
          cycleAssignmentStatus(app, fnId);
          persist();
          renderFunctionsList();
          if (OL.renderApps) OL.renderApps();
        };

        pill.oncontextmenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const appId = pill.getAttribute("data-app-id");
          const app = (state.apps || []).find(a => a.id === appId);
          if (!app) return;
          removeAssignment(app, fnId);
          persist();
          renderFunctionsList();
          if (OL.renderApps) OL.renderApps();
        };
      });
    });
  }

  // ------------------------------------------------------------
  // Render a single function card
  // ------------------------------------------------------------
  function renderFunctionCard(group) {
    const fn = group.fn;

    const appsSorted = group.apps
      .slice()
      .sort((a, b) =>
        (statusOrder[normalizeStatus(a.status)] || 99) -
        (statusOrder[normalizeStatus(b.status)] || 99)
      );

    const appsHTML = appsSorted.length
      ? appsSorted.map(link => functionAppPillHTML(link)).join("")
      : `<span class="pill pill-empty">No apps mapped</span>`;

    return `
      <div class="function-card" data-fn-id="${fn.id}">
        <div class="function-card-header">
          <div class="function-icon">Fn</div>
          <div>
            <div class="function-title">${esc(fn.name || "")}</div>
            <div class="function-apps-label">Apps</div>
          </div>
        </div>
        <div class="function-card-body">
          <div class="function-apps-list">
            ${appsHTML}
          </div>
        </div>
      </div>
    `;
  }

  function functionAppPillHTML(link) {
    const { app, status, fnId } = link;
    const normalized = normalizeStatus(status);

    const labelHTML = typeof OL.appLabelHTML === "function"
      ? OL.appLabelHTML(app)
      : `<span class="pill-label">${esc(app.name || "")}</span>`;

    return `
      <button
        type="button"
        class="app-pill ${statusClassForFn(normalized)}"
        data-fn-id="${fnId}"
        data-app-id="${app.id}"
        data-status="${normalized}">
        ${labelHTML}
      </button>
    `;
  }

  // ------------------------------------------------------------
  // Function Modal
  // ------------------------------------------------------------
  OL.openFunctionModal = function(fnId) {
    const groups = buildFunctionIndex();
    const group = groups.find(g => g.fn.id === fnId);
    if (!group) return;

    const fn = group.fn;
    const appsLinked = group.apps || [];
    const allApps = (state.apps || [])
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const linkedIds = new Set(appsLinked.map(x => x.app.id));

    const appsSorted = appsLinked
      .slice()
      .sort((a, b) =>
        (statusOrder[normalizeStatus(a.status)] || 99) -
        (statusOrder[normalizeStatus(b.status)] || 99)
      );

    const appsHtml = appsSorted.length
      ? appsSorted.map(link => `
          <button
            type="button"
            class="app-pill ${statusClassForFn(link.status)}"
            data-app-id="${link.app.id}"
            data-fn-id="${fn.id}">
            ${
              typeof OL.appLabelHTML === "function"
                ? OL.appLabelHTML(link.app)
                : `<span class="pill-label">${esc(link.app.name || "")}</span>`
            }
          </button>
        `).join("")
      : `<span class="pill pill-empty">No apps mapped</span>`;

    const modalHtml = `
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title-text" contenteditable="true" id="fnModalTitle">
            ${esc(fn.name || "")}
          </div>
        </div>
        <div class="modal-body">
          <label class="modal-section-label">Apps</label>
          <div class="int-modal-legend" style="margin-top:2px; margin-bottom:6px;">
            <span class="int-modal-legend-label">Status</span>
            <span><span class="integration-type-dot primary"></span>Primary</span>
            <span><span class="integration-type-dot evaluating"></span>Evaluating</span>
            <span><span class="integration-type-dot available"></span>Available</span>
          </div>

          <div id="fnModalApps" class="function-apps-list">
            ${appsHtml}
          </div>

          <button class="btn small" id="fnShowAppSelector" style="margin-top:6px;">
            + Assign Apps
          </button>

          <label class="modal-section-label" style="margin-top:12px;">Notes</label>
          <textarea id="fnModalNotes" class="modal-textarea">${esc(fn.notes || "")}</textarea>
        </div>
      </div>
    `;

    OL.openModal({ contentHTML: modalHtml });

    const assignBtn = document.getElementById("fnShowAppSelector");
    if (assignBtn) {
      assignBtn.onclick = (e) => {
        e.stopPropagation();
        showAddAppsSelector(fnId, allApps, linkedIds);
      };
    }

    // Title edit
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
        persist();
        renderFunctionsList();
        if (OL.renderApps) OL.renderApps();
      });
    }

    // Notes edit
    const notesEl = document.getElementById("fnModalNotes");
    if (notesEl) {
      notesEl.addEventListener("input", () => {
        fn.notes = notesEl.value;
        persist();
      });
    }

    // Cycle / remove inside modal
    const appsWrap = document.getElementById("fnModalApps");
    if (appsWrap) {
      const pills = appsWrap.querySelectorAll(".app-pill");
      pills.forEach(pill => {
        pill.onclick = (e) => {
          e.stopPropagation();
          const appId = pill.getAttribute("data-app-id");
          const app = (state.apps || []).find(a => a.id === appId);
          if (!app) return;

          cycleAssignmentStatus(app, fn.id);
          persist();
          renderFunctionsList();
          if (OL.renderApps) OL.renderApps();
          OL.openFunctionModal(fnId);
        };

        pill.oncontextmenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const appId = pill.getAttribute("data-app-id");
          const app = (state.apps || []).find(a => a.id === appId);
          if (!app) return;

          removeAssignment(app, fn.id);
          persist();
          renderFunctionsList();
          if (OL.renderApps) OL.renderApps();
          OL.openFunctionModal(fnId);
        };
      });
    }
  };

  // ------------------------------------------------------------
  // Checklist-style app assignment for Function modal
  // ------------------------------------------------------------
  function showAddAppsSelector(fnId, allApps, linkedIds) {
    const wrap = document.getElementById("fnModalApps");
    if (!wrap) return;

    const existingSelector = document.querySelector(".modal-checklist");
    if (existingSelector) {
      existingSelector.remove();
    }

    const selectorBox = document.createElement("div");
    selectorBox.className = "modal-checklist";

    selectorBox.innerHTML = `
      <input type="text" class="modal-search" placeholder="Search apps..." id="fnSearchApps">
      <div id="fnCheckList"></div>
    `;

    wrap.insertAdjacentElement("afterend", selectorBox);

    const listDiv = document.getElementById("fnCheckList");
    const searchInput = document.getElementById("fnSearchApps");

    let filtered = allApps.slice();

    function renderList() {
      listDiv.innerHTML = "";

      filtered.forEach(app => {
        const isLinked = linkedIds.has(app.id);
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = isLinked;

        const row = document.createElement("label");
        row.className = "modal-checklist-row";

        row.appendChild(cb);
        row.appendChild(document.createTextNode(" " + (app.name || "")));

        cb.onchange = () => {
          const targetApp = state.apps.find(a => a.id === app.id);
          if (!targetApp) return;

          targetApp.functions = targetApp.functions || [];

          if (cb.checked) {
            // ADD mapping
            if (!targetApp.functions.some(f => f.id === fnId)) {
              const existingAssignments = state.apps
                .flatMap(a => (a.functions || []).map(f => f.id))
                .filter(x => x === fnId);

              const status = existingAssignments.length === 0 ? "primary" : "available";

              targetApp.functions.push({ id: fnId, status });
            }
            linkedIds.add(app.id);
          } else {
            // REMOVE mapping
            removeAssignment(targetApp, fnId);
            linkedIds.delete(app.id);
          }

          persist();
          renderFunctionsList();
          if (OL.renderApps) OL.renderApps();
          OL.openFunctionModal(fnId);
        };

        listDiv.appendChild(row);
      });
    }

    searchInput.oninput = () => {
      const q = searchInput.value.toLowerCase();
      filtered = allApps.filter(a =>
        (a.name || "").toLowerCase().includes(q)
      );
      renderList();
    };

    renderList();
  }

  // ------------------------------------------------------------
  // Exports
  // ------------------------------------------------------------
  OL.renderFunctionsView = renderFunctionsView;
  OL.renderFunctions = renderFunctionsView;

  // ============================================================
  // Global pill handler — works on both layouts
  // ============================================================
  document.addEventListener("click", function(e) {
    const pill = e.target.closest(".app-pill, .fnAppPill");
    if (!pill) return;

    e.stopPropagation();

    const card = pill.closest(".function-card, .fn-card");
    if (!card) return;

    const fnId = card.getAttribute("data-fn-id");
    if (!fnId) return;

    let appId = pill.getAttribute("data-app-id");
    if (!appId) {
      const appName = pill.querySelector(".pill-label")?.textContent?.trim();
      if (!appName) return;
      const app = state.apps.find(a => a.name === appName);
      if (!app) return;
      appId = app.id;
    }

    const app = state.apps.find(a => a.id === appId);
    if (!app) return;

    cycleAssignmentStatus(app, fnId);
    persist();

    OL.renderFunctions?.();
    OL.renderApps?.();
  });

})();
