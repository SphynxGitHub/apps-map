// ===================================================
// APPS UI MODULE
// ===================================================

const AppsUI = (() => {
  const { state, persist, uid, esc, $, $all, findById, FN_LEVEL_COLORS } = AppCore;

  // ============================
  // RENDER APPS VIEW
  // ============================
  function renderApps() {
    const view = state.appsViewMode || "details";
    const container = $("#appsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (view === "details") {
      renderAppsDetails(container);
    } else {
      renderAppsGrid(container);
    }
  }

  // ============================
  // DETAILS VIEW
  // ============================
  function renderAppsDetails(container) {
    container.innerHTML = `
      <div class="appsTable">
        ${state.apps.map(app => renderAppRow(app)).join("")}
      </div>
      <div class="appsAddNew">
        <button id="addNewApp">+ Add Application</button>
      </div>
    `;

    $("#addNewApp").onclick = () => openAppModalNew();
    $all(".appRow").forEach(el => {
      el.onclick = () => openAppModal(el.dataset.id);
    });
  }

  function renderAppRow(app) {
    const iconHTML = renderAppIcon(app.iconId, app.name);
    return `
      <div class="appRow" data-id="${app.id}">
        <div class="appRowIcon">${iconHTML}</div>
        <div class="appRowTitle">${esc(app.name)}</div>
        <div class="appRowNotes">${esc(app.notes || "")}</div>
      </div>
    `;
  }

  // ============================
  // GRID VIEW
  // ============================
  function renderAppsGrid(container) {
    container.innerHTML = `
      <div class="appsGrid">
        ${state.apps.map(app => renderAppCard(app)).join("")}
      </div>
      <div class="appsAddNew">
        <button id="addNewApp">+ Add Application</button>
      </div>
    `;

    $("#addNewApp").onclick = () => openAppModalNew();
    $all(".appCard").forEach(el => {
      el.onclick = () => openAppModal(el.dataset.id);
    });
  }

  function renderAppCard(app) {
    const iconHTML = renderAppIcon(app.iconId, app.name);

    return `
      <div class="appCard" data-id="${app.id}">
        ${iconHTML}
        <div class="appCardTitle">${esc(app.name)}</div>
      </div>
    `;
  }

  // ============================
  // ICON RENDERER (A + C rule)
  // ============================
  function renderAppIcon(iconId, name) {
    const icon = state.icons.find(i => i.id === iconId);
    if (!icon) return initialsBtn(name);

    if (icon.type === "emoji") {
      return `<span class="appIcon emoji">${icon.value}</span>`;
    }
    return `
      <img class="appIcon image"
        src="${icon.value}"
        alt="${esc(name)}"
      />
    `;
  }

  function initialsBtn(name) {
    if (!name) return `<div class="appIcon initials">?</div>`;
    const parts = name.trim().split(/\s+/);
    const initials = parts.length === 1
      ? parts[0][0]
      : parts[0][0] + parts[parts.length - 1][0];
    return `<div class="appIcon initials">${initials.toUpperCase()}</div>`;
  }

  // ============================
  // OPEN APP MODAL (edit)
  // ============================
  function openAppModal(appId) {
    const app = findById(state.apps, appId);
    if (!app) return;

    showModal(renderAppModalContent(app), onModalClickOutside);

    attachAppModalHandlers(app);
  }

  // ============================
  // ADD NEW APP
  // ============================
  function openAppModalNew() {
    const newApp = {
      id: uid("app"),
      name: "",
      notes: "",
      needsFilter: false,
      functions: [],
      iconId: "",
      datapointMappings: [],
      brandColor: null
    };
    showModal(renderAppModalContent(newApp), onModalClickOutside);
    attachAppModalHandlers(newApp, true);
  }

  // ============================
  // BUILD APP MODAL CONTENT
  // ============================
  function renderAppModalContent(app) {
    return `
      <div class="modalAppHeader">
        <div class="modalAppIcon" id="modalIconTarget">${renderAppIcon(app.iconId, app.name)}</div>
        <input class="modalAppName" id="appNameInput" value="${esc(app.name)}"/>
      </div>

      <div class="modalAppSection">
        <label>Notes</label>
        <textarea id="appNotesInput">${esc(app.notes || "")}</textarea>
      </div>

      <div class="modalAppSection">
        <label>Functions</label>
        <div id="appFunctionsList">
          ${renderAppFunctions(app)}
        </div>
      </div>

      <div class="modalAppSection">
        <label>Datapoints</label>
        <div id="appDatapointsList">
          ${renderAppDatapoints(app)}
        </div>
      </div>

      <div class="modalAppSection">
        <label>Integrations</label>
        <div id="appIntegrationsList">
          ${renderAppIntegrations(app)}
          <button id="addIntegrationToApp">+ Add Integration</button>
        </div>
      </div>
    `;
  }

  // ============================
  // ICON DROPDOWN (option D)
  // ============================
  function openIconPicker(targetEl, app) {
    const picker = document.createElement("div");
    picker.className = "iconPickerDropdown";

    picker.innerHTML = state.icons.map(icon => {
      return `
        <div class="iconSelectOption" data-id="${icon.id}">
          ${renderAppIcon(icon.id, app.name)} <span>${esc(icon.label || "")}</span>
        </div>
      `;
    }).join("") + `
        <div class="iconPickerDivider"></div>
        <div class="iconPickerAction" id="iconUpload">Upload Icon</div>
        <div class="iconPickerAction" id="iconFromURL">Import From URL</div>
        <div class="iconPickerAction" id="iconEmoji">Choose Emoji</div>
        <div class="iconPickerDivider"></div>
        <div class="iconPickerAction danger" id="iconRemove">Remove Icon</div>
    `;

    picker.style.position = "absolute";
    picker.style.top = targetEl.offsetTop + targetEl.offsetHeight + "px";
    picker.style.left = targetEl.offsetLeft + "px";

    targetEl.parentElement.appendChild(picker);

    // CLICK OPTIONS
    picker.onclick = (e) => {
      const id = e.target.closest(".iconSelectOption")?.dataset.id;
      if (id) {
        app.iconId = id;
        persist();
        replaceModalContent(app);
        return;
      }

      if (e.target.id === "iconRemove") {
        app.iconId = "";
        persist();
        replaceModalContent(app);
        return;
      }

      if (e.target.id === "iconUpload") handleIconUpload(app);
      if (e.target.id === "iconFromURL") handleIconFromURL(app);
      if (e.target.id === "iconEmoji") handleIconEmoji(app);
    };

    // CLICK OUTSIDE dropdown closes it
    document.addEventListener("click", (event) => {
      if (!picker.contains(event.target) && event.target !== targetEl) {
        picker.remove();
      }
    }, { once: true });
  }

  // ============================
  // ICON EVENT ATTACH
  // ============================
  function attachAppModalHandlers(app, isNew = false) {
    const nameInput = $("#appNameInput");
    const notesInput = $("#appNotesInput");
    const iconTarget = $("#modalIconTarget");

    iconTarget.onclick = (e) => {
      e.stopPropagation();
      openIconPicker(iconTarget, app);
    };

    nameInput.oninput = () => { app.name = nameInput.value; persist(); };
    notesInput.oninput = () => { app.notes = notesInput.value; persist(); };
  }

  // ============================
  // Replace modal content after update
  // ============================
  function replaceModalContent(app) {
    const container = $("#modalContent");
    if (!container) return;
    container.innerHTML = renderAppModalContent(app);
    attachAppModalHandlers(app);
  }

  // ============================
  // CLICK OUTSIDE MODAL
  // ============================
  function onModalClickOutside(target, modalEl) {
    if (target === modalEl) hideModal(); 
  }

  // ============================
  // EXPOSE API
  // ============================
  return {
    renderApps,
    openAppModal
  };
})();
