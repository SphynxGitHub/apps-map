;(() => {

  if (!window.OL) {
    console.error("functions.js: OL not loaded");
    return;
  }

  const OL = window.OL;
  const { state, persist, utils } = OL;
  const { esc } = utils;

  // =====================================================================
  // PUBLIC — render functions into #view
  // =====================================================================
  OL.renderFunctions = function() {

    const wrapper = document.getElementById("view");
    if (!wrapper) return;

    OL.updateBreadcrumb("Functions");

    wrapper.innerHTML = `
      <div class="viewHeader">
        <h2>Functions</h2>
        <div style="flex:1"></div>
        <div class="viewModeToggle" id="functionsViewToggle">
          <button data-mode="details">Details</button>
          <button data-mode="icons">Icons</button>
        </div>
      </div>

      <div class="functionFilterRow">
        <label>Filter by App:</label>
        <select id="functionsFilterSelect">
          <option value="">All apps…</option>
          ${state.apps.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}
        </select>
      </div>

      <div id="functionsContainer"></div>
    `;

    initFunctionViewToggle();
    initFunctionFilter();
    renderFunctionsList();
  };


  // =====================================================================
  // VIEW MODE TOGGLE
  // =====================================================================
  function initFunctionViewToggle(){
    const el = document.getElementById("functionsViewToggle");
    if (!el) return;

    el.querySelectorAll("button").forEach(btn => {
      const mode = btn.dataset.mode;
      btn.onclick = () => {
        state.functionsViewMode = mode;
        persist();
        renderFunctionsList();
      };
    });
  }

  // =====================================================================
  // APP FILTER
  // =====================================================================
  function initFunctionFilter(){
    const sel = document.getElementById("functionsFilterSelect");
    if (!sel) return;

    sel.value = state.functionsFilterAppId || "";

    sel.onchange = () => {
      state.functionsFilterAppId = sel.value;
      persist();
      renderFunctionsList();
    };
  }

  // =====================================================================
  // RENDER LIST OF FUNCTIONS
  // =====================================================================
  function renderFunctionsList(){
    const container = document.getElementById("functionsContainer");
    if (!container) return;

    container.innerHTML = "";

    const list = getFilteredFunctions();

    if (!list.length) {
      container.innerHTML = `<div class="empty">No matching functions.</div>`;
      return;
    }

    if (state.functionsViewMode === "icons"){
      container.className = "functionsGrid";
      renderFunctionsIconView(list, container);
    } else {
      container.className = "";
      renderFunctionsDetailView(list, container);
    }
  }

  function getFilteredFunctions(){

    const filtered = [...state.functions];

    if (!state.functionsFilterAppId){
      return filtered;
    }

    // Filter by apps referencing this function
    return filtered.filter(fn => {
      return state.apps.some(app =>
        (app.functions || []).some(f => f.id === fn.id)
        && app.id === state.functionsFilterAppId
      );
    });
  }

  // =====================================================================
  // DETAILS LIST
  // =====================================================================
  function renderFunctionsDetailView(list, container){
    list.forEach(fn => {

      const row = document.createElement("div");
      row.className = "fnRow";

      row.innerHTML = `
        <div class="fnName">${esc(fn.name)}</div>
        <div class="fnLinked">${renderLinkedApps(fn.id)}</div>
      `;

      container.appendChild(row);
    });
  }

  // =====================================================================
  // ICON GRID
  // =====================================================================
  function renderFunctionsIconView(list, container){
    list.forEach(fn => {

      const cell = document.createElement("div");
      cell.className = "fnIconCard";

      cell.innerHTML = `
        <div class="fnIcon">${fn.name.substring(0,3).toUpperCase()}</div>
        <div class="fnName">${esc(fn.name)}</div>
        <div class="fnLinked">${renderLinkedApps(fn.id)}</div>
      `;

      container.appendChild(cell);
    });
  }

  // =====================================================================
  // FUNCTION — APP RELATION RENDER
  // =====================================================================
  function renderLinkedApps(fnId){

    const appsForFunction = state.apps.filter(a =>
      (a.functions || []).some(f => f.id === fnId)
    );

    if (!appsForFunction.length) {
      return `<span class="none">No apps assigned</span>`;
    }

    return appsForFunction.map(a => {
      return `
        <span class="appMini">
          ${OL.appLabelHTML(a)}
        </span>
      `;
    }).join("");
  }

})();
