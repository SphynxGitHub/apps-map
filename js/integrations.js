// ===================================================
// INTEGRATIONS UI MODULE
// ===================================================

const IntegrationsUI = (() => {
  const { state, persist, $, $all, uid, esc, findById } = AppCore;

  // ==========================================
  // MAIN RENDER
  // ==========================================
  function renderIntegrations() {
    const container = $("#integrationsContainer");
    if (!container) return;

    const appFilter = $("#integrationsFilterApp")?.value || "";
    const typeFilter = $("#integrationsFilterType")?.value || "";

    container.innerHTML = "";

    state.integrations.forEach(int => {
      const a = findById(state.apps, int.appAId);
      const b = findById(state.apps, int.appBId);

      if (!a || !b) return;

      if (appFilter && !(a.id === appFilter || b.id === appFilter)) return;

      if (typeFilter === "direct" && !int.hasDirect) return;
      if (typeFilter === "zapier" && !int.hasZapier) return;
      if (typeFilter === "none" && (int.hasDirect || int.hasZapier)) return;

      container.appendChild(renderIntegrationCard(int, a, b));
    });

    container.appendChild(renderAddIntegrationButton());
  }

  // ==========================================
  // INTEGRATION CARD
  // ==========================================
  function renderIntegrationCard(int, a, b) {
    const card = document.createElement("div");
    card.className = "integrationCard";

    const iconA = AppsUI.renderAppIcon(a.iconId, a.name);
    const iconB = AppsUI.renderAppIcon(b.iconId, b.name);

    card.innerHTML = `
      <div class="intPair">
        ${iconA} ↔ ${iconB}
      </div>

      <div class="intTypes">
        <span class="intToggle ${int.hasDirect ? "on" : ""}" data-id="${int.uid}" data-type="direct">
          Direct
        </span>
        <span class="intToggle ${int.hasZapier ? "on" : ""}" data-id="${int.uid}" data-type="zapier">
          Zapier
        </span>
      </div>

      <div class="intNotes">
        <textarea data-id="${int.uid}" class="intNotesInput">${esc(int.directNotes || int.zapierNotes || "")}</textarea>
      </div>

      <div class="intDelete">
        <button class="intDeleteBtn" data-id="${int.uid}">✕</button>
      </div>
    `;

    card.querySelector(".intToggle[data-type='direct']").onclick = () => {
      int.hasDirect = !int.hasDirect;
      persist();
      renderIntegrations();
    };

    card.querySelector(".intToggle[data-type='zapier']").onclick = () => {
      int.hasZapier = !int.hasZapier;
      persist();
      renderIntegrations();
    };

    card.querySelector(".intNotesInput").oninput = (e) => {
      const v = e.target.value;
      int.directNotes = v;
      int.zapierNotes = v;
      persist();
    };

    card.querySelector(".intDeleteBtn").onclick = () => {
      if (confirm("Delete this integration?")) {
        state.integrations = state.integrations.filter(x => x !== int);
        persist();
        renderIntegrations();
      }
    };

    return card;
  }

  // ==========================================
  // ADD INTEGRATION BUTTON
  // ==========================================
  function renderAddIntegrationButton() {
    const btn = document.createElement("div");
    btn.className = "integrationsAddNew";
    btn.innerHTML = `<button id="addIntegrationBtn">+ Add Integration</button>`;

    btn.onclick = () => openAddIntegrationModal();
    return btn;
  }

  // ==========================================
  // ADD INTEGRATION MODAL
  // ==========================================
  function openAddIntegrationModal() {
    showModal(`
      <div class="intAddModal">
        <label>Connect App A</label>
        <div id="intAppA">${appSelector()}</div>
        <label>To App B</label>
        <div id="intAppB">${appSelector()}</div>
        <button id="intCreate">Create</button>
      </div>
    `, onModalClickOutside);

    $("#intCreate").onclick = () => {
      const A = $("#intAppASelect").value;
      const B = $("#intAppBSelect").value;
      createIntegration(A, B);
      hideModal();
    };
  }

  function appSelector() {
    return `
      <select id="intApp${Math.random()}Select" class="intAppSelect">
        ${state.apps.map(app => `
          <option value="${app.id}">
            ${esc(app.name)}
          </option>`).join("")}
      </select>
    `;
  }

  // ==========================================
  // CREATE NEW INTEGRATION
  // ==========================================
  function createIntegration(aId, bId) {
    if (!aId || !bId || aId === bId) return alert("Invalid pairing");

    const [A, B] = aId < bId ? [aId, bId] : [bId, aId];

    const exists = state.integrations.some(int => int.appAId === A && int.appBId === B);
    if (exists) return alert("Already exists");

    state.integrations.push({
      uid: uid("int"),
      appAId: A,
      appBId: B,
      hasDirect: false,
      hasZapier: false,
      directNotes: "",
      zapierNotes: ""
    });

    persist();
    renderIntegrations();
  }

  // ==========================================
  // BUILD FILTER UI
  // ==========================================
  function buildIntegrationFilters() {
    const appSel = $("#integrationsFilterApp");
    const typeSel = $("#integrationsFilterType");

    if (!appSel || !typeSel) return;

    appSel.innerHTML = `
      <option value="">All Apps</option>
      ${state.apps.map(app => `<option value="${app.id}">${esc(app.name)}</option>`).join("")}
    `;

    typeSel.innerHTML = `
      <option value="">All Types</option>
      <option value="direct">Direct</option>
      <option value="zapier">Zapier</option>
      <option value="none">No Integration</option>
    `;

    appSel.onchange = renderIntegrations;
    typeSel.onchange = renderIntegrations;
  }

  // ==========================================
  // PUBLIC API
  // ==========================================
  return {
    renderIntegrations,
    buildIntegrationFilters
  };
})();
