;(() => {

  const core = window.OL;
  const { state, persist } = core;
  const { appIconHTML } = core.icons;
  const esc = core.utils.esc;

  // global label renderer
  function appLabelHTML(app) {
    return `
      <span class="appLabel">
        ${appIconHTML(app)}
        <span class="appLabelName">${esc(app.name || '')}</span>
      </span>
    `;
  }

  // =========================================================
  // RENDER INTEGRATIONS MATRIX
  // =========================================================

  function renderIntegrations() {
    const container = document.getElementById("integrationsContainer");
    if (!container) return;
    container.innerHTML = "";

    // edge case: no apps
    if (!state.apps.length) {
      container.innerHTML = `<div class="muted">No apps defined</div>`;
      return;
    }

    const matrix = document.createElement("table");
    matrix.className = "integrationsMatrix";

    // TABLE HEADER
    const head = document.createElement("thead");
    let headerRow = `<tr><th></th>`;
    state.apps.forEach(app => {
      headerRow += `<th>${appLabelHTML(app)}</th>`;
    });
    headerRow += `</tr>`;
    head.innerHTML = headerRow;
    matrix.appendChild(head);

    // TABLE BODY
    const tbody = document.createElement("tbody");

    // for each vertical app
    state.apps.forEach(appA => {
      let row = `<tr><th>${appLabelHTML(appA)}</th>`;

      // matrix cell for each horizontal app
      state.apps.forEach(appB => {
        if (appA.id === appB.id) {
          row += `<td class="imPossible"></td>`;  // same app = blank
        } else {
          const status = checkIntegrated(appA, appB);
          row += `<td class="intCell"
                    data-a="${appA.id}"
                    data-b="${appB.id}"
                    style="text-align:center;cursor:pointer;">
                    ${renderStatusIcon(status)}
                  </td>`;
        }
      });

      row += `</tr>`;
      tbody.innerHTML += row;
    });

    matrix.appendChild(tbody);
    container.appendChild(matrix);

    activateCellHandlers();
  }

  // =========================================================
  // STATUS ICONS
  // direct = green  
  // zapier = yellow  
  // both = cyan  
  // none = gray 
  // =========================================================

  function renderStatusIcon(status) {
    switch (status) {
      case "direct": return `<span class="pill" style="color:var(--ok)">direct</span>`;
      case "zapier": return `<span class="pill" style="color:#d5a73b">zap</span>`;
      case "both":   return `<span class="pill" style="color:#1fd3bd">both</span>`;
      default:       return `<span class="pill muted">–</span>`;
    }
  }

  // =========================================================
  // CHECK CONNECTION TYPE
  // =========================================================

  function checkIntegrated(appA, appB) {
    appA.integrations = appA.integrations || [];

    const link = appA.integrations.find(i => i.appId === appB.id);
    if (!link) return "none";
    return link.type || "none";
  }

  // =========================================================
  // TABLE CELL INTERACTION
  // left click cycles connection  
  // right click clears it
  // =========================================================

  function activateCellHandlers() {
    document.querySelectorAll(".intCell").forEach(cell => {
      const appA = cell.dataset.a;
      const appB = cell.dataset.b;
      const objA = state.apps.find(a => a.id === appA);
      const objB = state.apps.find(a => a.id === appB);

      if (!objA || !objB) return;

      cell.onclick = (e) => {
        e.preventDefault();
        toggleIntegration(objA, objB.id);
        persist();
        renderIntegrations();
      };

      cell.oncontextmenu = (e) => {
        e.preventDefault();
        removeIntegration(objA, objB.id);
        persist();
        renderIntegrations();
      };
    });
  }

  function toggleIntegration(appA, otherId) {
    appA.integrations = appA.integrations || [];
    let link = appA.integrations.find(i => i.appId === otherId);

    if (!link) {
      appA.integrations.push({ appId: otherId, type: "direct" });
    } else {
      link.type = nextType(link.type);
    }
  }

  function nextType(type) {
    if (type === "direct") return "zapier";
    if (type === "zapier") return "both";
    return "direct";
  }

  function removeIntegration(appA, otherId) {
    appA.integrations = appA.integrations || [];
    appA.integrations = appA.integrations.filter(i => i.appId !== otherId);
  }

  // =========================================================
  // PUBLIC API
  // =========================================================

  core.renderIntegrations = renderIntegrations;

})();
