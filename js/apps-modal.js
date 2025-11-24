;(() => {

  if (!window.OL) {
    console.error("apps-modal.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { uid, esc, debounce } = OL.utils;

  let modalLayer = null;
  function ensureModalLayer() {
    if (!modalLayer) {
      modalLayer = document.getElementById("modal-layer");
    }
  }

  // ===============================
  // PUBLIC: OPEN EXISTING APP
  // ===============================
  OL.openAppModal = function(appId){
    const app = OL.state.apps.find(a=>a.id===appId);
    if (!app) return;
    showAppModal(app);
  };

  // ===============================
  // PUBLIC: CREATE NEW APP
  // ===============================
  OL.openAppModalNew = function(){
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

  // ===============================
  // BUILD MODAL STRUCTURE
  // ===============================
  function showAppModal(app) {
    ensureModalLayer();
    modalLayer.innerHTML = "";

    const modal = document.createElement("div");
    modal.className = "modal-window";

    const body = document.createElement("div");
    body.className = "modal-body";

    // HEADER
    const header = document.createElement("div");
    header.className = "modal-header";

    const icon = document.createElement("div");
    icon.id = "modalAppIcon";
    icon.className = "app-icon-box large clickable";

    const nameInput = document.createElement("div");
    nameInput.id = "modalAppName";
    nameInput.className = "modal-title-text";
    nameInput.contentEditable = false;

    header.appendChild(icon);
    header.appendChild(nameInput);
    body.appendChild(header);

    // NOTES
    body.appendChild(makeLabel("Notes"));
    const notesInput = document.createElement("textarea");
    notesInput.id = "modalAppNotes";
    notesInput.className = "modal-textarea";
    body.appendChild(notesInput);

    // FUNCTIONS
    body.appendChild(makeLabel("Functions"));
    const fnWrap = document.createElement("div");
    fnWrap.id = "modalAppFunctions";
    body.appendChild(fnWrap);

    const btnFn = document.createElement("button");
    btnFn.id = "modalAddFunction";
    btnFn.className = "btn small";
    btnFn.textContent = "+ Add Function";
    body.appendChild(btnFn);

    // INTEGRATIONS
    body.appendChild(makeLabel("Integrations"));
    const intWrap = document.createElement("div");
    intWrap.id = "modalAppIntegrations";
    body.appendChild(intWrap);

    const btnInt = document.createElement("button");
    btnInt.id = "modalAddIntegration";
    btnInt.className = "btn small";
    btnInt.textContent = "+ Add Integration";
    body.appendChild(btnInt);

    // DATAPOINTS
    body.appendChild(makeLabel("Datapoints"));
    const dpWrap = document.createElement("div");
    dpWrap.id = "modalAppDatapoints";
    body.appendChild(dpWrap);

    const btnDp = document.createElement("button");
    btnDp.id = "modalAddDatapoint";
    btnDp.className = "btn small";
    btnDp.textContent = "+ Add Datapoint";
    body.appendChild(btnDp);

    modal.appendChild(body);
    modalLayer.appendChild(modal);
    modalLayer.style.display = "flex";

    modalLayer.onclick = e => { if (e.target === modalLayer) hideModal(); };

    bindModalFields(app);
  }

  function makeLabel(text){
    const lbl = document.createElement("label");
    lbl.className = "modal-section-label";
    lbl.textContent = text;
    return lbl;
  }

  function hideModal(){
    modalLayer.style.display = "none";
  }

  // ===============================
  // BIND DATA
  // ===============================
  function bindModalFields(app) {
    // normalize data shape
    app.functions = app.functions || [];
    app.integrations = app.integrations || [];
    app.datapointMappings = app.datapointMappings || [];
    
    bindIcon(app);
    bindName(app);
    bindNotes(app);
    bindFunctions(app);
    bindIntegrations(app);
    bindDatapoints(app);
  }

  // ICON
  function bindIcon(app){
    const el = document.getElementById("modalAppIcon");
    el.innerHTML = OL.appIconHTML(app);
    el.onclick = ()=> OL.openIconPicker(el, app);
  }

  function bindName(app){
    const el = document.getElementById("modalAppName");
    el.textContent = app.name || "(unnamed)";
  
    el.onclick = () => {
      el.contentEditable = true;
      el.classList.add("editing");
      el.focus();
    };
  
    el.onblur = () => {
      el.contentEditable = false;
      el.classList.remove("editing");
      app.name = el.textContent.trim();
      OL.persist();
      OL.renderApps();
    };
  
    el.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    };
  }

  function bindNotes(app){
    const input = document.getElementById("modalAppNotes");
    input.value = app.notes || "";
    input.oninput = debounce(()=>{
      app.notes = input.value;
      OL.persist();
    },200);
  }

  // FUNCTIONS
  function bindFunctions(app){
    const wrap = document.getElementById("modalAppFunctions");
    wrap.innerHTML = "";

    app.functions.forEach(fn=>{
      const pill = document.createElement("span");
      pill.className = "pill fn";
      pill.textContent = findFunctionName(fn.id);

      pill.onclick = ()=>{
        fn.status = nextFnState(fn.status);
        OL.persist();
        bindFunctions(app);
      };

      pill.oncontextmenu = (e)=>{
        e.preventDefault();
        app.functions = app.functions.filter(f=>f!==fn);
        OL.persist();
        bindFunctions(app);
      };

      wrap.appendChild(pill);
    });

    document.getElementById("modalAddFunction").onclick = ()=>{
      const sel = document.createElement("select");
      sel.innerHTML = `<option value="">Select…</option>`+
        OL.state.functions.filter(f=>!app.functions.find(a=>a.id===f.id))
        .map(f=>`<option value="${f.id}">${esc(f.name)}</option>`)
        .join("");

      sel.onchange = ()=>{
        app.functions.push({ id: sel.value, status:"available" });
        OL.persist();
        bindFunctions(app);
      };

      wrap.appendChild(sel);
    };
  }

  function nextFnState(s){
    if (s==="primary") return "evaluating";
    if (s==="evaluating") return "available";
    return "primary";
  }

  function findFunctionName(id){
    const f = OL.state.functions.find(x=>x.id===id);
    return f ? f.name : "(unknown)";
  }

  // INTEGRATIONS
  function bindIntegrations(app){
    const wrap = document.getElementById("modalAppIntegrations");
    wrap.innerHTML = "";

    app.integrations.forEach(int=>{
      const pill = document.createElement("span");
      pill.className = "pill int";
      const otherApp = OL.state.apps.find(a=>a.id===int.appId);
      pill.textContent = otherApp ? otherApp.name : "(missing)";

      pill.onclick = ()=>{
        int.type = nextType(int.type);
        OL.persist();
        bindIntegrations(app);
      };

      pill.oncontextmenu = (e)=>{
        e.preventDefault();
        app.integrations = app.integrations.filter(i=>i!==int);
        OL.persist();
        bindIntegrations(app);
      };

      wrap.appendChild(pill);
    });

    document.getElementById("modalAddIntegration").onclick = ()=>{
      const sel = document.createElement("select");
      sel.innerHTML = `<option value="">Select app…</option>`+
        OL.state.apps
          .filter(a=>a.id!==app.id && !app.integrations.find(i=>i.appId===a.id))
          .map(a=>`<option value="${a.id}">${esc(a.name)}</option>`)
          .join("");

      sel.onchange = ()=>{
        app.integrations.push({ appId: sel.value, type: "zapier" });
        OL.persist();
        bindIntegrations(app);
      };

      wrap.appendChild(sel);
    };
  }

  function nextType(t){
    if (t==="zapier") return "direct";
    if (t==="direct") return "both";
    return "zapier";
  }

  // DATAPOINTS
  function bindDatapoints(app){
    const wrap = document.getElementById("modalAppDatapoints");
    wrap.innerHTML = "";

    app.datapointMappings.forEach(dp=>{
      const row = document.createElement("div");
      row.className = "row";

      const master = document.createElement("input");
      master.type="text";
      master.value = dp.master || "";
      master.placeholder="Master";
      master.oninput=debounce(()=>{
        dp.master=master.value;
        OL.persist();
      },200);
      
      const inbound = document.createElement("input");
      inbound.type="text";
      inbound.value = dp.inbound || "";
      inbound.placeholder="Inbound";
      inbound.oninput=debounce(()=>{
        dp.inbound=inbound.value;
        OL.persist();
      },200);

      const outbound = document.createElement("input");
      outbound.type="text";
      outbound.value = dp.outbound || "";
      outbound.placeholder="Outbound";
      outbound.oninput=debounce(()=>{
        dp.outbound=outbound.value;
        OL.persist();
      },200);

      row.appendChild(master);
      row.appendChild(inbound);
      row.appendChild(outbound);

      wrap.appendChild(row);
    });

    document.getElementById("modalAddDatapoint").onclick = ()=>{
      app.datapointMappings.push({ master:"", inbound:"", outbound:"" });
      OL.persist();
      bindDatapoints(app);
    };
  }

})();
