;(() => {

  if (!window.OL) {
    console.error("integrations.js: OL not loaded");
    return;
  }

  const OL = window.OL;
  const { state, persist, utils } = OL;
  const { esc } = utils;

  // =========================================================================
  // PUBLIC — render into #view
  // =========================================================================
  OL.renderIntegrations = function(){

    const wrapper = document.getElementById("view");
    if (!wrapper) return;

    OL.updateBreadcrumb("Integrations");

    wrapper.innerHTML = `
      <div class="viewHeader">
        <h2>Integrations</h2>
        <div style="flex:1"></div>
        <div class="viewModeToggle" id="integrationsViewToggle">
          <button data-mode="flip">Flip</button>
          <button data-mode="one">One-Direction</button>
          <button data-mode="both">Bi-Directional</button>
        </div>
      </div>

      <div id="integrationsContainer"></div>
    `;

    initIntegrationsViewToggle();
    rebuildIntegratedPairs();
    renderIntegrationsView();
  };


  // =========================================================================
  // VIEW MODE
  // =========================================================================
  function initIntegrationsViewToggle(){
    const el = document.getElementById("integrationsViewToggle");
    if (!el) return;

    el.querySelectorAll("button").forEach(btn => {
      const mode = btn.dataset.mode;
      btn.onclick = () => {
        state.integrationsViewMode = mode;
        persist();
        renderIntegrationsView();
      };
    });
  }


  // =========================================================================
  // BUILD APP-PAIR RELATIONSHIP INDEX
  // =========================================================================

  // internal cache example:
  // state._integrationGraph = {
  //   "Calendly::Wealthbox": {
  //        a: calendlyId,
  //        b: wealthboxId,
  //        a2b: [{category,type,action}],
  //        b2a: [{category,type,action}]
  //   }
  // }
  //
  // NOTE: a2b and b2a each have SEPARATE action lists

  function rebuildIntegratedPairs(){

    const map = {};

    state.apps.forEach(app => {

      (app.integrations || []).forEach(integ => {

        const other = state.apps.find(a => a.id === integ.appId);
        if (!other) return;

        const idA = app.id;
        const idB = other.id;

        const pairKey = pair(idA, idB);

        if (!map[pairKey]) {
          map[pairKey] = {
            a: idA,
            b: idB,
            a2b: [],
            b2a: []
          };
        }

        const type = integ.type || "zapier";
        const category = integ.category || "general";
        const actions = integ.actions || [];

        // determine direction
        if (shouldOrder(idA,idB,app.id)) {
          map[pairKey].a2b.push({type,category,actions});
        } else {
          map[pairKey].b2a.push({type,category,actions});
        }
      });
    });

    state._integrationGraph = map;
  }

  function pair(a,b){
    return [a,b].sort().join("::");
  }

  function shouldOrder(a,b,source){
    return a < b ? source===a : source===b;
  }


  // =========================================================================
  // RENDER VIEW
  // =========================================================================
  function renderIntegrationsView(){

    const c = document.getElementById("integrationsContainer");
    c.innerHTML = "";

    const list = Object.values(state._integrationGraph || {});
    if (!list.length){
      c.innerHTML = `<div class="empty">No integrations recorded.</div>`;
      return;
    }

    list.forEach(entry => {
      c.appendChild(renderIntegrationCard(entry));
    });
  }


  // =========================================================================
  // CARD RENDER
  // =========================================================================
  function renderIntegrationCard(entry){

    const a = findApp(entry.a);
    const b = findApp(entry.b);

    const card = document.createElement("div");
    card.className = "integrationCard";

    const viewMode = state.integrationsViewMode || "flip";

    card.innerHTML = `
      <div class="pairRow">
        <div class="pairApp">${OL.appLabelHTML(a)}</div>
        <div class="pairDir">${renderDirectionControl(entry)}</div>
        <div class="pairApp">${OL.appLabelHTML(b)}</div>
      </div>

      <div class="actionsRow">
        ${renderActions(entry)}
      </div>
    `;

    return card;
  }


  function findApp(id){
    return state.apps.find(a => a.id === id) || {name:"Unknown",id:"?"};
  }


  // =========================================================================
  // DIRECTION UI
  // =========================================================================
  function renderDirectionControl(entry){

    const viewMode = state.integrationsViewMode || "flip";

    if (viewMode === "both"){
      return `<div class="dirIcon">⇄</div>`;
    }

    if (viewMode === "one"){
      // show a2b and b2a as separate sub-cards
      return `<div class="dirIconGroup">
        <div class="oneDir">→</div>
        <div class="oneDir">←</div>
      </div>`;
    }

    // otherwise flip view:
    // top arrow = active
    // bottom arrow = inactive
    return `
      <div class="flipDir" data-pair="${entry.a}::${entry.b}">
        <div class="flipArrow up ${isForward(entry)?"active":""}">→</div>
        <div class="flipArrow down ${!isForward(entry)?"active":""}">←</div>
      </div>
    `;
  }

  function isForward(entry){
    // a2b or b2a is being displayed
    return state._showForward?.[pair(entry.a,entry.b)] ?? true;
  }


  // =========================================================================
  // ACTION SECTION
  // =========================================================================
  function renderActions(entry){

    const p = pair(entry.a,entry.b);
    const forward = isForward(entry);

    const items = forward ? entry.a2b : entry.b2a;

    if (!items.length){
      return `<div class="emptyActions">No actions yet</div>`;
    }

    return items.map(obj => {
      return `
        <div class="actionBlock" style="border-color:${colorFor(obj.type)};">
          <div class="actionHeader">
            <span class="actionCat" style="background:${colorForCategory(obj.category)};">
              ${esc(obj.category)}
            </span>
            <span class="actionType">${obj.type}</span>
          </div>
          <ul class="actionList">
            ${obj.actions.map(a=>`<li>${esc(a)}</li>`).join("")}
          </ul>
        </div>
      `;
    }).join("");
  }

  function colorFor(type){
    if (type==="direct") return "#18c38a";
    if (type==="zapier") return "#d5a73b";
    if (type==="both")   return "#4f6cdf";
    return "#888";
  }

  function colorForCategory(cat){
    const c = state.categories?.find(c=>c.name===cat);
    return c?.color || "#333";
  }

})();
