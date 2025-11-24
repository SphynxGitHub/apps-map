;(() => {

  if (!window.OL) {
    console.error("apps.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { esc } = OL.utils;

  // ============================================================
  // REGISTER PUBLIC API
  // ============================================================
  OL.renderApps = function(){
    OL.updateBreadcrumb("/Apps");

    const view = OL.state.appsViewMode || "details";

    const container = document.getElementById("view");
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <div class="seg-group">
          <button class="seg-btn ${view==="details"?"active":""}" data-mode="details">Details</button>
          <button class="seg-btn ${view==="grid"?"active":""}" data-mode="grid">Grid</button>
        </div>
        <button class="btn small" id="newAppBtn">+ Add Application</button>
      </div>
      <div id="appsContainer"></div>
    `;

    container.querySelector("#newAppBtn").onclick = ()=> OL.openAppModalNew();

    container.querySelectorAll(".seg-btn").forEach(btn=>{
      btn.onclick = ()=>{
        OL.state.appsViewMode = btn.dataset.mode;
        OL.persist();
        OL.renderApps();
      };
    });

    renderAppsContent();
  };

  // ============================================================
  // RENDER MAIN CONTENT
  // ============================================================
  function renderAppsContent(){
    const container = document.getElementById("appsContainer");
    if (!container) return;

    if (OL.state.appsViewMode === "grid") {
      container.innerHTML = `<div class="grid cols-3" id="appGrid"></div>`;
      renderGrid(document.getElementById("appGrid"));
    } else {
      container.innerHTML = `<div class="appsTable" id="appsTable"></div>`;
      renderTable(document.getElementById("appsTable"));
    }
  }

  // ============================================================
  // DETAILS TABLE VIEW
  // ============================================================
  function renderTable(el){
    el.innerHTML = "";

    OL.state.apps.forEach(app=>{
      const row = document.createElement("div");
      row.className = "appRow";
      row.style.display = "grid";
      row.style.gridTemplateColumns = "60px 200px 1fr";
      row.style.alignItems = "center";
      row.style.padding = "6px";
      row.style.cursor = "pointer";
      row.style.borderBottom = "1px solid var(--line)";

      row.innerHTML = `
        <div>${OL.appIconHTML(app)}</div>
        <div><strong>${esc(app.name)}</strong></div>
        <div>${esc(app.notes || "")}</div>
      `;

      row.onclick = ()=> OL.openAppModal(app.id);

      el.appendChild(row);
    });
  }

  // ============================================================
  // GRID VIEW
  // ============================================================
  function renderGrid(el){
    el.innerHTML = "";

    OL.state.apps.forEach(app=>{
      const card = document.createElement("div");
      card.className = "card app-card";
      card.style.cursor = "pointer";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "flex-start";
      card.style.gap = "6px";
      card.style.padding = "10px";

      card.innerHTML = `
        <div>${OL.appIconHTML(app)}</div>
        <div class="app-title">${esc(app.name)}</div>
        <div class="muted" style="font-size:12px;">${esc(app.notes||"")}</div>
      `;

      card.onclick = ()=> OL.openAppModal(app.id);

      el.appendChild(card);
    });
  }

})();
