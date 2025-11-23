;(() => {

  const core = window.OL;
  const { state, persist } = core;
  const { appIconHTML } = core.icons;
  const esc = core.utils.esc;

  // full app label
  function appLabelHTML(app) {
    return `
      <span class="appLabel">
        ${appIconHTML(app)}
        <span class="appLabelName">${esc(app.name || '')}</span>
      </span>
    `;
  }

  // full function label
  function fnLabelHTML(fn) {
    return `<span class="fnLabel">${esc(fn.name)}</span>`;
  }

  // =========================================================
  // RENDER FUNCTIONS VIEW
  // =========================================================

  function renderFunctions() {
    const container = document.getElementById("functionsContainer");
    if (!container) return;

    container.innerHTML = "";
    const list = document.createElement("div");
    list.className = "functionsGrid";

    state.functions.forEach(fn => {
      const card = document.createElement("div");
      card.className = "fnCard";
      card.dataset.id = fn.id;

      card.innerHTML = `
        <div class="fnTitle">${esc(fn.name)}</div>
        <div class="fnAppsList">
          ${renderFnApps(fn)}
        </div>
      `;

      card.onclick = () => core.openFunctionModal(fn.id);
      list.appendChild(card);
    });

    // + Add Function
    const addBtn = document.createElement("button");
    addBtn.className = "btn small";
    addBtn.textContent = "+ Add Function";
    addBtn.onclick = () => core.openFunctionModalNew();

    const wrap = document.createElement("div");
    wrap.className = "fnAddNew";
    wrap.appendChild(addBtn);

    container.appendChild(list);
    container.appendChild(wrap);
  }

  // =========================================================
  // RENDER APP PILLS INSIDE FUNCTION CARD
  // =========================================================

  function renderFnApps(fn) {
    if (!fn.apps || !fn.apps.length) return `<span class="muted">No apps linked</span>`;

    return fn.apps.map(a => {
      const app = state.apps.find(x => x.id === a.id);
      if (!app) return "";

      const color = (a.status === "primary")
        ? "var(--ok)"
        : (a.status === "evaluating")
        ? "var(--accent)"
        : "var(--text)";

      return `
        <span class="fnAppPill" style="color:${color}">
          ${appIconHTML(app)} ${esc(app.name)}
        </span>
      `;
    }).join("");
  }

  // =========================================================
  // FUNCTION MODAL OPEN
  // =========================================================

  function openFunctionModal(fnId) {
    const fn = state.functions.find(f => f.id === fnId);
    if (!fn) return;
    showFunctionModal(fn);
  }

  function openFunctionModalNew() {
    const newFn = {
      id: core.utils.uid("fn"),
      name: "",
      notes: "",
      apps: []
    };
    showFunctionModal(newFn);
  }

  // =========================================================
  // FUNCTION MODAL UI
  // =========================================================

  function showFunctionModal(fn) {
    core.ensureModalLayer();
    const modalEl = core.getModalRoot();

    modalEl.innerHTML = `
      <div class="functionModal">
        <div class="fnModalHeader">
          <input id="fnNameInput" type="text" placeholder="Function Name"
            value="${esc(fn.name)}"/>
        </div>

        <label>Notes</label>
        <textarea id="fnNotesInput">${esc(fn.notes || "")}</textarea>

        <br>

        <label>Apps associated with this function</label>
        <div id="fnModalApps">
          ${renderFnAppsInline(fn)}
        </div>
        <button id="fnAddApp" class="btn small" style="margin-top:6px;">+ Add App</button>
      </div>
    `;

    modalEl.style.display = 'flex';
    attachFunctionModalHandlers(fn);
  }

  function attachFunctionModalHandlers(fn) {
    const nameInput = document.getElementById('fnNameInput');
    const notesInput = document.getElementById('fnNotesInput');
    const appListWrap = document.getElementById('fnModalApps');

    // debounced save
    let nameTimer = null;
    nameInput.oninput = () => {
      clearTimeout(nameTimer);
      nameTimer = setTimeout(() => {
        fn.name = nameInput.value;
        persist();
        renderFunctions();
      }, 400);
    };

    let notesTimer = null;
    notesInput.oninput = () => {
      clearTimeout(notesTimer);
      notesTimer = setTimeout(() => {
        fn.notes = notesInput.value;
        persist();
      }, 400);
    };

    document.getElementById('fnAddApp').onclick = () => {
      openAppSelector(fn);
    };

    // click outside to close
    core.bindModalClose();
  }

  // =========================================================
  // RENDER APP PILLS INSIDE MODAL
  // =========================================================

  function renderFnAppsInline(fn) {
    if (!fn.apps || !fn.apps.length) return `<span class="muted">None</span>`;

    return fn.apps.map(rel => {
      const app = state.apps.find(a => a.id === rel.id);
      if (!app) return "";

      const color = (rel.status === "primary")
        ? "var(--ok)"
        : (rel.status === "evaluating")
        ? "var(--accent)"
        : "var(--text)";

      return `
        <span class="fnAppPill" style="cursor:pointer;color:${color};"
          data-id="${app.id}">
          ${appIconHTML(app)} ${esc(app.name)}
        </span>
      `;
    }).join("");
  }

  // =========================================================
  // ADD APP TO FUNCTION
  // =========================================================

  function openAppSelector(fn) {
    const sel = document.createElement("select");
    sel.innerHTML = `<option value="">Select app…</option>` +
      state.apps.map(app => {
        return `<option value="${app.id}">${esc(app.name)}</option>`;
      }).join("");

    sel.onchange = () => {
      if (!sel.value) return;
      fn.apps.push({
        id: sel.value,
        status: "available"
      });
      persist();
      showFunctionModal(fn);
    };

    document.getElementById('fnModalApps').appendChild(sel);
  }

  // =========================================================
  // PUBLIC API
  // =========================================================

  core.renderFunctions = renderFunctions;
  core.openFunctionModal = openFunctionModal;
  core.openFunctionModalNew = openFunctionModalNew;

})();
