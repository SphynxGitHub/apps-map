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

  function renderCapabilitiesList(capabilities) {
    const wrap = document.createElement("div");
  
    // Group by canonical type
    const byType = {
      trigger: [],
      search: [],
      action: []
    };
  
    capabilities.forEach(c => {
      const type = (c.type || "").toLowerCase();
      if (byType[type]) byType[type].push(c);
    });
  
    // Render in order: Triggers → Searches → Actions
    renderCapBlock("Triggers", byType.trigger, wrap);
    renderCapBlock("Searches", byType.search, wrap);
    renderCapBlock("Actions", byType.action, wrap);
  
    return wrap;
  }
  
  function renderCapBlock(label, list, wrap) {
    if (!list || !list.length) return;
  
    const header = document.createElement("div");
    header.className = "cap-block-header";
    header.textContent = label;
    wrap.appendChild(header);
  
    list.forEach(c => {
      const row = document.createElement("div");
      row.className = "cap-row";
  
      row.innerHTML = `
        <div class="cap-type-dot ${badgeClassForIntegrationType(c.integrationType)}"></div>
        <div class="cap-name">${esc(c.canonicalName)}</div>
      `;
  
      wrap.appendChild(row);
    });
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

  // ============================================================
  // INTEGRATIONS CAPABILITIES MODAL
  // ============================================================
  OL.openIntegrationModal = function openIntegrationModal(appIdA, appIdB) {
    const apps = OL.state.apps || [];
    const caps = OL.state.capabilities || []; // canonical library
  
    if (!apps.length) return;
  
    // Resolve A/B apps
    let appA = apps.find(a => a.id === appIdA) || null;
    let appB = apps.find(a => a.id === appIdB) || null;
  
    if (!appA && apps.length) appA = apps[0];
    if (!appB && apps.length) appB = apps.find(a => a.id !== appA.id) || appA;
  
    if (!appA || !appB) return;
  
    // ---------- Capability helpers ----------
  
    function getAppCaps(appId, type) {
      // capability shape:
      // {
      //   id, canonical, type: 'trigger' | 'search' | 'action',
      //   apps: [
      //     { appId, via: 'direct'|'zapier'|'both', label, apiName, notes }
      //   ]
      // }
      return caps
        .filter(cap => cap.type === type)
        .map(cap => {
          const appInfo = (cap.apps || []).find(a => a.appId === appId);
          if (!appInfo) return null;
          return {
            canonical: cap.canonical || cap.id || "",
            type: cap.type,
            via: appInfo.via || appInfo.type || "unknown",
            appLabel: appInfo.label || "",
            apiName: appInfo.apiName || appInfo.api || "",
            notes: appInfo.notes || ""
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.canonical.localeCompare(b.canonical));
    }
  
    const triggersA = getAppCaps(appA.id, "trigger");
    const searchesB = getAppCaps(appB.id, "search");
    const actionsB  = getAppCaps(appB.id, "action");
  
    function renderCapList(list, emptyLabel) {
      if (!list.length) {
        return `<div class="capability-empty">${emptyLabel}</div>`;
      }
      return `
        <div class="capability-list">
          ${list.map(item => {
            let dotClass = "cap-dot-unknown";
            if (item.via === "direct") dotClass = "cap-dot-direct";
            else if (item.via === "zapier") dotClass = "cap-dot-zapier";
            else if (item.via === "both") dotClass = "cap-dot-both";
  
            return `
              <div class="capability-row" title="${OL.utils.esc(item.notes || '')}">
                <div class="capability-name">
                  <span class="cap-dot ${dotClass}"></span>
                  <span>${OL.utils.esc(item.canonical)}</span>
                </div>
                <div class="capability-meta">
                  ${item.appLabel ? `<span>${OL.utils.esc(item.appLabel)}</span>` : ""}
                  ${item.apiName ? `<span>${OL.utils.esc(item.apiName)}</span>` : ""}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }
  
    const hasLibrary = caps && caps.length;
  
    const modalHtml = `
      <div class="modal">
        <div class="modal-head">
          <div class="int-modal-header-row">
            <div class="int-modal-app-select">
              <label>A:</label>
              <select id="intModalAppA">
                ${apps
                  .slice()
                  .sort((x, y) => (x.name || "").localeCompare(y.name || ""))
                  .map(a => `
                    <option value="${a.id}" ${a.id === appA.id ? "selected" : ""}>
                      ${OL.utils.esc(a.name || "")}
                    </option>
                  `).join("")}
              </select>
            </div>
  
            <button class="int-modal-swap" id="intModalSwap" type="button" title="Swap A & B">
              <span>&#8646;</span>
            </button>
  
            <div class="int-modal-app-select">
              <label>B:</label>
              <select id="intModalAppB">
                ${apps
                  .slice()
                  .sort((x, y) => (x.name || "").localeCompare(y.name || ""))
                  .map(b => `
                    <option value="${b.id}" ${b.id === appB.id ? "selected" : ""}>
                      ${OL.utils.esc(b.name || "")}
                    </option>
                  `).join("")}
              </select>
            </div>
          </div>
        </div>
  
        <div class="modal-body">
          <div class="int-modal-legend">
            <span class="int-modal-legend-label">Integration type:</span>
            <span><span class="cap-dot cap-dot-direct"></span>Direct</span>
            <span><span class="cap-dot cap-dot-zapier"></span>Zapier</span>
            <span><span class="cap-dot cap-dot-both"></span>Both</span>
            <span><span class="cap-dot cap-dot-unknown"></span>Unknown</span>
          </div>
  
          ${!hasLibrary ? `
            <div class="empty-hint">
              No capabilities library loaded yet. Add canonical triggers/searches/actions
              to <code>state.capabilities</code> to populate this view.
            </div>
          ` : `
            <div class="int-modal-split-label">
              Showing <strong>${OL.utils.esc(appA.name || "")}</strong> triggers
              → <strong>${OL.utils.esc(appB.name || "")}</strong> searches & actions
            </div>
  
            <div class="capability-groups">
              <div class="capability-group">
                <div class="capability-group-title">
                  A: ${OL.utils.esc(appA.name || "")} · Triggers
                </div>
                ${renderCapList(triggersA, "No triggers found for this app.")}
              </div>
  
              <div class="capability-group">
                <div class="capability-group-title">
                  B: ${OL.utils.esc(appB.name || "")} · Searches
                </div>
                ${renderCapList(searchesB, "No search capabilities found for this app.")}
              </div>
  
              <div class="capability-group">
                <div class="capability-group-title">
                  B: ${OL.utils.esc(appB.name || "")} · Actions
                </div>
                ${renderCapList(actionsB, "No actions found for this app.")}
              </div>
            </div>
          `}
        </div>
      </div>
    `;
  
    OL.openModal({
      contentHTML: modalHtml
    });

    // Wire behaviour inside modal
    const layer = document.getElementById("modal-layer");
    if (!layer) return;
    const modal = layer.querySelector(".modal");
    if (!modal) return;
  
    const selA = modal.querySelector("#intModalAppA");
    const selB = modal.querySelector("#intModalAppB");
    const swap = modal.querySelector("#intModalSwap");
  
    if (selA) {
      selA.addEventListener("change", () => {
        const newA = selA.value;
        const newB = selB && selB.value ? selB.value : appB.id;
        OL.openIntegrationModal(newA, newB);
      });
      selA.addEventListener("click", evt => evt.stopPropagation());
    }
    if (selB) {
      selB.addEventListener("change", () => {
        const newA = selA && selA.value ? selA.value : appA.id;
        const newB = selB.value;
        OL.openIntegrationModal(newA, newB);
      });
      selB.addEventListener("click", evt => evt.stopPropagation());
    }
    if (swap) {
      swap.addEventListener("click", () => {
        OL.openIntegrationModal(appB.id, appA.id);
      });
      swap.addEventListener("click", evt => evt.stopPropagation());
    }
  };

})();
