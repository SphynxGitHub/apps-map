;(() => {

  if (!window.OL) {
    console.error("apps-modal.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { uid, esc, debounce } = OL.utils;

  // ============================================================
  // PUBLIC: OPEN EXISTING APP
  // ============================================================
  OL.openAppModal = function(appId){
    const app = OL.state.apps.find(a=>a.id===appId);
    if (!app) return;
    showAppModal(app);
  };

  // ============================================================
  // PUBLIC: CREATE NEW APP
  // ============================================================
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

  // ============================================================
  // MAIN MODAL RENDER
  // ============================================================
  function showAppModal(app){
    OL.openModal(`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div id="appIconBox" style="cursor:pointer;">
          ${OL.appIconHTML(app)}
        </div>
        <input id="appNameInput" type="text" 
          placeholder="App name" 
          value="${esc(app.name)}"
          style="flex:1;background:none;border:none;font-size:18px;font-weight:600;color:var(--text);outline:none;">
      </div>

      <label>Notes</label>
      <textarea id="appNotesInput">${esc(app.notes||"")}</textarea>

      <br>
      <label>Functions</label>
      <div id="appFunctionsList" style="margin-bottom:6px;"></div>
      <button class="btn small" id="addFunctionBtn">+ Add Function</button>

      <br><br>
      <label>Integrations</label>
      <div id="appIntegrationsList" style="margin-bottom:6px;"></div>
      <button class="btn small" id="addIntegrationBtn">+ Add Integration</button>

      <br><br>
      <label>Datapoints</label>
      <div id="appDatapointsList" style="margin-bottom:6px;"></div>
      <button class="btn small" id="addDatapointBtn">+ Add Datapoint</button>
    `);

    wireIcon(app);
    wireName(app);
    wireNotes(app);
    wireFunctions(app);
    wireIntegrations(app);
    wireDatapoints(app);

    OL.refreshModals = ()=> showAppModal(app);
  }

  // ============================================================
  // ICON
  // ============================================================
  function wireIcon(app){
    const box = document.getElementById("appIconBox");
    box.onclick = (e)=>{
      e.stopPropagation();
      OL.openIconPicker(box, app);
    };
  }

  function wireName(app){
    const input = document.getElementById("appNameInput");
    input.oninput = debounce(()=>{
      app.name = input.value.trim();
      OL.persist();
      OL.renderApps();
    },300);
  }

  function wireNotes(app){
    const input = document.getElementById("appNotesInput");
    input.oninput = debounce(()=>{
      app.notes = input.value;
      OL.persist();
    },300);
  }

  // ============================================================
  // FUNCTIONS
  // ============================================================
  function wireFunctions(app){
    const wrap = document.getElementById("appFunctionsList");
    wrap.innerHTML = "";

    app.functions.forEach(fn=>{
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.style.cursor="pointer";
      pill.style.marginRight="6px";
      pill.textContent = findFunctionName(fn.id);

      // Color-coded based on status
      pill.style.background = fn.status==="primary" ? "var(--ok)" :
                             fn.status==="evaluating" ? "#3d4c6b" :
                             "var(--soft)";
      pill.style.color = fn.status==="primary" ? "#011" : "#dde4ef";

      // Left click — cycle state
      pill.onclick = ()=>{
        cycleFunctionState(fn);
        OL.persist();
        OL.refreshModals();
        OL.renderApps();
      };

      // Right click — delete
      pill.oncontextmenu = (e)=>{
        e.preventDefault();
        app.functions = app.functions.filter(f=>f!==fn);
        OL.persist();
        OL.refreshModals();
        OL.renderApps();
      };

      wrap.appendChild(pill);
    });

    document.getElementById("addFunctionBtn").onclick = ()=>{
      const sel = document.createElement("select");
      sel.innerHTML = 
        `<option value="">Select function…</option>`+
        OL.state.functions
          .filter(f=>!app.functions.find(a=>a.id===f.id))
          .map(f=>`<option value="${f.id}">${esc(f.name)}</option>`)
          .join("");

      sel.onchange = ()=>{
        if(!sel.value) return;
        app.functions.push({id:sel.value,status:"available"});
        OL.persist();
        OL.refreshModals();
        OL.renderApps();
      };

      wrap.appendChild(sel);
    };
  }

  function cycleFunctionState(fn){
    if (fn.status==="available") fn.status="primary";
    else if (fn.status==="primary") fn.status="evaluating";
    else fn.status="available";
  }

  function findFunctionName(id){
    const f = OL.state.functions.find(x=>x.id===id);
    return f ? f.name : "(unknown)";
  }

  // ============================================================
  // INTEGRATIONS
  // ============================================================
  function wireIntegrations(app){
    const wrap = document.getElementById("appIntegrationsList");
    wrap.innerHTML = "";

    app.integrations.forEach(int=>{
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.style.marginRight="6px";
      pill.style.cursor="pointer";

      const otherApp = OL.state.apps.find(a=>a.id===int.appId);
      pill.textContent = otherApp ? otherApp.name : "(missing)";

      // border = integration type
      pill.style.border = `1px solid ${ 
        int.type==="zapier" ? "var(--warn)" :
        int.type==="direct" ? "var(--ok)" :
        "var(--accent)"
      }`;

      // left click — cycle type
      pill.onclick = ()=>{
        int.type = nextType(int.type);
        OL.persist();
        OL.refreshModals();
      };

      // right click — remove
      pill.oncontextmenu = (e)=>{
        e.preventDefault();
        app.integrations = app.integrations.filter(i=>i!==int);
        OL.persist();
        OL.refreshModals();
      };

      wrap.appendChild(pill);
    });

    document.getElementById("addIntegrationBtn").onclick = ()=>{
      const sel = document.createElement("select");
      sel.innerHTML = `<option value="">Select app…</option>`+
        OL.state.apps
          .filter(a=>a.id!==app.id && !app.integrations.find(i=>i.appId===a.id))
          .map(a=>`<option value="${a.id}">${esc(a.name)}</option>`)
          .join("");

      sel.onchange = ()=>{
        if (!sel.value) return;
        app.integrations.push({
          appId: sel.value,
          type: "zapier"
        });
        OL.persist();
        OL.refreshModals();
      };

      wrap.appendChild(sel);
    };
  }

  function nextType(t){
    if (t==="zapier") return "direct";
    if (t==="direct") return "both";
    return "zapier";
  }

  // ============================================================
  // DATAPOINTS
  // ============================================================
  function wireDatapoints(app){
    const wrap = document.getElementById("appDatapointsList");
    wrap.innerHTML = "";

    app.datapointMappings.forEach(row=>{
      const div = document.createElement("div");
      div.className="row";

      const sel = document.createElement("input");
      sel.type="text";
      sel.style.width="29%";
      sel.placeholder="Master";
      sel.value=row.master||"";
      sel.oninput=debounce(()=>{row.master=sel.value;OL.persist();},300);

      const inbound = document.createElement("input");
      inbound.type="text";
      inbound.style.width="35%";
      inbound.placeholder="Inbound";
      inbound.value=row.inbound||"";
      inbound.oninput=debounce(()=>{row.inbound=inbound.value;OL.persist();},300);

      const outbound = document.createElement("input");
      outbound.type="text";
      outbound.style.width="35%";
      outbound.placeholder="Outbound";
      outbound.value=row.outbound||"";
      outbound.oninput=debounce(()=>{row.outbound=outbound.value;OL.persist();},300);

      div.appendChild(sel);
      div.appendChild(inbound);
      div.appendChild(outbound);

      wrap.appendChild(div);
    });

    document.getElementById("addDatapointBtn").onclick = ()=>{
      app.datapointMappings.push({
        master:"",
        inbound:"",
        outbound:""
      });
      OL.persist();
      OL.refreshModals();
    };
  }

})();
