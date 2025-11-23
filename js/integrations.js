;(() => {

  const core = window.OL;
  const { state, persist } = core;
  const esc = core.utils.esc;
  const { appIconHTML } = core.icons;

  // -------------------------------------------------
  // Integration type cycle + colors
  // -------------------------------------------------
  const TYPE_ORDER = ["zapier", "direct", "both"];

  const TYPE_BORDER_COLORS = {
    zapier: "#ff77d4", // pink
    direct: "#16e5ff", // cyan
    both:   "#a675ff"  // purple
  };

  function nextType(current) {
    const idx = TYPE_ORDER.indexOf(current || "zapier");
    const nextIdx = (idx + 1) % TYPE_ORDER.length;
    return TYPE_ORDER[nextIdx];
  }

  function ensureIntegrationsArray(app) {
    if (!Array.isArray(app.integrations)) app.integrations = [];
    return app.integrations;
  }

  // -------------------------------------------------
  // RENDER: Integrations section inside App modal
  // -------------------------------------------------
  function renderIntegrationsInsideModal(app) {
    const integrations = ensureIntegrationsArray(app);
    const allApps = state.apps || [];

    // Build pills for each existing integration
    const pills = integrations
      .map(int => {
        const other = allApps.find(a => a.id === int.targetAppId);
        if (!other) return "";
        const type = int.type || "zapier";
        const border = TYPE_BORDER_COLORS[type] || "#4b5563";

        return `
          <span class="int-pill"
                data-int="${other.id}"
                data-type="${type}"
                style="border-color:${border}">
            ${appIconHTML(other)}
            <span class="int-pill-name">${esc(other.name || "")}</span>
            <span class="int-pill-remove" data-remove="${other.id}">×</span>
          </span>
        `;
      })
      .join("");

    return `
      <div class="int-pill-wrap">
        ${pills || `<span class="muted" style="font-size:12px;">No integrations yet.</span>`}
      </div>
      <div style="margin-top:8px;">
        <button class="btn small" id="addIntegrationBtn">+ Add Integration</button>
      </div>
    `;
  }

  // -------------------------------------------------
  // EVENTS: Integrations inside App modal
  // -------------------------------------------------
  function attachIntegrationModalHandlers(app) {
    const integrations = ensureIntegrationsArray(app);

    // Click pill body → cycle type
    document.querySelectorAll(".int-pill").forEach(pill => {
      pill.addEventListener("click", e => {
        // ignore clicks on the remove icon
        if (e.target.closest(".int-pill-remove")) return;

        const targetId = pill.getAttribute("data-int");
        const rec = integrations.find(x => x.targetAppId === targetId);
        if (!rec) return;

        rec.type = nextType(rec.type || "zapier");
        persist();
        core.replaceAppModalContent(app);
      });
    });

    // Remove pill
    document.querySelectorAll(".int-pill-remove").forEach(el => {
      el.addEventListener("click", e => {
        e.stopPropagation();
        const targetId = el.getAttribute("data-remove");
        const idx = integrations.findIndex(x => x.targetAppId === targetId);
        if (idx >= 0) {
          integrations.splice(idx, 1);
          persist();
          core.replaceAppModalContent(app);
        }
      });
    });

    // Add new integration
    const addBtn = document.getElementById("addIntegrationBtn");
    if (addBtn) {
      addBtn.onclick = () => showIntegrationPicker(app);
    }
  }

  // -------------------------------------------------
  // PICKER: Add Integration (dropdown / small modal)
  // -------------------------------------------------
  function showIntegrationPicker(app) {
    const allApps = (state.apps || []).filter(a => a.id !== app.id);
    const integrations = ensureIntegrationsArray(app);

    core.showModal(`
      <div class="int-picker">
        <h3 style="margin:0 0 6px;">Add Integration</h3>
        <input type="text"
               id="intSearchInput"
               placeholder="Search apps to integrate with..."
               class="int-search-input"/>

        <div id="intPickerResults" class="int-picker-list"></div>

        <div class="row" style="margin-top:10px;">
          <button class="btn small ghost" id="cancelIntPick">Cancel</button>
        </div>
      </div>
    `);

    function renderResults() {
      const listEl = document.getElementById("intPickerResults");
      const q = (document.getElementById("intSearchInput").value || "").toLowerCase();

      const alreadyIds = new Set(integrations.map(i => i.targetAppId));

      const matches = allApps.filter(a => {
        if (alreadyIds.has(a.id)) return false;
        if (!q) return true;
        return (a.name || "").toLowerCase().includes(q);
      });

      if (!matches.length) {
        listEl.innerHTML = `<div class="muted" style="font-size:12px;">No matching apps.</div>`;
        return;
      }

      listEl.innerHTML = matches
        .map(a => `
          <div class="int-option" data-app="${a.id}">
            ${appIconHTML(a)}
            <span class="int-option-name">${esc(a.name || "")}</span>
          </div>
        `)
        .join("");

      // click to select integration
      listEl.querySelectorAll(".int-option").forEach(opt => {
        opt.onclick = () => {
          const targetId = opt.getAttribute("data-app");
          if (!targetId) return;

          // default new integration → zapier
          integrations.push({
            targetAppId: targetId,
            type: "zapier"
          });

          persist();
          core.hideModal();
          core.replaceAppModalContent(app);
        };
      });
    }

    const searchInput = document.getElementById("intSearchInput");
    const cancelBtn   = document.getElementById("cancelIntPick");

    if (searchInput) {
      searchInput.oninput = renderResults;
      searchInput.focus();
    }
    if (cancelBtn) {
      cancelBtn.onclick = () => core.hideModal();
    }

    renderResults();
  }

  // -------------------------------------------------
  // PUBLIC API
  // -------------------------------------------------
  core.renderIntegrationsInsideModal = renderIntegrationsInsideModal;
  core.attachIntegrationModalHandlers = attachIntegrationModalHandlers;
  core.showIntegrationPicker = showIntegrationPicker;

})();
