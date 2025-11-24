;(() => {
  if (!window.OL) {
    console.error("icons.js: OL core not loaded");
    return;
  }

  const OL = window.OL;

  // ============================================================
  // APP ICON HTML (for cards / tables)
  // ============================================================
  OL.appIconHTML = function(app) {
    const meta = OL.utils.buildLetterIconMeta(app.name || "");

    // Emoji override
    if (app.icon && app.icon.type === "emoji") {
      return `
        <div class="app-icon-box small">
          <span>${app.icon.value}</span>
        </div>
      `;
    }

    // Uploaded image override
    if (app.icon && app.icon.type === "img") {
      return `
        <div class="app-icon-box small">
          <img src="${app.icon.url}" alt="${OL.utils.esc(app.name || "")}">
        </div>
      `;
    }

    // Default letter icon
    return `
      <div class="app-icon-box small" style="background:${meta.bg};color:${meta.fg}">
        ${meta.initials}
      </div>
    `;
  };

  // Build a DOM node version (for inside modal)
  OL.buildIconNode = function(app) {
    const node = document.createElement("div");
    node.className = "app-icon-box small";

    // Emoji
    if (app.icon && app.icon.type === "emoji") {
      node.textContent = app.icon.value;
      return node;
    }

    // Image
    if (app.icon && app.icon.type === "img") {
      const img = document.createElement("img");
      img.src = app.icon.url;
      img.alt = app.name || "";
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      node.appendChild(img);
      return node;
    }

    // Auto letters
    const meta = OL.utils.buildLetterIconMeta(app.name || "");
    node.style.background = meta.bg;
    node.style.color = meta.fg;
    node.textContent = meta.initials;
    return node;
  };

  // ============================================================
  // ICON PICKER UI
  // ============================================================
  OL.openIconPicker = function(targetEl, app) {
    OL.closeIconPicker();

    const picker = document.createElement("div");
    picker.className = "icon-picker";

    const modalBody = document.querySelector(".modal-body");
    if (!modalBody) return;

    const iconRect = targetEl.getBoundingClientRect();
    const bodyRect = modalBody.getBoundingClientRect();

    picker.style.position = "absolute";
    picker.style.left = (iconRect.left - bodyRect.left) + "px";
    picker.style.top  = (iconRect.bottom - bodyRect.top + 8) + "px";

    picker.innerHTML = `
      <div class="picker-section">
        <div class="picker-title">Emoji</div>
        <div class="picker-row">
          ${["📅","📇","📤","📩","⚙️","🔐","🧮","📊","🗄","🧾","🧩","💼","🕒","☎️","📎"]
            .map(e => `<span class="picker-option emoji">${e}</span>`).join("")}
        </div>
      </div>

      <div class="picker-section">
        <div class="picker-title">Auto-Letter</div>
        <button id="autoIconReset" class="btn small">Reset</button>
      </div>

      <div class="picker-section">
        <div class="picker-title">Upload Image</div>
        <input type="file" accept="image/*" id="uploadIconInput">
      </div>

      <div class="picker-section">
        <div class="picker-title">From URL</div>
        <button id="iconFromUrl" class="btn small">Set Icon URL</button>
      </div>

      <div class="picker-section">
        <button id="removeIconBtn" class="btn small warn">Remove Icon</button>
      </div>
    `;

    modalBody.appendChild(picker);
    window._activeIconPicker = picker;

    // ===== Handlers =====
    picker.querySelectorAll(".picker-option.emoji").forEach(el => {
      el.onclick = () => {
        app.icon = { type: "emoji", value: el.textContent };
        OL.persist();
        OL.refreshModals && OL.refreshModals();
        OL.renderApps && OL.renderApps();
      };
    });

    picker.querySelector("#autoIconReset").onclick = () => {
      app.icon = null;
      OL.persist();
      OL.refreshModals && OL.refreshModals();
      OL.renderApps && OL.renderApps();
    };

    picker.querySelector("#uploadIconInput").onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const url = await fileToBase64(file);
      app.icon = { type: "img", url };
      OL.persist();
      OL.refreshModals && OL.refreshModals();
      OL.renderApps && OL.renderApps();
    };

    picker.querySelector("#iconFromUrl").onclick = () => {
      const url = window.prompt("Paste image URL for this app icon:");
      if (!url) return;
      app.icon = { type: "img", url: url.trim() };
      OL.persist();
      OL.refreshModals && OL.refreshModals();
      OL.renderApps && OL.renderApps();
    };

    picker.querySelector("#removeIconBtn").onclick = () => {
      app.icon = null;
      OL.persist();
      OL.refreshModals && OL.refreshModals();
      OL.renderApps && OL.renderApps();
    };

    // Close on outside click
    setTimeout(() => {
      document.addEventListener("click", closeIfOutside, { once: true });
    }, 50);

    function closeIfOutside(e) {
      if (!window._activeIconPicker) return;
      if (!window._activeIconPicker.contains(e.target) && e.target !== targetEl) {
        OL.closeIconPicker();
      }
    }
  };

  OL.closeIconPicker = function() {
    if (window._activeIconPicker) {
      window._activeIconPicker.remove();
      window._activeIconPicker = null;
    }
  };

  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

})();
