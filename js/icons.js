;(() => {

  if (!window.OL) {
    console.error("icons.js: OL core not loaded");
    return;
  }

  const OL = window.OL;

  // ============================================================
  // APP ICON HTML RENDERING
  // ============================================================
  OL.appIconHTML = function(obj) {
    const icon = obj.icon;
  
    // explicit emoji
    if (icon && icon.type === "emoji") {
      return `<div class="icon-emoji">${icon.value}</div>`;
    }
  
    // explicit image
    if (icon && icon.type === "img") {
      return `<img src="${icon.url}" class="icon-img">`;
    }
  
    // auto initials
    const name = obj.name || "";
    const letters = name
      .split(" ")
      .map(w => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  
    return `<div class="icon-fallback">${letters}</div>`;
  };

  // ============================================================
  // ICON PICKER UI
  // ============================================================
  OL.openIconPicker = function(targetEl, app) {
    OL.closeIconPicker(); // zap old instance
  
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "icon-picker-overlay";
  
    // Create picker
    const picker = document.createElement("div");
    picker.className = "icon-picker";
    overlay.appendChild(picker);
  
    // Insert HTML
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
        <div class="picker-title">From URL</div>
        <div class="picker-row">
          <input type="text" id="iconUrlInput" placeholder="Paste image URL…">
          <button id="iconUrlApply" class="btn small">Use</button>
        </div>
      </div>
      <div class="picker-section">
        <div class="picker-title">Upload</div>
        <input type="file" accept="image/*" id="uploadIconInput">
      </div>
      <div class="picker-section">
        <button id="removeIconBtn" class="btn small warn">Remove Icon</button>
      </div>
    `;
  
    document.body.appendChild(overlay);
    window._activeIconPicker = overlay;
  
    // Handle click outside
    overlay.onclick = (e) => {
      if (e.target === overlay) OL.closeIconPicker();
    };
  
    // Emoji handlers
    picker.querySelectorAll(".picker-option.emoji").forEach(el => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        app.icon = { type: "emoji", value: el.textContent };
        OL.persist();
        OL.refreshCurrentAppModalIcon?.();
        OL.renderApps?.();
        OL.closeIconPicker();
      };
    });
  
    // Reset
    picker.querySelector("#autoIconReset").onclick = (ev) => {
      ev.stopPropagation();
      app.icon = null;
      OL.persist();
      OL.refreshCurrentAppModalIcon?.();
      OL.renderApps?.();
      OL.closeIconPicker();
    };
  
    // URL
    picker.querySelector("#iconUrlApply").onclick = (ev) => {
      ev.stopPropagation();
      const url = picker.querySelector("#iconUrlInput").value.trim();
      if (!url) return;
      app.icon = { type: "img", url };
      OL.persist();
      OL.refreshCurrentAppModalIcon?.();
      OL.renderApps?.();
      OL.closeIconPicker();
    };
  
    // Upload
    picker.querySelector("#uploadIconInput").onchange = async (ev) => {
      ev.stopPropagation();
      const file = ev.target.files[0];
      if (!file) return;
      const url = await fileToBase64(file);
      app.icon = { type: "img", url };
      OL.persist();
      OL.refreshCurrentAppModalIcon?.();
      OL.renderApps?.();
      OL.closeIconPicker();
    };
  
    // Remove Icon
    picker.querySelector("#removeIconBtn").onclick = (ev) => {
      ev.stopPropagation();
      app.icon = null;
      OL.persist();
      OL.refreshCurrentAppModalIcon?.();
      OL.renderApps?.();
      OL.closeIconPicker();
    };
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
