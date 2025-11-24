;(() => {

  if (!window.OL) {
    console.error("functions.js: OL core missing");
    return;
  }

  const OL = window.OL;

  // ============================================================
  // RENDER FUNCTIONS PANEL (not modal)
  // ============================================================
  OL.renderFunctions = function(){
    const root = document.getElementById("view");
    if (!root) return;

    const appList = OL.state.apps;
    const fnList = OL.state.functions;

    const filterAppId = OL.state.functionsFilterAppId;

    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:20px;font-weight:600;">Functions</div>
        <div>
          <button id="toggleFunctionsView" class="btn small">${OL.state.functionsViewMode==="details" ? "Icons" : "Details"}</button>
        </div>
      </div>
      <br>

      <div>
        <label style="font-weight:600;">Filter by App:</label>
        <select id="filterFunctionsApp">
          <option value="">— All Apps —</option>
          ${appList.map(a=>`
            <option value="${a.id}" ${a.id===filterAppId?"selected":""}>${OL.utils.esc(a.name)}</option>
          `).join("")}
        </select>
      </div>

      <br>
      <div id="functionsList"></div>
    `;

    document.getElementById("filterFunctionsApp").onchange = (e)=>{
      OL.state.functionsFilterAppId = e.target.value;
      OL.persist();
      OL.renderFunctions();
    };

    document.getElementById("toggleFunctionsView").onclick = ()=>{
      OL.state.functionsViewMode = OL.state.functionsViewMode==="details" ? "icons" : "details";
      OL.persist();
      OL.renderFunctions();
    };

    renderList();
  };

  // ============================================================
  // RENDER LIST OF FUNCTIONS
  // ============================================================
  function renderList(){

    const wrap = document.getElementById("functionsList");
    wrap.innerHTML = "";

    const filterAppId = OL.state.functionsFilterAppId;
    const mode = OL.state.functionsViewMode;

    // build assigned mapping
    // appId → list of function IDs
    const assigned = {};
    for (const app of OL.state.apps){
      for(const fn of (app.functions||[])){
        if (!assigned[fn.id]) assigned[fn.id]=[];
        assigned[fn.id].push(app.id);
      }
    }

    OL.state.functions.forEach(fn=>{
      // Skip functions not relevant to selected app filter
      if (filterAppId){
        const usedBy = assigned[fn.id]||[];
        if (!usedBy.includes(filterAppId)) return;
      }

      if (mode==="icons"){
        renderFunctionIcon(fn, assigned[fn.id]||[], wrap);
      } else {
        renderFunctionDetails(fn, assigned[fn.id]||[], wrap);
      }
    });
  }

  // ============================================================
  // RENDER: ICON MODE
  // ============================================================
  function renderFunctionIcon(fn, usedBy, wrap){
    const div = document.createElement("div");
    div.className="function-icon-card";

    div.innerHTML = `
      <div style="font-weight:600;">${OL.utils.esc(fn.name)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
        Used by: ${usedBy.length}
      </div>
    `;

    div.onclick = ()=>{
      console.log("future: open function inspector");
    };

    wrap.appendChild(div);
  }

  // ============================================================
  // RENDER: DETAILS MODE
  // ============================================================
  function renderFunctionDetails(fn, usedBy, wrap){
    const div = document.createElement("div");
    div.className="function-card";

    div.innerHTML = `
      <div style="font-weight:600;font-size:15px;margin-bottom:4px;">
        ${OL.utils.esc(fn.name)}
      </div>

      <div style="font-size:13px;color:var(--muted);margin-bottom:6px;">
        Used by:
        ${usedBy.map(id=>{
          const a = OL.state.apps.find(x=>x.id===id);
          return `<span class="pill small">${OL.utils.esc(a? a.name : "?")}</span>`;
        }).join(" ")}
      </div>
    `;

    div.onclick = ()=>{
      console.log("future: open function inspector");
    };

    wrap.appendChild(div);
  }

})();
