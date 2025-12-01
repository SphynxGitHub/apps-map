;(() => {

  if (!window.OL) {
    console.error("icons.js: OL core not loaded");
    return;
  }

  const OL = window.OL;

  /************************************************************
   * UNIFIED ICON RESOLUTION WITH INHERITANCE
   ************************************************************/
  OL.appIconHTML = function(obj, parentApp=null) {
    const icon = obj.icon || parentApp?.icon;

    if (icon && icon.type === "emoji") {
      return `<div class="icon-emoji">${icon.value}</div>`;
    }

    if (icon && icon.type === "img") {
      return `<img src="${icon.url}" class="icon-img">`;
    }

    const name = obj.name || parentApp?.name || "";
    const letters = name
      .split(" ")
      .map(w => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    return `<div class="icon-fallback">${letters}</div>`;
  };

  /************************************************************
   * ICON PICKER
   * Now accepts only:
   *  - target element
   *  - reference to the actual object being modified
   ************************************************************/
  OL.openIconPicker = function(targetEl, obj) {
    OL.closeIconPicker();

    const overlay = document.createElement("div");
    overlay.className = "icon-picker-overlay";

    const picker = document.createElement("div");
    picker.className = "icon-picker";
    overlay.appendChild(picker);

    picker.innerHTML = `
      <div class="picker-section">
        <div class="picker-title">Emoji</div>
        <div class="picker-row">
          ${["📅","📇","📤","📩","⚙️","🔐","🧮","📊","🗄","🧾","🧩","💼","🕒","☎️","📎","🎥","📹","📁","📂","⚡","🤼","📞","📆","🗓","📱","📝","✒"]
            .map(e => `<span class="picker-option emoji">${e}</span>`).join("")}
        </div>
      </div>
      <div class="picker-section">
        <div class="picker-title">Auto-Letter (inherit)</div>
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

    overlay.onclick = (e) => {
      if (e.target === overlay) OL.closeIconPicker();
    };

    /**********************
     * Emoji selection
     **********************/
    picker.querySelectorAll(".picker-option.emoji").forEach(el => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        obj.icon = { type: "emoji", value: el.textContent };
        OL.persist();
        OL.refreshAllUI?.();
        OL.closeIconPicker();
      };
    });

    /**********************
     * Reset to inherit
     **********************/
    picker.querySelector("#autoIconReset").onclick = (ev) => {
      ev.stopPropagation();
      obj.icon = null;
      OL.persist();
      OL.refreshAllUI?.();
      OL.closeIconPicker();
    };

    /**********************
     * URL input
     **********************/
    picker.querySelector("#iconUrlApply").onclick = (ev) => {
      ev.stopPropagation();
      const url = picker.querySelector("#iconUrlInput").value.trim();
      if (!url) return;
      obj.icon = { type: "img", url };
      OL.persist();
      OL.refreshAllUI?.();
      OL.closeIconPicker();
    };

    /**********************
     * Upload file
     **********************/
    picker.querySelector("#uploadIconInput").onchange = async (ev) => {
      ev.stopPropagation();
      const file = ev.target.files[0];
      if (!file) return;
      const url = await fileToBase64(file);
      obj.icon = { type: "img", url };
      OL.persist();
      OL.refreshAllUI?.();
      OL.closeIconPicker();
    };

    /**********************
     * Remove icon
     **********************/
    picker.querySelector("#removeIconBtn").onclick = (ev) => {
      ev.stopPropagation();
      obj.icon = null;
      OL.persist();
      OL.refreshAllUI?.();
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
