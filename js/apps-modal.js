;(() => {
  if (!window.OL) {
    console.error("apps-modal.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { uid, esc, debounce } = OL.utils;

  let modalLayer = null;
  let currentApp = null;

  function ensureModalLayer() {
    modalLayer = document.getElementById("modal-layer");
  }

  // ============================================================
  // PUBLIC: OPEN EXISTING APP
  // ============================================================
  OL.openAppModal = function (appId) {
    const app = OL.state.apps.find(a => a.id === appId);
    if (!app) return;
    showAppModal(app);
  };

  // ============================================================
  // PUBLIC: OPEN NEW APP
  // ============================================================
  OL.openAppModalNew = function () {
    const app = {
      id: uid(),
      name: "",
      notes: "",
      icon: null,
      functions: [],
      integrations: [],
      datapointMappings: []
    };
    OL.state.apps.push(app);
    OL.persist();
    showAppModal(app);
  };

  // ============================================================
  // RENDER MODAL
  // ============================================================
  function showAppModal(app) {
    ensureModalLayer();
    currentApp = app;

    modalLayer.innerHTML = "";
    modalLayer.style.display = "flex";

    const modal = document.createElement("div");
    modal.className = "modal-window";

    const body = document.createElement("div");
    body.className = "modal-body";
    body.id = "appModalBody";

    // ===== HEADER =====
    const header = document.createElement("div");
    header.className = "modal-header";

    const icon = document.createElement("div");
    icon.id = "modalAppIcon";
    icon.className = "app-icon-box large clickable";

    const nameDisplay = document.createElement("div");
    nameDisplay.id = "modalAppName";
    nameDisplay.className = "modal-title-text";
    nameDisplay.contentEditable = false;

    header.appendChild(icon);
    header.appendChild(nameDisplay);
    body.appendChild(header);

    // ===== NOTES =====
    body.appendChild(makeLabel("Notes"));
    body.appendChild(makeTextarea("modalAppNotes"));

    // ===== FUNCTIONS =====
    body.appendChild(makeLabel("Functions"));
    body.appendChild(makeWrap("modalAppFunctions"));
    body.appendChild(makeSmallBtn("modalAddFunction", "+ Add Function"));

    // ===== INTEGRATIONS =====
    body.appendChild(makeLabel("Integrations"));
    body.appendChild(makeWrap("modalAppIntegrations"));
    body.appendChild(makeSmallBtn("modalAddIntegration", "+ Add Integration"));

    // ===== DATAPOINTS =====
    body.appendChild(makeLabel("Datapoints"));
    body.appendChild(makeWrap("modalAppDatapoints"));
    body.appendChild(makeSmallBtn("modalAddDatapoint", "+ Add Datapoint"));

    modal.appendChild(body);
    modalLayer.appendChild(modal);

    modalLayer.onclick = (e) => {
      if (e.target === modalLayer) hideModal();
    };

    bindModalFields(app);
  }

  function makeLabel(text) {
    const lbl = document.createElement("label");
    lbl.className = "modal-section-label";
    lbl.textContent = text;
    return lbl;
  }

  function makeTextarea(id) {
    const e = document.createElement("textarea");
    e.id = id;
    e.className = "modal-textarea";
    return e;
  }

  function makeWrap(id) {
    const el = document.createElement("div");
    el.id = id;
    return el;
  }

  function makeSmallBtn(id, text) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.className = "btn small";
    btn.textContent = text;
    return btn;
  }

  function hideModal() {
    modalLayer.style.display = "none";
    modalLayer.innerHTML = "";
    currentApp = null;
    OL.closeIconPicker && OL.closeIconPicker();
  }

  // ============================================================
  // APPLY DATA INTO UI
  // ============================================================
  function bindModalFields(app) {
    app.functions = app.functions || [];
    app.integrations = app.integrations || [];
    app.datapointMappings = app.datapointMappings || [];

    bindIcon(app);
    bindName(app);
    bindNotes(app);
    bindFunctions(app);
    bindIntegrations(app);
    bindDatapoints(app);
  }

  // ============================================================
  // ICON
  // ============================================================
  function bindIcon(app) {
    const el = document.getElementById("modalAppIcon");
    if (!el) return;
    el.innerHTML = "";
    el.appendChild(OL.buildIconNode(app));
    el.onclick = (ev) => {
      ev.stopPropagation();
      OL.openIconPicker(el, app);
    };
  }

  // ============================================================
  // NAME (click-to-edit)
  // ============================================================
  function bindName(app) {
    const el = document.getElementById("modalAppName");
    if (!el) return;

    el.textContent = app.name || "(unnamed)";

    el.onclick = () => {
      el.contentEditable = true;
      el.classList.add("editing");
      el.focus();
      // move cursor to end
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };

    el.onblur = () => {
      el.contentEditable = false;
      el.classList.remove("editing");
      app.name = el.textContent.trim();
      OL.persist();
      OL.renderApps && OL.renderApps();
    };

    el.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    };
  }

  // ============================================================
  // NOTES
  // ============================================================
  function bindNotes(app) {
    const input = document.getElementById("modalAppNotes");
    if (!input) return;

    input.value = app.notes || "";
    input.oninput = debounce(() => {
      app.notes = input.value;
      OL.persist();
    }, 200);
  }

  // ============================================================
  // FUNCTIONS
  // ============================================================
  function bindFunctions(app) {
    const wrap = document.getElementById("modalAppFunctions");
    if (!wrap) return;
    wrap.innerHTML = "";

    app.functions.forEach(fn => {
      const pill = document.createElement("span");
      pill.className = "pill fn";
      pill.textContent = findFunctionName(fn.id);

      pill.onclick = () => {
        fn.status = nextFnState(fn.status);
        OL.persist();
        bindFunctions(app);
      };

      pill.oncontextmenu = (e) => {
        e.preventDefault();
        app.functions = app.functions.filter(f => f !== fn);
        OL.persist();
        bindFunctions(app);
      };

      wrap.appendChild(pill);
    });

    const addBtn = document.getElementById("modalAddFunction");
    if (!addBtn) return;

    addBtn.onclick = () => {
      const sel = document.createElement("select");
      sel.innerHTML =
        `<option value="">Select…</option>` +
        OL.state.functions
          .filter(f => !app.functions.find(a => a.id === f.id))
          .map(f => `<option value="${f.id}">${esc(f.name)}</option>`)
          .join("");

      sel.onchange = () => {
        if (!sel.value) return;
        app.functions.push({ id: sel.value, status: "available" });
        OL.persist();
        bindFunctions(app);
      };

      wrap.appendChild(sel);
    };
  }

  function nextFnState(s) {
    if (s === "primary") return "evaluating";
    if (s === "evaluating") return "available";
    return "primary";
  }

  function findFunctionName(id) {
    const f = OL.state.functions.find(x => x.id === id);
    return f ? f.name : "(unknown)";
  }

  // ============================================================
  // INTEGRATIONS (per app)
  // ============================================================
  function bindIntegrations(app) {
    const wrap = document.getElementById("modalAppIntegrations");
    if (!wrap) return;
    wrap.innerHTML = "";

    app.integrations.forEach(int => {
      const pill = document.createElement("span");
      pill.className = "pill int";

      const otherApp = OL.state.apps.find(a => a.id === int.appId);
      pill.textContent = otherApp ? otherApp.name : "(missing)";

      pill.style.border = `1px solid ${
        int.type === "zapier" ? "var(--accent)" :
        int.type === "direct" ? "var(--ok)" :
        "var(--muted)"
      }`;

      pill.onclick = () => {
        int.type = nextType(int.type);
        OL.persist();
        bindIntegrations(app);
      };

      pill.oncontextmenu = (e) => {
        e.preventDefault();
        app.integrations = app.integrations.filter(i => i !== int);
        OL.persist();
        bindIntegrations(app);
      };

      wrap.appendChild(pill);
    });

    const addBtn = document.getElementById("modalAddIntegration");
    if (!addBtn) return;

    addBtn.onclick = () => {
      const sel = document.createElement("select");
      sel.innerHTML =
        `<option value="">Select app…</option>` +
        OL.state.apps
          .filter(a => a.id !== app.id && !app.integrations.find(i => i.appId === a.id))
          .map(a => `<option value="${a.id}">${esc(a.name)}</option>`)
          .join("");

      sel.onchange = () => {
        if (!sel.value) return;
        app.integrations.push({ appId: sel.value, type: "zapier" });
        OL.persist();
        bindIntegrations(app);
      };

      wrap.appendChild(sel);
    };
  }

  function nextType(t) {
    if (t === "zapier") return "direct";
    if (t === "direct") return "both";
    return "zapier";
  }

  // ============================================================
  // DATAPOINTS
  // ============================================================
  function bindDatapoints(app) {
    const wrap = document.getElementById("modalAppDatapoints");
    if (!wrap) return;
    wrap.innerHTML = "";

    app.datapointMappings.forEach(dp => {
      const row = document.createElement("div");
      row.className = "row datapoint-row";

      row.appendChild(makeDataField("Master", dp, "master"));
      row.appendChild(makeDataField("Inbound", dp, "inbound"));
      row.appendChild(makeDataField("Outbound", dp, "outbound"));

      wrap.appendChild(row);
    });

    const addBtn = document.getElementById("modalAddDatapoint");
    if (!addBtn) return;

    addBtn.onclick = () => {
      app.datapointMappings.push({ master: "", inbound: "", outbound: "" });
      OL.persist();
      bindDatapoints(app);
    };
  }

  function makeDataField(label, dp, field) {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = label;
    inp.value = dp[field] || "";
    inp.oninput = debounce(() => {
      dp[field] = inp.value;
      OL.persist();
    }, 200);
    return inp;
  }

  // ============================================================
  // PUBLIC HOOK FOR ICON PICKER
  // ============================================================
  OL.refreshModals = function () {
    if (currentApp) {
      bindIcon(currentApp);
    }
  };

})();
