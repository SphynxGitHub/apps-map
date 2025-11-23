// ===================================================
// FUNCTIONS UI MODULE
// ===================================================

const FunctionsUI = (() => {
  const { state, persist, $, $all, uid, esc, findById, FN_LEVEL_COLORS } = AppCore;

  // ==========================================
  // MAIN RENDER
  // ==========================================
  function renderFunctions() {
    const container = $("#functionsContainer");
    if (!container) return;

    const appFilterVal = $("#functionsFilterApp")?.value || "";

    container.innerHTML = "";

    state.functions.forEach(fn => {
      if (appFilterVal && !isFunctionAssignedToApp(fn.id, appFilterVal)) {
        return;
      }

      container.appendChild(renderFunctionCard(fn));
    });
  }

  // helper
  function isFunctionAssignedToApp(fnId, appId) {
    return state.functionAssignments.some(
      a => a.functionId === fnId && a.appId === appId
    );
  }

  // ==========================================
  // FUNCTION CARD
  // ==========================================
  function renderFunctionCard(fn) {
    const card = document.createElement("div");
    card.className = "functionCard";

    const apps = state.functionAssignments
      .filter(a => a.functionId === fn.id)
      .map(a => ({
        app: findById(state.apps, a.appId),
        assign: a
      }));

    card.innerHTML = `
      <div class="fnHeader">
        <input class="fnTitleInput" value="${esc(fn.name)}" data-id="${fn.id}">
        <button class="fnDeleteBtn" data-id="${fn.id}">✕</button>
      </div>

      <div class="fnAppsWrap" id="fnApps_${fn.id}">
        ${apps.map(a => renderAppAssignmentPill(a)).join("")}
        <div class="fnAssignBtn" data-id="${fn.id}">+ Assign App</div>
      </div>
    `;

    // events
    card.querySelector(`.fnTitleInput`).oninput = (e) => {
      fn.name = e.target.value;
      persist();
    };

    card.querySelector(`.fnDeleteBtn`).onclick = () => {
      deleteFunction(fn.id);
    };

    card.querySelector(`.fnAssignBtn`).onclick = () => {
      openAssignAppDropdown(fn.id);
    };

    return card;
  }

  // ==========================================
  // FUNCTION → APP PILL
  // ==========================================
  function renderAppAssignmentPill({ app, assign }) {
    const iconHTML = AppsUI.renderAppIcon(app.iconId, app.name);
    const border = FN_LEVEL_COLORS[assign.level] || "#999";

    return `
      <span class="fnAppPill" data-assign-id="${assign.id}" style="border-color:${border}">
        ${iconHTML} ${esc(app.name)}
        <span class="fnAppLevel">${assign.level}</span>
        <span class="fnAppRemove">×</span>
      </span>
    `;
  }

  // ==========================================
  // DELETE FUNCTION
  // ==========================================
  function deleteFunction(id) {
    if (!confirm("Delete function?")) return;

    state.functions = state.functions.filter(f => f.id !== id);
    state.functionAssignments = state.functionAssignments.filter(a => a.functionId !== id);

    persist();
    renderFunctions();
  }

  // ==========================================
  // REMOVE APP FROM FUNCTION
  // ==========================================
  document.addEventListener("click", (event) => {
    if (!event.target.classList.contains("fnAppRemove")) return;

    const pill = event.target.closest(".fnAppPill");
    const assignId = pill.dataset.assignId;

    state.functionAssignments = state.functionAssignments.filter(a => a.id !== assignId);
    persist();

    renderFunctions();
  });

  // ==========================================
  // OPEN DROP-DOWN TO ASSIGN APP
  // ==========================================
  function openAssignAppDropdown(fnId) {
    const parent = $(`#fnApps_${fnId}`);
    if (!parent) return;

    const dropdown = document.createElement("div");
    dropdown.className = "assignDropdown";

    dropdown.innerHTML = `
      <input type="text" class="assignSearch" placeholder="Search apps...">

      <div class="assignList">
        ${state.apps.map(app => {
          const iconHTML = AppsUI.renderAppIcon(app.iconId, app.name);
          return `<div class="assignOption" data-id="${app.id}">${iconHTML} ${esc(app.name)}</div>`;
        }).join("")}
      </div>
    `;

    parent.appendChild(dropdown);

    const input = dropdown.querySelector(".assignSearch");
    input.focus();

    input.oninput = () => {
      const term = input.value.toLowerCase();
      dropdown.querySelectorAll(".assignOption").forEach(opt => {
        const txt = opt.textContent.toLowerCase();
        opt.style.display = txt.includes(term) ? "" : "none";
      });
    };

    dropdown.onclick = (e) => {
      const appId = e.target.closest(".assignOption")?.dataset.id;
      if (!appId) return;
      chooseAppForFunction(fnId, appId);
      dropdown.remove();
    };

    document.addEventListener("click", (evt) => {
      if (!dropdown.contains(evt.target)) dropdown.remove();
    }, { once: true });
  }

  function chooseAppForFunction(fnId, appId) {
    state.functionAssignments.push({
      id: uid("fnApp"),
      functionId: fnId,
      appId: appId,
      level: "available"
    });
    persist();
    renderFunctions();
  }

  // ==========================================
  // FILTERING BY APP
  // ==========================================
  function buildFunctionFilter() {
    const select = $("#functionsFilterApp");
    if (!select) return;

    select.innerHTML = `
      <option value="">All apps</option>
      ${state.apps.map(app => `<option value="${app.id}">${esc(app.name)}</option>`).join("")}
    `;

    select.onchange = renderFunctions;
  }

  // ==========================================
  // EXPOSE API
  // ==========================================
  return {
    renderFunctions,
    buildFunctionFilter
  };
})();
