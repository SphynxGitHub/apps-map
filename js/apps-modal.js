;(() => {

  //
  // SAFETY CHECK
  //
  if (!window.OL) {
    console.error('OL core not found — load app-core.js first.');
    return;
  }

  //
  // MODAL ROOT (singleton)
  //
  let modalLayer = null;
  function ensureModalLayer() {
    if (!modalLayer) {
      modalLayer = document.createElement('div');
      modalLayer.id = 'modal-layer';
      modalLayer.style.position = 'fixed';
      modalLayer.style.inset = '0';
      modalLayer.style.display = 'none';
      modalLayer.style.zIndex = '999';
      modalLayer.style.background = 'rgba(0,0,0,.5)';
      modalLayer.style.backdropFilter = 'blur(4px)';

      document.body.appendChild(modalLayer);
    }
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
    });

    //
    // CLOSE ON ESC
    //
    window.addEventListener('keydown', escCloseModal);

    //
    // Hand off to STEP B part 2 for data binding
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
  // expose public API
  function renderModalAppData(app) {
  const { state, persist } = window.OL;

  //
  // ELEMENT REFS
  //
  const iconBox   = document.getElementById('modalAppIcon');
  const nameInput = document.getElementById('modalAppName');
  const notesInput = document.getElementById('modalAppNotes');
  const fnWrap    = document.getElementById('modalAppFunctions');
  const intWrap   = document.getElementById('modalAppIntegrations');
  const dataWrap  = document.getElementById('modalAppDatapoints');

  //
  // RENDER ICON
  //
  const { appIconHTML, openPicker } = window.OL.icons;

  // Render current icon
  iconBox.innerHTML = appIconHTML(app);
  
  // Click to open picker
  iconBox.onclick = (e) => {
    e.stopPropagation();
    openPicker(iconBox, {
      currentIcon: app.icon,
      onSelect(newIcon) {
        app.icon = newIcon;
        window.OL.persist && window.OL.persist();
        // re-render modal and grid to show updated icon
        renderModalAppData(app);
        window.OL.renderApps && window.OL.renderApps();
      },
      onClear() {
        app.icon = null;
        window.OL.persist && window.OL.persist();
        renderModalAppData(app);
        window.OL.renderApps && window.OL.renderApps();
      }
    });
  };

  //
  // NAME — with debounced save
  //
  nameInput.value = app.name || "";
  let nameDebounce = null;
  nameInput.oninput = () => {
    clearTimeout(nameDebounce);
    nameDebounce = setTimeout(() => {
      app.name = nameInput.value.trim();
      persist();
      window.OL.renderApps();  // update grid after save
    }, 400);
  };

  //
  // NOTES — with debounced save
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

    // Render existing function pills
    app.functions?.forEach(fn => {
      const pill = document.createElement('span');
      pill.className = "pill";
      pill.style.cursor = "pointer";
      pill.style.marginRight = "6px";
      pill.style.userSelect = "none";

      pill.textContent = window.OL.findFunctionName(fn.id);

      // state-based coloring
      switch(fn.status) {
        case "primary":     pill.style.background = "#18c38a"; pill.style.color="#041810"; break;
        case "evaluating":  pill.style.background = "#3d4c6b"; pill.style.color="#eaf1ff"; break;
        case "available":   pill.style.background = "#2b3141"; pill.style.color="#cdd6e6"; break;
      }

      // left click cycles state
      pill.onclick = (e) => {
        e.stopPropagation();
        cycleFunctionState(fn);
        persist();
        renderModalAppData(app);
        window.OL.renderApps();
      };

      // right click removes fn
      pill.oncontextmenu = (e) => {
        e.preventDefault();
        app.functions = app.functions.filter(f => f.id !== fn.id);
        persist();
        renderModalAppData(app);
        window.OL.renderApps();
      };

      fnWrap.appendChild(pill);
    });

    //
    // ADD FUNCTION BUTTON
    //
    document.getElementById('modalAddFunction').onclick = () => {
      openFunctionSelector(app);
    };
  }

  function cycleFunctionState(fn) {
    switch(fn.status) {
      case "available": fn.status = "primary"; break;
      case "primary": fn.status = "evaluating"; break;
      case "evaluating": fn.status = "available"; break;
    }
  }

  function openFunctionSelector(app) {
    const allFunctions = state.functions || [];
    const existing = app.functions.map(f => f.id);

    const options = allFunctions
      .filter(fn => !existing.includes(fn.id))
      .map(fn => `<option value="${fn.id}">${fn.name}</option>`)
      .join("");

    const sel = document.createElement('select');
    sel.innerHTML = `<option value="">Select a function…</option>` + options;

    sel.onchange = () => {
      if (!sel.value) return;
      app.functions.push({ id: sel.value, status: "available" });
      persist();
      renderModalAppData(app);
      window.OL.renderApps();
    };

    fnWrap.appendChild(sel);
  }

  //
  // INTEGRATIONS
  //
  renderIntegrations();

  function renderIntegrations() {
    intWrap.innerHTML = "";

    (app.integrations || []).forEach(int => {
      const pill = document.createElement('span');
      pill.className = "pill";
      pill.style.cursor = "pointer";
      pill.style.marginRight = "6px";

      const otherApp = state.apps.find(a => a.id === int.appId);
      pill.textContent = otherApp ? otherApp.name : "(missing)";

      // color code based on type
      pill.style.border = `1px solid ${
        int.type === "direct" ? "#18c38a" : 
        int.type === "zapier" ? "#d5a73b" :
        "#888"
      }`;

      // left click = toggle type
      pill.onclick = (e) => {
        e.stopPropagation();
        int.type = nextIntegrationType(int.type);
        persist();
        renderModalAppData(app);
      };

      // right click = remove
      pill.oncontextmenu = (e) => {
        e.preventDefault();
        app.integrations = app.integrations.filter(i => i !== int);
        persist();
        renderModalAppData(app);
      };

      intWrap.appendChild(pill);
    });

    document.getElementById('modalAddIntegration').onclick = () => {
      openIntegrationSelector(app);
    };
  }

  function nextIntegrationType(t) {
    if (t === "direct") return "zapier";
    if (t === "zapier") return "both";
    return "direct";
  }

  function openIntegrationSelector(app) {
    const sel = document.createElement('select');
    sel.innerHTML = `<option value="">Select app…</option>` + 
      state.apps
      .filter(a => a.id !== app.id)
      .map(a => `<option value="${a.id}">${a.name}</option>`)
      .join("");

    sel.onchange = () => {
      if (!sel.value) return;
      app.integrations = app.integrations || [];
      app.integrations.push({
        appId: sel.value,
        type: "direct"
      });
      persist();
      renderModalAppData(app);
    };

    intWrap.appendChild(sel);
  }

  //
  // DATAPOINTS
  //
  renderDatapoints();

  function renderDatapoints() {
    dataWrap.innerHTML = "";

    const dp = app.datapointMappings || [];
    dp.forEach(entry => {
      const row = document.createElement('div');
      row.className = "row";
      row.style.marginBottom = "4px";

      const sel = document.createElement('select');
      window.OL.state.datapoints.forEach(d => {
        const o = document.createElement('option');
        o.value = d.id;
        o.textContent = d.name;
        if (d.id === entry.master) o.selected = true;
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
      app.datapointMappings = app.datapointMappings || [];
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
// simple debounce
//
function debounce(fn, delay) {
  let t = null;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, delay);
  };
}

  //
  window.OL.openAppModal = openAppModal;
  window.OL.hideModal = hideModal;

})();
