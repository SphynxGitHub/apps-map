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
    // obj may be an app or function — same schema
  
    const icon = obj.icon || null;
    const name = obj.name || "";
  
    // If explicit icon URL
    if (icon && typeof icon === "string" && icon.startsWith("http")) {
      return `<img src="${icon}" class="icon-img">`;
    }
  
    // If base64-encoded or blob
    if (icon && icon.startsWith("data:image")) {
      return `<img src="${icon}" class="icon-img">`;
    }
  
    // Default internal initials
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
    // close any existing picker first
    OL.closeIconPicker();

    const picker = document.createElement("div");
    picker.className = "icon-picker";

    // position near the icon (viewport coords)
    const rect = targetEl.getBoundingClientRect();
    picker.style.position = "fixed";
    picker.style.top = (rect.bottom + 4) + "px";
    picker.style.left = rect.left + "px";
    picker.style.zIndex = 10002;

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
        <div class="picker-row picker-row-url">
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

    document.body.appendChild(picker);
    window._activeIconPicker = picker;

    // ============================================================
    // HANDLERS
    // ============================================================

    // Emoji click
    picker.querySelectorAll(".picker-option.emoji").forEach(el => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        app.icon = { type: "emoji", value: el.textContent };
        OL.persist();
        OL.refreshCurrentAppModalIcon?.();
        OL.renderApps?.();
      };
    });

    // Auto reset → back to letter icon
    const resetBtn = picker.querySelector("#autoIconReset");
    if (resetBtn) {
      resetBtn.onclick = (ev) => {
        ev.stopPropagation();
        app.icon = null;
        OL.persist();
        OL.refreshCurrentAppModalIcon?.();
        OL.renderApps?.();
      };
    }

    // URL mapping
    const urlInput = picker.querySelector("#iconUrlInput");
    const urlApply = picker.querySelector("#iconUrlApply");
    if (urlInput && urlApply) {
      urlApply.onclick = (ev) => {
        ev.stopPropagation();
        const url = (urlInput.value || "").trim();
        if (!url) return;
        app.icon = { type: "img", url };
        OL.persist();
        OL.refreshCurrentAppModalIcon?.();
        OL.renderApps?.();
      };
    }

    // Upload file
    const uploadInput = picker.querySelector("#uploadIconInput");
    if (uploadInput) {
      uploadInput.onchange = async (ev) => {
        ev.stopPropagation();
        const file = ev.target.files[0];
        if (!file) return;
        const url = await fileToBase64(file);
        app.icon = { type: "img", url };
        OL.persist();
        OL.refreshCurrentAppModalIcon?.();
        OL.renderApps?.();
      };
    }

    // Remove icon
    const removeBtn = picker.querySelector("#removeIconBtn");
    if (removeBtn) {
      removeBtn.onclick = (ev) => {
        ev.stopPropagation();
        app.icon = null;
        OL.persist();
        OL.refreshCurrentAppModalIcon?.();
        OL.renderApps?.();
      };
    }

    // close on outside click
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
