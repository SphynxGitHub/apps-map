;(() => {

  if (!window.OL) {
    console.error("apps-modal.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { uid, esc, debounce } = OL.utils;

  let modalLayer = null;

  function ensureModalLayer() {
    modalLayer = document.getElementById("modal-layer");
    if (!modalLayer) {
      modalLayer = document.createElement("div");
      modalLayer.id = "modal-layer";
      modalLayer.className = "modalOverlay";
      modalLayer.style.display = "none";
      modalLayer.style.position = "fixed";
      modalLayer.style.inset = "0";
      modalLayer.style.zIndex = "999";
      modalLayer.style.background = "rgba(0,0,0,0.5)";
      modalLayer.style.backdropFilter = "blur(4px)";
      document.body.appendChild(modalLayer);
    }
  }

  // ============================================================
  // PUBLIC: OPEN EXISTING APP
  // ============================================================
  OL.openAppModal = function(appId) {
    const app = OL.state.apps.find(a => a.id === appId);
    if (!app) return;
    showAppModal(app);
  };

  // ============================================================
  // PUBLIC: OPEN NEW APP
  // ============================================================
  OL.openAppModalNew = function() {
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
  // RENDER MODAL (APP MODAL)
  // ============================================================
  function showAppModal(app) {
    ensureModalLayer();
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
    body.appendChild(makeDisplayBlock("modalAppNotesDisplay"));
    body.appendChild(makeSmallLink("modalAppNotesEdit", "Edit notes"));

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

    modalLayer.onclick = e => { 
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

  function makeWrap(id) {
    const el = document.createElement("div");
    el.id = id;
    el.className = "modal-section-wrap";
    return el;
  }

  function makeSmallBtn(id, text) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.className = "btn small";
    btn.textContent = text;
    return btn;
  }

  function makeSmallLink(id, text) {
    const a = document.createElement("button");
    a.id = id;
    a.type = "button";
    a.className = "text-link small";
    a.textContent = text;
    return a;
  }

  function makeDisplayBlock(id) {
    const div = document.createElement("div");
    div.id = id;
    div.className = "modal-notes-display";
    return div;
  }

  function hideModal() {
    if (!modalLayer) return;
    modalLayer.style.display = "none";
    modalLayer.innerHTML = "";
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
    
    // ──────────────────────────────
    // Insert visual break before Resources
    // ──────────────────────────────
    const sep = document.createElement("div");
    sep.className = "modal-section-separator";
    const body = document.getElementById("appModalBody");
    body.appendChild(sep);
    
    // ──────────────────────────────
    // Insert "Used in Resources"
    // ──────────────────────────────
    bindUsedInResources(app);
  }

  // ============================================================
  // ICON
  // ============================================================
  function buildIconNode(app) {
    const wrap = document.createElement("div");
    wrap.className = "app-icon-inner";

    // explicit emoji
    if (app.icon?.type === "emoji") {
      wrap.textContent = app.icon.value;
      return wrap;
    }

    // explicit image
    if (app.icon?.type === "img") {
      const img = document.createElement("img");
      img.src = app.icon.url;
      img.alt = "";
      wrap.appendChild(img);
      return wrap;
    }

    // auto letter
    const meta = OL.utils.buildLetterIconMeta(app.name);
    wrap.style.background = meta.bg;
    wrap.style.color = meta.fg;
    wrap.textContent = meta.initials;
    return wrap;
  }

  function bindIcon(app) {
    const el = document.getElementById("modalAppIcon");
    el.innerHTML = "";
    el.appendChild(buildIconNode(app));

    // expose a helper so icons.js can refresh just the icon
    OL.refreshCurrentAppModalIcon = function() {
      const n = document.getElementById("modalAppIcon");
      if (!n) return;
      n.innerHTML = "";
      n.appendChild(buildIconNode(app));
    };

    el.onclick = (evt) => {
      evt.stopPropagation();
      OL.openIconPicker = function(obj, type="app") {
        // icon picker logic
      };
    };
  }

  // ============================================================
  // NAME (click-to-edit)
  // ============================================================
  function bindName(app) {
    const el = document.getElementById("modalAppName");
    el.textContent = app.name || "(unnamed)";

    el.onclick = () => {
      el.contentEditable = true;
      el.classList.add("editing");
      el.focus();
      // place caret at end
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
      OL.renderApps?.();
    };

    el.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    };
  }

  // ============================================================
  // NOTES (click-to-edit via inline textarea)
  // ============================================================
  function bindNotes(app) {
    const display = document.getElementById("modalAppNotesDisplay");
    const editBtn  = document.getElementById("modalAppNotesEdit");

    function renderDisplay() {
      display.textContent = (app.notes || "").trim() || "Click Edit to add notes…";
      display.classList.toggle("muted", !app.notes);
    }

    renderDisplay();

    editBtn.onclick = () => {
      // swap display for textarea temporarily
      const parent = display.parentElement;
      const textarea = document.createElement("textarea");
      textarea.className = "modal-textarea";
      textarea.value = app.notes || "";
      parent.insertBefore(textarea, display);
      display.style.display = "none";
      editBtn.textContent = "Save notes";

      textarea.focus();

      editBtn.onclick = () => {
        app.notes = textarea.value;
        OL.persist();
        parent.removeChild(textarea);
        display.style.display = "";
        editBtn.textContent = "Edit notes";
        renderDisplay();
        // restore click handler
        bindNotes(app);
      };
    };
  }

  // ============================================================
  // FUNCTIONS
  // ============================================================
  function bindFunctions(app) {
    const wrap = document.getElementById("modalAppFunctions");
    wrap.innerHTML = "";
  
    // EXISTING PILLS BLOCK
    const pillsWrap = document.createElement("div");
    pillsWrap.className = "fn-pill-wrap";
    wrap.appendChild(pillsWrap);
  
    // Populate pills
    renderPills();
  
    // ADD FUNCTION button
    const addBtn = document.getElementById("modalAddFunction");
    addBtn.onclick = () => {
      addBtn.style.display = "none";
      showSelectorUI();
    };
  
    function renderPills() {
      pillsWrap.innerHTML = "";
  
      // Generate one pill per assigned fn
      app.functions.forEach(fn => {
        const meta = OL.state.functions.find(f => f.id === fn.id);
        const pill = document.createElement("span");
        pill.className = `pill fn status-${fn.status || "available"}`;
        pill.textContent = meta ? meta.name : "(unknown)";
  
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
  
        pillsWrap.appendChild(pill);
      });
    }
  
    function showSelectorUI() {
      // CREATE SELECTOR BOX
      const selBox = document.createElement("div");
      selBox.className = "modal-select-box";
      wrap.appendChild(selBox);
  
      // SEARCH INPUT
      const search = document.createElement("input");
      search.type = "text";
      search.className = "modal-search";
      search.placeholder = "Search functions…";
      selBox.appendChild(search);
  
      // CHECKBOX LIST
      const list = document.createElement("div");
      list.className = "modal-checklist";
      selBox.appendChild(list);
  
      // DONE BUTTON
      const done = document.createElement("button");
      done.className = "btn small";
      done.textContent = "Done";
      done.style.marginTop = "6px";
      selBox.appendChild(done);
  
      done.onclick = () => {
        wrap.removeChild(selBox);
        addBtn.style.display = "";
        renderPills();
      };
  
      search.oninput = () => renderOptions();
      renderOptions();
  
      function renderOptions() {
        const term = search.value.toLowerCase();
        list.innerHTML = "";
  
        OL.state.functions
          .filter(fn => fn.name.toLowerCase().includes(term))
          .forEach(fn => {
            const assigned = app.functions.some(f => f.id === fn.id);
  
            const row = document.createElement("label");
            row.className = "modal-checkrow";
  
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = assigned;
  
            cb.onchange = () => {
              if (cb.checked) {
                addFunctionAssignment(fn.id);
              } else {
                removeFunctionAssignment(fn.id);
              }
              OL.persist();
              renderPills();
            };
  
            const name = document.createElement("span");
            name.textContent = fn.name;
  
            row.appendChild(cb);
            row.appendChild(name);
            list.appendChild(row);
          });
      }
  
      function addFunctionAssignment(fnId) {
        const existingAssignments = OL.state.apps
          .flatMap(a => (a.functions || []).map(f => ({ appId: a.id, fnId: f.id })))
          .filter(x => x.fnId === fnId);
  
        const status = existingAssignments.length === 0
          ? "primary"
          : "available";
  
        app.functions.push({ id: fnId, status });
      }
  
      function removeFunctionAssignment(fnId) {
        app.functions = app.functions.filter(f => f.id !== fnId);
      }
    }
  }

  function nextFnState(s) {
    if (s === "primary") return "evaluating";
    if (s === "evaluating") return "available";
    return "primary";
  }

  // ============================================================
  // INTEGRATIONS
  // ============================================================
  function bindIntegrations(app) {
    const wrap = document.getElementById("modalAppIntegrations");
    wrap.innerHTML = "";

    app.integrations.forEach(int => {
      const pill = document.createElement("span");
      pill.className = "pill int";

      const otherApp = OL.state.apps.find(a => a.id === int.appId);
      pill.textContent = otherApp ? otherApp.name : "(missing)";
      pill.dataset.type = int.type || "zapier";

      pill.onclick = () => {
        int.type = nextType(int.type);
        OL.persist();
        bindIntegrations(app);
        OL.renderApps?.();
      };

      pill.oncontextmenu = (e) => {
        e.preventDefault();
        app.integrations = app.integrations.filter(i => i !== int);
        OL.persist();
        bindIntegrations(app);
        OL.renderApps?.();
      };

      wrap.appendChild(pill);
    });

    const addBtn = document.getElementById("modalAddIntegration");
    addBtn.onclick = () => {
      const sel = document.createElement("select");
      sel.className = "pill-select";
      sel.innerHTML =
        `<option value="">Select app…</option>` +
        OL.state.apps
          .filter(a => a.id !== app.id && !app.integrations.find(i => i.appId === a.id))
          .map(a => `<option value="${a.id}">${esc(a.name)}</option>`)
          .join("");

      sel.onchange = () => {
        if (!sel.value) return;
        app.integrations.push({ appId: sel.value, type: "zapier" }); // default Zapier
        OL.persist();
        bindIntegrations(app);
        OL.renderApps?.();
      };

      wrap.appendChild(sel);
      sel.focus();
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
  // SHARED GENERIC MODAL (FOR INTEGRATIONS CAPABILITIES, ETC.)
  // ============================================================
  if (!OL.openModal) {
    let activeCloseHandler = null;

    function escClose(e) {
      if (e.key === "Escape") {
        hideModal();
        if (activeCloseHandler) activeCloseHandler();
        activeCloseHandler = null;
        window.removeEventListener("keydown", escClose);
      }
    }

    OL.openModal = function({ width = "620px", contentHTML = "", onClose = null } = {}) {
      ensureModalLayer();
      modalLayer.innerHTML = "";
      modalLayer.style.display = "flex";

      activeCloseHandler = onClose || null;

      const modal = document.createElement("div");
      modal.className = "modalBox";
      modal.style.position = "absolute";
      modal.style.top = "50%";
      modal.style.left = "50%";
      modal.style.transform = "translate(-50%, -50%)";
      modal.style.width = width;
      modal.style.maxHeight = "80vh";
      modal.style.background = "var(--panel)";
      modal.style.border = "1px solid var(--line)";
      modal.style.borderRadius = "14px";
      modal.style.display = "flex";
      modal.style.flexDirection = "column";
      modal.style.overflow = "hidden";

      const body = document.createElement("div");
      body.className = "modalContent";
      body.style.padding = "16px";
      body.style.overflowY = "auto";
      body.style.flex = "1";
      body.innerHTML = contentHTML;

      modal.appendChild(body);
      modalLayer.appendChild(modal);

      modalLayer.onclick = (e) => {
        if (e.target === modalLayer) {
          hideModal();
          if (activeCloseHandler) activeCloseHandler();
          activeCloseHandler = null;
          window.removeEventListener("keydown", escClose);
        }
      };

      window.addEventListener("keydown", escClose);

      return modal;
    };

    OL.closeModal = function() {
      hideModal();
      if (activeCloseHandler) activeCloseHandler();
      activeCloseHandler = null;
      window.removeEventListener("keydown", escClose);
    };
  }
  // ============================================================
  // USED IN RESOURCES
  // ============================================================
  function bindUsedInResources(app) {
    const body = document.getElementById("appModalBody");
  
    // insert Section label
    const label = document.createElement("label");
    label.className = "modal-section-label";
    label.textContent = "Used in Resources";
    body.appendChild(label);
  
    const wrap = document.createElement("div");
    wrap.id = "modalAppResources";
    wrap.className = "modal-section-wrap";
    body.appendChild(wrap);
  
    const refs = getResourceReferencesForApp(app.id);
  
    if (!refs.length) {
      wrap.innerHTML = `<div class="empty-hint">No resource references.</div>`;
      return;
    }
  
    refs.forEach(r => {
      const btn = document.createElement("button");
      btn.className = "pill resource";
      btn.textContent = r.name;
      btn.onclick = () => {
        if (typeof OL.openResourceModal === "function") {
          OL.openResourceModal(r.id);
        }
      };
      wrap.appendChild(btn);
    });
  }
  
  // Pull all resources that reference this app
  function getResourceReferencesForApp(appId) {
    const out = [];
    (OL.state.resources || []).forEach(res => {
      if (!res.references) return;
  
      if (res.references.apps && res.references.apps.includes(appId)) {
        out.push(res);
        return;
      }
  
      if (res.references.functions) {
        for (const fnId of res.references.functions) {
          if ((OL.state.apps || []).some(a =>
            a.id === appId &&
            (a.functions || []).some(f => f.id === fnId)
          )) {
            out.push(res);
            return;
          }
        }
      }
    });
  
    return out;
  }

})();
