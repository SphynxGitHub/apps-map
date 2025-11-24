;(() => {

  if (!window.OL) {
    console.error("icons.js: OL core not loaded");
    return;
  }

  const OL = window.OL;
  const { state, persist } = OL;

  // Safely wrap original function
  function buildLetterIconMeta(name) {
    if (OL.utils && typeof OL.utils.buildLetterIconMeta === "function") {
      return OL.utils.buildLetterIconMeta(name);
    }
    console.warn("buildLetterIconMeta missing — fallback used");
    return { initials: "?", bg:"#777", fg:"#fff" };
  }

  // ============================================================
  // ICON RENDERING
  // ============================================================

  OL.appIconHTML = function(app){
    if (!app) return `<div class="app-icon-box small">?</div>`;

    // EXPLICIT EMOJI
    if (app.icon?.type === "emoji") {
      return `<div class="app-icon-box small"><span>${app.icon.value}</span></div>`;
    }

    // UPLOADED IMAGE
    if (app.icon?.type === "img" && app.icon.url) {
      return `<div class="app-icon-box small"><img src="${app.icon.url}"></div>`;
    }

    // AUTO LETTER
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
    OL.closeIconPicker();

    const picker = document.createElement("div");
    picker.className = "icon-picker-popup";

    const rect = targetEl.getBoundingClientRect();
    picker.style.top = (rect.bottom + 4) + "px";
    picker.style.left = rect.left + "px";

    picker.innerHTML = `
      <div class="picker-title">Emoji</div>
      <div class="picker-row">
        ${["📅","📇","📤","📩","⚙️","🔐","📊","🧮","🧾","📎","☎️","🕒","🧠","💼","📦"]
        .map(e => `<span class="picker-opt emoji">${e}</span>`).join("")}
      </div>

      <div class="picker-title">Auto</div>
      <button class="btn small" id="autoIcon">Auto generate</button>

      <div class="picker-title">Upload</div>
      <input type="file" accept="image/*" id="uploadIconInput">

      <div class="picker-title">Remove</div>
      <button class="btn small" id="removeIcon">Remove</button>
    `;

    document.body.appendChild(picker);
    window._iconPicker = picker;

    // EVENT: emoji select
    picker.querySelectorAll(".emoji").forEach(el=>{
      el.onclick = () => {
        app.icon = {type:"emoji", value:el.textContent};
        persist();
        reRenderIconContext();
      };
    });

    // EVENT: auto icon
    picker.querySelector("#autoIcon").onclick = ()=>{
      app.icon = null;
      persist();
      reRenderIconContext();
    };

    // EVENT: upload image
    picker.querySelector("#uploadIconInput").onchange = async (ev)=>{
      const file = ev.target.files[0];
      if (!file) return;
      const url = await fileToBase64(file);
      app.icon = {type:"img", url};
      persist();
      reRenderIconContext();
    };

    // EVENT: remove
    picker.querySelector("#removeIcon").onclick = ()=>{
      app.icon = null;
      persist();
      reRenderIconContext();
    };

    // CLOSE ON CLICK OUTSIDE
    setTimeout(()=>{
      document.addEventListener("click", e=>{
        if (!picker.contains(e.target)) OL.closeIconPicker();
      }, {once:true});
    },50);
  };


  function reRenderIconContext(){
    // used by modal & main UI
    if (OL.replaceModalContent && OL.currentModalApp){
      OL.replaceModalContent( OL.renderAppModal(OL.currentModalApp) );
    }
    if (OL.renderApps) OL.renderApps();
  }

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
