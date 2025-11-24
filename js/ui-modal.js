;(() => {
  //
  // SAFETY CHECK
  //
  if (!window.OL) {
    console.error('OL core not found — load app-core.js first.');
    return;
  }

  //
  // MODAL ROOT (reuse existing #modal-layer if present)
  //
  let modalLayer = null;
  function ensureModalLayer() {
    if (modalLayer) return;
    modalLayer = document.getElementById('modal-layer');
    if (!modalLayer) {
      modalLayer = document.createElement('div');
      modalLayer.id = 'modal-layer';
      document.body.appendChild(modalLayer);
    }
    modalLayer.style.position = 'fixed';
    modalLayer.style.inset = '0';
    modalLayer.style.display = 'none';
    modalLayer.style.zIndex = '999';
    modalLayer.style.background = 'rgba(0,0,0,.5)';
    modalLayer.style.backdropFilter = 'blur(4px)';
  }

  //
  // PUBLIC: open app modal
  //
  function openAppModal(appId) {
    const app = window.OL.state.apps.find(a => a.id === appId);
    if (!app) return;
    showModal(app);
  }

  //
  // BUILD THE MODAL CONTENT FIXED STRUCTURE
  //
  function showModal(app) {
    ensureModalLayer();
    modalLayer.innerHTML = '';  // clear old

    // Modal container
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '620px';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'hidden';
    modal.style.borderRadius = '14px';
    modal.style.background = 'var(--panel)';
    modal.style.border = '1px solid var(--line)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';

    // Create scrollable body container
    const body = document.createElement('div');
    body.id = 'appModalBody';
    body.style.padding = '16px';
    body.style.overflowY = 'auto';
    body.style.flex = '1';

    // Insert static sections structure
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div id="modalAppIcon" class="app-icon-box small" style="cursor:pointer;"></div>
        <input id="modalAppName" type="text"
          style="background:none;border:none;font-size:18px;font-weight:600;color:var(--text);outline:none;"
        />
      </div>

      <label>Notes</label>
      <textarea id="modalAppNotes" style="width:100%;min-height:60px;"></textarea>

      <br>

      <label>Functions</label>
      <div id="modalAppFunctions"></div>
      <button id="modalAddFunction" class="btn small" style="margin-top:6px;">+ Add Function</button>

      <br>

      <label>Integrations</label>
      <div id="modalAppIntegrations"></div>
      <button id="modalAddIntegration" class="btn small" style="margin-top:6px;">+ Add Integration</button>

      <br>

      <label>Datapoints</label>
      <div id="modalAppDatapoints"></div>
      <button id="modalAddDatapoint" class="btn small" style="margin-top:6px;">+ Add Datapoint</button>
    `;

    modal.appendChild(body);
    modalLayer.appendChild(modal);
    modalLayer.style.display = 'flex';

    //
    // CLOSE ON CLICK OUTSIDE
    //
    modalLayer.addEventListener('click', e => {
      if (e.target === modalLayer) hideModal();
    }, { once: true });

    //
    // CLOSE ON ESC
    //
    window.addEventListener('keydown', escCloseModal);

    //
    // Hand off for data binding
    //
    renderModalAppData(app);
  }

  function hideModal() {
    if (modalLayer) {
      modalLayer.style.display = 'none';
      modalLayer.innerHTML = '';
    }
    window.removeEventListener('keydown', escCloseModal);
  }

  function escCloseModal(e) {
    if (e.key === 'Escape') hideModal();
  }

  //
  // MAIN BINDING / RENDER LOGIC
  //
  function renderModalAppData(app) {
    const { state, persist } = window.OL;

    //
    // Ensure action categories exist (for integration actions)
    //
    if (!state.actionCategories || !Array.isArray(state.actionCategories)) {
      state.actionCategories = [
        { id: 'contacts',   name: 'Contacts',   color: '#2fdc69' },
        { id: 'activities', name: 'Activities', color: '#a675ff' },
        { id: 'pipelines',  name: 'Pipelines',  color: '#ffc53b' },
        { id: 'documents',  name: 'Documents',  color: '#6abfff' },
        { id: 'tasks',      name: 'Tasks',      color: '#ff77d4' },
        { id: 'other',      name: 'Other',      color: '#aaaaaa' }
      ];
      persist();
    }

    //
    // ELEMENT REFS
    //
    const iconBox    = document.getElementById('modalAppIcon');
    const nameInput  = document.getElementById('modalAppName');
    const notesInput = document.getElementById('modalAppNotes');
    const fnWrap     = document.getElementById('modalAppFunctions');
    const intWrap    = document.getElementById('modalAppIntegrations');
    const dataWrap   = document.getElementById('modalAppDatapoints');

    //
    // ICON
    //
    const { appIconHTML, openPicker } = window.OL.icons;
    iconBox.innerHTML = appIconHTML(app);
    iconBox.onclick = (e) => {
      e.stopPropagation();
      openPicker(iconBox, {
        currentIcon: app.icon,
        onSelect(newIcon) {
          app.icon = newIcon;
          persist();
          renderModalAppData(app);
          window.OL.renderApps && window.OL.renderApps();
        },
        onClear() {
          app.icon = null;
          persist();
          renderModalAppData(app);
          window.OL.renderApps && window.OL.renderApps();
        }
      });
    };

    //
    // NAME — debounced save
    //
    nameInput.value = app.name || "";
    let nameDebounce = null;
    nameInput.oninput = () => {
      clearTimeout(nameDebounce);
      nameDebounce = setTimeout(() => {
        app.name = nameInput.value.trim();
        persist();
        window.OL.renderApps && window.OL.renderApps();
      }, 400);
    };

    //
    // NOTES — debounced save
    //
    notesInput.value = app.notes || "";
    let notesDebounce = null;
    notesInput.oninput = () => {
      clearTimeout(notesDebounce);
      notesDebounce = setTimeout(() => {
        app.notes = notesInput.value;
        persist();
      }, 400);
    };

    //
    // FUNCTIONS SECTION
    //
    renderFunctions();

    function renderFunctions() {
      fnWrap.innerHTML = "";

      (app.functions || []).forEach(fn => {
        const pill = document.createElement('span');
        pill.className = "pill";
        pill.style.cursor = "pointer";
        pill.style.marginRight = "6px";
        pill.style.userSelect = "none";

        pill.textContent = window.OL.findFunctionName
          ? window.OL.findFunctionName(fn.id)
          : (fn.name || "(fn)");

        switch (fn.status) {
          case "primary":
            pill.style.background = "#18c38a";
            pill.style.color = "#041810";
            break;
          case "evaluating":
            pill.style.background = "#3d4c6b";
            pill.style.color = "#eaf1ff";
            break;
          case "available":
          default:
            pill.style.background = "#2b3141";
            pill.style.color = "#cdd6e6";
            break;
        }

        pill.onclick = (e) => {
          e.stopPropagation();
          cycleFunctionState(fn);
          persist();
          renderModalAppData(app);
          window.OL.renderApps && window.OL.renderApps();
        };

        pill.oncontextmenu = (e) => {
          e.preventDefault();
          app.functions = (app.functions || []).filter(f => f.id !== fn.id);
          persist();
          renderModalAppData(app);
          window.OL.renderApps && window.OL.renderApps();
        };

        fnWrap.appendChild(pill);
      });

      document.getElementById('modalAddFunction').onclick = () => {
        openFunctionSelector(app);
      };
    }

    function cycleFunctionState(fn) {
      switch (fn.status) {
        case "available":  fn.status = "primary"; break;
        case "primary":    fn.status = "evaluating"; break;
        case "evaluating": fn.status = "available"; break;
        default:           fn.status = "available";
      }
    }

    function openFunctionSelector(app) {
      const allFunctions = state.functions || [];
      const existing = (app.functions || []).map(f => f.id);

      const options = allFunctions
        .filter(fn => !existing.includes(fn.id))
        .map(fn => `<option value="${fn.id}">${fn.name}</option>`)
        .join("");

      const sel = document.createElement('select');
      sel.innerHTML = `<option value="">Select a function…</option>` + options;

      sel.onchange = () => {
        if (!sel.value) return;
        app.functions = app.functions || [];
        app.functions.push({ id: sel.value, status: "available" });
        persist();
        renderModalAppData(app);
        window.OL.renderApps && window.OL.renderApps();
      };

      fnWrap.appendChild(sel);
      sel.focus();
    }

    //
    // INTEGRATIONS SECTION
    //
    renderIntegrations();

    function normalizeIntegration(int) {
      if (!int.type) int.type = "zapier"; // default
      if (!Array.isArray(int.actions)) int.actions = [];
      int.actions.forEach(a => {
        if (!a.id) a.id = 'act_' + Math.random().toString(36).slice(2, 9);
        if (!a.category) a.category = 'other';
        if (!a.integration) a.integration = int.type || 'zapier';
      });
    }

    function getCategory(catId) {
      return (state.actionCategories || []).find(c => c.id === catId) ||
             { id: 'other', name: 'Other', color: '#aaaaaa' };
    }

    function collectActionSuggestions() {
      const labels = new Set();
      (state.apps || []).forEach(a => {
        (a.integrations || []).forEach(int => {
          (int.actions || []).forEach(act => {
            if (act.label) labels.add(act.label);
          });
        });
      });
      return Array.from(labels);
    }

    function renderIntegrations() {
      intWrap.innerHTML = "";

      const allApps = state.apps || [];
      app.integrations = app.integrations || [];

      const suggestions = collectActionSuggestions();
      let datalist = document.getElementById('actionSuggestions');
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'actionSuggestions';
        document.body.appendChild(datalist);
      }
      datalist.innerHTML = suggestions.map(s => `<option value="${s}"></option>`).join('');

      app.integrations.forEach(int => {
        normalizeIntegration(int);

        const otherApp = allApps.find(a => a.id === int.appId);
        const block = document.createElement('div');
        block.className = "integration-block card";
        block.style.marginBottom = "10px";

        const header = document.createElement('div');
        header.className = "row";
        header.style.marginBottom = "6px";

        const appLabel = document.createElement('div');
        appLabel.className = "pill";
        appLabel.style.display = "inline-flex";
        appLabel.style.alignItems = "center";
        appLabel.style.gap = "6px";

        appLabel.innerHTML = `
          <span class="app-icon-box small">
            ${appIconHTML(otherApp || { name: "Unknown" })}
          </span>
          <span>${otherApp ? otherApp.name : "(missing app)"}</span>
        `;

        const typePill = document.createElement('span');
        typePill.className = "pill";
        typePill.style.cursor = "pointer";
        typePill.style.marginLeft = "6px";
        setIntegrationTypePillStyle(typePill, int.type);

        typePill.textContent =
          int.type === "direct" ? "Direct" :
          int.type === "both"   ? "Both"   :
          "Zapier";

        typePill.onclick = (e) => {
          e.stopPropagation();
          int.type = nextIntegrationType(int.type);
          // default new actions to this type, but keep existing overrides
          int.actions.forEach(a => {
            if (!a.integration) a.integration = int.type;
          });
          persist();
          renderModalAppData(app);
        };

        const removeBtn = document.createElement('button');
        removeBtn.className = "btn small";
        removeBtn.textContent = "Remove";
        removeBtn.style.marginLeft = "auto";
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          app.integrations = app.integrations.filter(i => i !== int);
          persist();
          renderModalAppData(app);
        };

        header.appendChild(appLabel);
        header.appendChild(typePill);
        header.appendChild(removeBtn);
        block.appendChild(header);

        // Actions list
        const actionsContainer = document.createElement('div');
        actionsContainer.style.marginTop = "4px";

        int.actions.forEach(act => {
          const row = document.createElement('div');
          row.className = "row actionRow";
          row.style.marginBottom = "4px";

          const cat = getCategory(act.category);
          const catDot = document.createElement('span');
          catDot.className = "cat-dot";
          catDot.style.background = cat.color || '#aaa';

          const labelInput = document.createElement('input');
          labelInput.type = "text";
          labelInput.value = act.label || "";
          labelInput.setAttribute('list', 'actionSuggestions');
          labelInput.placeholder = "Action (e.g., create contact)";
          labelInput.style.flex = "2";

          labelInput.oninput = debounce(() => {
            act.label = labelInput.value.trim();
            persist();
          }, 300);

          const catSelect = document.createElement('select');
          catSelect.style.flex = "1";
          (state.actionCategories || []).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            if (c.id === act.category) opt.selected = true;
            catSelect.appendChild(opt);
          });
          catSelect.onchange = () => {
            act.category = catSelect.value;
            persist();
            renderModalAppData(app);
          };

          const typeSelect = document.createElement('select');
          typeSelect.style.flex = "1";
          ["zapier","direct","both"].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent =
              t === "direct" ? "Direct" :
              t === "both"   ? "Both"   :
              "Zapier";
            if (t === act.integration) opt.selected = true;
            typeSelect.appendChild(opt);
          });
          typeSelect.onchange = () => {
            act.integration = typeSelect.value;
            persist();
            renderModalAppData(app);
          };

          const delAction = document.createElement('button');
          delAction.className = "btn small";
          delAction.textContent = "✕";
          delAction.onclick = (e) => {
            e.stopPropagation();
            int.actions = int.actions.filter(a => a !== act);
            persist();
            renderModalAppData(app);
          };

          row.appendChild(catDot);
          row.appendChild(labelInput);
          row.appendChild(catSelect);
          row.appendChild(typeSelect);
          row.appendChild(delAction);

          // apply border style based on integration
          applyIntegrationBorder(row, act.integration);

          actionsContainer.appendChild(row);
        });

        const addActionBtn = document.createElement('button');
        addActionBtn.className = "btn small";
        addActionBtn.textContent = "+ Add Action";
        addActionBtn.style.marginTop = "4px";
        addActionBtn.onclick = (e) => {
          e.stopPropagation();
          int.actions.push({
            id: 'act_' + Math.random().toString(36).slice(2, 9),
            label: "",
            category: 'other',
            integration: int.type || 'zapier'
          });
          persist();
          renderModalAppData(app);
        };

        block.appendChild(actionsContainer);
        block.appendChild(addActionBtn);
        intWrap.appendChild(block);
      });

      document.getElementById('modalAddIntegration').onclick = () => {
        openIntegrationSelector(app);
      };
    }

    function setIntegrationTypePillStyle(el, type) {
      el.style.border = "1px solid #444";
      el.style.background = "#0e1523";
      if (type === "zapier") {
        el.style.borderColor = "#ff77d4";
        el.style.color = "#ffd9f3";
      } else if (type === "direct") {
        el.style.borderColor = "#16e5ff";
        el.style.color = "#c4f6ff";
      } else if (type === "both") {
        el.style.borderColor = "#a675ff";
        el.style.color = "#e6d7ff";
      }
    }

    function applyIntegrationBorder(el, type) {
      el.style.border = "1px solid transparent";
      if (type === "zapier") {
        el.style.borderColor = "#ff77d4";
      } else if (type === "direct") {
        el.style.borderColor = "#16e5ff";
      } else if (type === "both") {
        el.style.borderColor = "#a675ff";
      }
    }

    function nextIntegrationType(t) {
      if (t === "zapier") return "direct";
      if (t === "direct") return "both";
      return "zapier";
    }

    function openIntegrationSelector(app) {
      const allApps = state.apps || [];
      const sel = document.createElement('select');
      sel.innerHTML = `<option value="">Select app…</option>` +
        allApps
          .filter(a => a.id !== app.id)
          .map(a => `<option value="${a.id}">${a.name}</option>`)
          .join("");

      sel.onchange = () => {
        if (!sel.value) return;
        app.integrations = app.integrations || [];
        const newInt = {
          appId: sel.value,
          type: "zapier",
          actions: [
            // simple defaults; you can customize these later per app pair
            { id: 'act_' + Math.random().toString(36).slice(2, 9), label: "create record", category: "other", integration: "zapier" }
          ]
        };
        app.integrations.push(newInt);
        state.actionCategories = state.actionCategories || []; // ensure
        persist();
        renderModalAppData(app);
      };

      intWrap.appendChild(sel);
      sel.focus();
    }

    //
    // DATAPOINTS SECTION
    //
    renderDatapoints();

    function renderDatapoints() {
      dataWrap.innerHTML = "";

      const datapoints = window.OL.state.datapoints || [];
      app.datapointMappings = app.datapointMappings || [];

      app.datapointMappings.forEach(entry => {
        const row = document.createElement('div');
        row.className = "row";
        row.style.marginBottom = "4px";

        const sel = document.createElement('select');
        datapoints.forEach(dp => {
          const name = (typeof dp === "string") ? dp : (dp.name || "");
          const val  = (typeof dp === "string") ? dp : (dp.id || dp.name || "");
          const o = document.createElement('option');
          o.value = val;
          o.textContent = name;
          if (val === entry.master) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = () => {
          entry.master = sel.value;
          persist();
        };

        const inbound = document.createElement('input');
        inbound.type = "text";
        inbound.placeholder = "Inbound";
        inbound.value = entry.inbound || "";
        inbound.oninput = debounce(() => {
          entry.inbound = inbound.value;
          persist();
        }, 400);

        const outbound = document.createElement('input');
        outbound.type = "text";
        outbound.placeholder = "Outbound";
        outbound.value = entry.outbound || "";
        outbound.oninput = debounce(() => {
          entry.outbound = outbound.value;
          persist();
        }, 400);

        row.appendChild(sel);
        row.appendChild(inbound);
        row.appendChild(outbound);
        dataWrap.appendChild(row);
      });

      document.getElementById('modalAddDatapoint').onclick = () => {
        app.datapointMappings.push({
          master: "",
          inbound: "",
          outbound: ""
        });
        persist();
        renderModalAppData(app);
      };
    }
  }

  //
  // simple debounce helper
  //
  function debounce(fn, delay) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  //
  // expose public API
  //
  window.OL.openAppModal = openAppModal;
  window.OL.hideModal = hideModal;

})();
