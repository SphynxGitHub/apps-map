;(() => {
  if (!window.OL) {
    console.error("integrations.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { state, utils } = OL;
  const esc = (utils && utils.esc) ? utils.esc : (s => String(s ?? ""));

  // --------------------------------------------------
  // BASIC HELPERS
  // --------------------------------------------------
  function getApps() {
    return Array.isArray(state.apps) ? state.apps : [];
  }

  function getAppById(id) {
    return getApps().find(a => a.id === id) || null;
  }

  function byName(a, b) {
    return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
  }

  function getCapabilities() {
    // expected shape:
    // state.capabilities = [
    //   { id, canonical, type: "trigger"|"search"|"action", appId, integrationType: "direct"|"zapier"|"both", ... }
    // ]
    return Array.isArray(state.capabilities) ? state.capabilities : [];
  }

  // --------------------------------------------------
  // CAPABILITY FILTERING
  // --------------------------------------------------
  function capsForAppSide(appId, side) {
    const all = getCapabilities().filter(c => c.appId === appId);
    if (!all.length) return { triggers: [], searches: [], actions: [] };

    const triggers = [];
    const searches = [];
    const actions  = [];

    all.forEach(c => {
      const t = (c.type || "").toLowerCase();
      if (side === "A") {
        // A = source side: only triggers
        if (t === "trigger") triggers.push(c);
      } else {
        // B = target side: searches + actions
        if (t === "search") searches.push(c);
        if (t === "action") actions.push(c);
      }
    });

    // sort canonical name alpha for stability
    const sortByCanon = (x, y) =>
      (x.canonical || "").toLowerCase().localeCompare((y.canonical || "").toLowerCase());

    triggers.sort(sortByCanon);
    searches.sort(sortByCanon);
    actions.sort(sortByCanon);

    return { triggers, searches, actions };
  }

  function badgeClassForIntegrationType(t) {
    const v = (t || "").toLowerCase();
    if (v === "direct") return "cap-type-direct";
    if (v === "zapier") return "cap-type-zapier";
    if (v === "both") return "cap-type-both";
    return "cap-type-unknown";
  }

  function renderCapList(title, list) {
    if (!list || !list.length) return "";
    const rows = list.map(c => {
      const badgeClass = badgeClassForIntegrationType(c.integrationType);
      return `
        <div class="cap-row">
          <span class="cap-type-dot ${badgeClass}"></span>
          <span class="cap-name">${esc(c.canonical || c.id || "")}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="cap-group">
        <div class="cap-group-title">${esc(title)}</div>
        <div class="cap-group-body">
          ${rows}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------
  // MODAL RENDERING
  // --------------------------------------------------
  function buildAppSelectHtml(selectId, selectedId) {
    const apps = getApps().slice().sort(byName);
    const options = apps.map(app => {
      const sel = app.id === selectedId ? " selected" : "";
      return `<option value="${esc(app.id)}"${sel}>${esc(app.name || "(unnamed)")}</option>`;
    }).join("");

    return `<select id="${selectId}" class="int-modal-app-select">${options}</select>`;
  }

  function buildModalBodyHtml(appAId, appBId) {
    const appA = getAppById(appAId);
    const appB = getAppById(appBId);

    if (!appA || !appB) {
      return `<div class="empty-hint">One or both applications are missing.</div>`;
    }

    const capsA = capsForAppSide(appA.id, "A");
    const capsB = capsForAppSide(appB.id, "B");

    const sideALeft = [
      renderCapList("Triggers", capsA.triggers)
    ].join("");

    const sideBRight = [
      renderCapList("Searches", capsB.searches),
      renderCapList("Actions",  capsB.actions)
    ].join("");

    const sideAContent = sideALeft || `<div class="empty-hint">No triggers mapped yet for ${esc(appA.name)}.</div>`;
    const sideBContent = sideBRight || `<div class="empty-hint">No searches or actions mapped yet for ${esc(appB.name)}.</div>`;

    return `
      <div class="int-modal-body-inner">
        <div class="int-modal-column">
          <div class="int-modal-app-label">Source (A)</div>
          <div class="int-modal-app-name">${esc(appA.name || "")}</div>
          <div class="int-modal-capabilities">
            ${sideAContent}
          </div>
        </div>
        <div class="int-modal-column">
          <div class="int-modal-app-label">Target (B)</div>
          <div class="int-modal-app-name">${esc(appB.name || "")}</div>
          <div class="int-modal-capabilities">
            ${sideBContent}
          </div>
        </div>
      </div>
    `;
  }

  function buildModalHtml(appAId, appBId) {
    const appA = getAppById(appAId);
    const appB = getAppById(appBId);

    if (!appA || !appB) {
      return `
        <div class="modal">
          <div class="modal-head">
            <div class="modal-title-text">Integration details</div>
          </div>
          <div class="modal-body">
            <div class="empty-hint">One or both apps no longer exist.</div>
          </div>
        </div>
      `;
    }

    const selectA = buildAppSelectHtml("intModalAppA", appAId);
    const selectB = buildAppSelectHtml("intModalAppB", appBId);

    return `
      <div class="modal">
        <div class="modal-head int-modal-head">
          <div class="int-modal-app-selector">
            ${selectA}
          </div>
          <button type="button" class="int-modal-swap-btn" id="intModalSwap" title="Swap A/B">
            ⇄
          </button>
          <div class="int-modal-app-selector">
            ${selectB}
          </div>
        </div>
        <div class="modal-body" id="intModalBody">
          ${buildModalBodyHtml(appAId, appBId)}
        </div>
      </div>
    `;
  }

  function wireModalInteractions(initialAId, initialBId) {
    let currentA = initialAId;
    let currentB = initialBId;

    const bodyEl = document.getElementById("intModalBody");
    const selA  = document.getElementById("intModalAppA");
    const selB  = document.getElementById("intModalAppB");
    const swap  = document.getElementById("intModalSwap");

    if (!bodyEl || !selA || !selB || !swap) return;

    function rerenderBody() {
      bodyEl.innerHTML = buildModalBodyHtml(currentA, currentB);
    }

    selA.addEventListener("change", () => {
      currentA = selA.value;
      // prevent A and B from being identical; if they are, nudge B
      if (currentA === currentB) {
        const apps = getApps().slice().sort(byName);
        const alt = apps.find(a => a.id !== currentA);
        if (alt) {
          currentB = alt.id;
          selB.value = currentB;
        }
      }
      rerenderBody();
    });

    selB.addEventListener("change", () => {
      currentB = selB.value;
      if (currentB === currentA) {
        const apps = getApps().slice().sort(byName);
        const alt = apps.find(a => a.id !== currentB);
        if (alt) {
          currentA = alt.id;
          selA.value = currentA;
        }
      }
      rerenderBody();
    });

    swap.addEventListener("click", () => {
      const oldA = currentA;
      currentA = currentB;
      currentB = oldA;
      selA.value = currentA;
      selB.value = currentB;
      rerenderBody();
    });
  }

  // --------------------------------------------------
  // PUBLIC ENTRY POINT
  // --------------------------------------------------
  OL.openIntegrationModal = function openIntegrationModal(appAId, appBId) {
    const html = buildModalHtml(appAId, appBId);
    OL.openModal(html);
    wireModalInteractions(appAId, appBId);
  };

})();
