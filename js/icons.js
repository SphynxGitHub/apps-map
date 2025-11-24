;(() => {

  if (!window.OL) {
    console.error("icons.js: OL core not loaded");
    return;
  }

  const OL = window.OL;
  const { getInitials, buildLetterIconMeta } = OL.utils;

  // ============================================================
  // ICON RENDERING
  // ============================================================

  OL.appIconHTML = function(app){
    // 1 — explicit emoji
    if (app.icon && app.icon.type === "emoji") {
      return `<div class="app-icon-box small"><span>${app.icon.value}</span></div>`;
    }

    // 2 — uploaded image
    if (app.icon && app.icon.type === "img") {
      return `
        <div class="app-icon-box small">
          <img src="${app.icon.url}">
        </div>
      `;
    }

    // 3 — auto-letter icon
    const meta = buildLetterIconMeta(app.name);
    return `
      <div class="app-icon-box small app-icon initials" style="background:${meta.bg};color:${meta.fg}">
        ${meta.initials}
      </div>
    `;
  };

  // ============================================================
  // ICON PICKER UI
  // ============================================================

  OL.openIconPicker = function(targetEl, app) {
    OL.closeIconPicker(); // remove any existing picker

    const picker = document.createElement("div");
    picker.className = "icon-picker";
    picker.style.position = "absolute";

    // place below target element
    const rect = targetEl.getBoundingClientRect();
    picker.style.top = (rect.bottom + 4) + "px";
    picker.style.left = rect.left + "px";
    picker.style.zIndex = 1001;

    picker.innerHTML = `
      <div class="picker-section">
        <div class="picker-title">Choose Emoji</div>
        <div class="picker-row">
          ${["📅","📇","📤","📩","⚙️","🔐","🧮","📊","🗄","🧾","🧩","💼","🕒","☎️","📎"]
            .map(e => `<span class="picker-option emoji">${e}</span>`).join("")}
        </div>
      </div>

      <div class="picker-section">
        <div class="picker-title">Auto Icon (Letters)</div>
        <button class="btn small" id="autoIconReset">Reset</button>
      </div>

      <div class="picker-section">
        <div class="picker-title">Upload Icon</div>
        <input type="file" accept="image/*" id="uploadIconInput">
      </div>

      <div class="picker-section">
        <div class="picker-title">Remove Icon</div>
        <button class="btn small" id="removeIconBtn">Remove</button>
      </div>
    `;

    document.body.appendChild(picker);
    window._iconPicker = picker;

    // EVENT HANDLERS

    // click emoji
    picker.querySelectorAll(".picker-option.emoji").forEach(el=>{
      el.onclick = () => {
        app.icon = {type:"emoji",value:el.textContent};
        OL.persist();
        OL.refreshModals();
        OL.renderApps && OL.renderApps();
      };
    });

    // click auto reset
    picker.querySelector("#autoIconReset").onclick = ()=>{
      app.icon = null;
      OL.persist();
      OL.refreshModals();
      OL.renderApps && OL.renderApps();
    };

    // upload file
    picker.querySelector("#uploadIconInput").onchange = async (ev)=>{
      const file = ev.target.files[0];
      if (!file) return;

      const url = await fileToBase64(file);
      app.icon = {type:"img",url};
      OL.persist();
      OL.refreshModals();
      OL.renderApps && OL.renderApps();
    };

    // remove icon
    picker.querySelector("#removeIconBtn").onclick = ()=>{
      app.icon = null;
      OL.persist();
      OL.refreshModals();
      OL.renderApps && OL.renderApps();
    };

    // click outside to close
    setTimeout(()=>{ // give it a tick so it doesn’t immediately close
      document.addEventListener("click", closeIfOutside, {once:true});
    },50);

    function closeIfOutside(e){
      if (!picker.contains(e.target)) OL.closeIconPicker();
    }
  };

  OL.closeIconPicker = function(){
    if (window._iconPicker){
      window._iconPicker.remove();
      window._iconPicker = null;
    }
  };

  async function fileToBase64(file){
    return new Promise((resolve)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

})();
