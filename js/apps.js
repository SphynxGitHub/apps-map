;(() => {

  const core = window.OL;
  const { state, persist } = core;
  const { appIconHTML } = core.icons;

  function esc(s) {
    return core.utils.esc(s);
  }

  // APP LABEL = [icon] [full name]
  function appLabelHTML(app) {
    return `
      <span class="appLabel">
        ${appIconHTML(app)}
        <span class="appLabelName">${esc(app.name || '')}</span>
      </span>
    `;
  }

  // =========================================================
  // RENDER APPS LIST (GRID or DETAILS)
  // =========================================================

  function renderApps() {
    const container = document.getElementById("appsContainer");
    if (!container) return;

    container.innerHTML = "";
    state.appsViewMode = state.appsViewMode || "details";

    if (state.appsViewMode === "grid") {
      renderAppsGrid(container);
    } else {
      renderAppsDetails(container);
    }
  }

  // =========================================================
  // GRID VIEW
  // =========================================================

  function renderAppsGrid(container) {
    const grid = document.createElement("div");
    grid.className = "appsGrid";

    state.apps.forEach(app => {
      const card = document.createElement("div");
      card.className = "appCard";
      card.dataset.id = app.id;

      card.innerHTML = `
        <div class="app-icon-box">
          ${appIconHTML(app)}
        </div>
        <div class="app-title">${esc(app.name)}</div>
      `;

      card.onclick = () => {
        core.openAppModal(app.id);
      };

      grid.appendChild(card);
    });

    // + Add Application button
    const addBtn = document.createElement("button");
    addBtn.className = "btn small";
    addBtn.textContent = "+ Add Application";
    addBtn.onclick = () => core.openAppModalNew();

    const wrap = document.createElement("div");
    wrap.className = "appsAddNew";
    wrap.appendChild(addBtn);

    container.appendChild(grid);
    container.appendChild(wrap);
  }

  // =========================================================
  // DETAILS VIEW
  // =========================================================

  function renderAppsDetails(container) {
    const table = document.createElement("div");
    table.className = "appsTable";

    state.apps.forEach(app => {
      const row = document.createElement("div");
      row.className = "appRow";
      row.dataset.id = app.id;

      row.innerHTML = `
        <div class="appRowIcon">${appIconHTML(app)}</div>
        <div class="appRowTitle">${esc(app.name)}</div>
        <div class="appRowNotes">${esc(app.notes || "")}</div>
      `;

      row.onclick = () => core.openAppModal(app.id);

      table.appendChild(row);
    });

    // + Add Application button
    const addBtn = document.createElement("button");
    addBtn.className = "btn small";
    addBtn.textContent = "+ Add Application";
    addBtn.onclick = () => core.openAppModalNew();

    const wrap = document.createElement("div");
    wrap.className = "appsAddNew";
    wrap.appendChild(addBtn);

    container.appendChild(table);
    container.appendChild(wrap);
  }

  // =========================================================
  // PUBLIC API
  // =========================================================

  core.renderApps = renderApps;
  core.appLabelHTML = appLabelHTML;

})();
