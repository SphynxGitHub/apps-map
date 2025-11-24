;(() => {

  if (!window.OL) {
    console.error("icons.js: OL core not loaded");
    return;
  }

  const OL = window.OL;

  OL.appIconHTML = function(app){
    if (app.icon && app.icon.type === "emoji") {
      return `<div class="app-icon-box small"><span>${app.icon.value}</span></div>`;
    }
    if (app.icon && app.icon.type === "img") {
      return `<div class="app-icon-box small"><img src="${app.icon.url}"></div>`;
    }
    const meta = OL.utils.buildLetterIconMeta(app.name);
    return `<div class="app-icon-box small" style="background:${meta.bg};color:${meta.fg}">
      ${meta.initials}
    </div>`;
  };


  OL.openIconPicker = function(targetEl, app) {

    // close any existing picker first
    OL.closeIconPicker();

    const picker = document.createElement("div");
    picker.className = "icon-picker";

    const iconRect = targetEl.getBoundingClientRect();
    const modalRect = document.querySelector(".modal-window").getBoundingClientRect();
    
    picker.style.left = (iconRect.left - modalRect.left) + "px";
    picker.style.top  = (iconRect.bottom - modalRect.top + 4) + "px";

    window._iconPicker = picker;
    document.getElementById("appModalBody").appendChild(picker);

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
        <div class="picker-title">Upload</div>
        <input type="file" accept="image/*" id="uploadIconInput">
      </div>

      <div class="picker-section">
        <button id="removeIconBtn" class="btn small warn">Remove Icon</button>
      </div>
    `;

    picker.querySelectorAll(".picker-option.emoji").forEach(el=>{
      el.onclick = ()=>{
        app.icon = {type:"emoji",value:el.textContent};
        OL.persist();
        OL.refreshModals?.();
        OL.renderApps?.();
      };
    });

    picker.querySelector("#autoIconReset").onclick = ()=>{
      app.icon = null;
      OL.persist();
      OL.refreshModals?.();
      OL.renderApps?.();
    };

    picker.querySelector("#uploadIconInput").onchange = async (ev)=>{
      const file = ev.target.files[0];
      if (!file) return;
      const url = await fileToBase64(file);
      app.icon = {type:"img",url};
      OL.persist();
      OL.refreshModals?.();
      OL.renderApps?.();
    };

    picker.querySelector("#removeIconBtn").onclick = ()=>{
      app.icon = null;
      OL.persist();
      OL.refreshModals?.();
      OL.renderApps?.();
    };

    setTimeout(()=>{
      document.addEventListener("click", closeIfOutside);
    },50);

    function closeIfOutside(e){
      if (window._iconPicker && !window._iconPicker.contains(e.target) && e.target !== targetEl){
        OL.closeIconPicker();
      }
    }
  };


  OL.closeIconPicker = function(){
    if (window._iconPicker){
      window._iconPicker.remove();
      window._iconPicker = null;
    }
  };


  function fileToBase64(file){
    return new Promise((resolve)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

})();
