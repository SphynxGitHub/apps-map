;(() => {

  const core = window.OL;
  const { state, persist } = core;

  const esc = core.utils.esc;
  const { appIconHTML } = core.icons;

  // =========================================================
  // FUNCTIONS DATA STRUCTURE
  // =========================================================
  state.functions = state.functions || [];  // [{id, name, notes, appsUsed: []}]


  // =========================================================
  // GET FUNCTIONS THAT BELONG TO A SPECIFIC APP
  // =========================================================
  function getFunctionsForApp(appId) {
    return state.functions.filter(fn => fn.appsUsed?.includes(appId));
  }


  // =========================================================
  // RENDER FUNCTIONS INSIDE APP MODAL
  // =========================================================
  function renderAppFunctionsInsideModal(app) {
    const fnList = getFunctionsForApp(app.id);
    let html = "";

    // pills
    fnList.forEach(fn => {
      html += `
        <span class="fn-pill" data-fn="${fn.id}">
          ${esc(fn.name)}
          <span class="fn-pill-remove" data-remove="${fn.id}">✕</span>
        </span>
      `;
    });

    // add new chip
    html += `
      <button class="btn small fn-add-btn" id="addFunctionBtn">+ Add Function</button>
    `;

    return html;
  }


  // =========================================================
  // ATTACH EVENT HANDLERS FOR FUNCTIONS INSIDE APP MODAL
  // =========================================================
  function attachFunctionModalHandlers(app) {

    // REMOVE function from app
    document.querySelectorAll(".fn-pill-remove").forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const fnId = el.dataset.remove;

        // remove app from function list
        let fn = state.functions.find(x => x.id === fnId);
        if (fn) {
          fn.appsUsed = fn.appsUsed.filter(x => x !== app.id);
        }

        persist();
        core.replaceAppModalContent(app);
      };
    });


    // ADD new function
    document.getElementById("addFunctionBtn").onclick = () => {
      core.showFunctionPicker(app);
    };
  }


  // =========================================================
  // FUNCTION PICKER UI
  // A dropdown modal specifically for selecting / creating functions
  // =========================================================
  core.showFunctionPicker = function(app) {

    core.showModal(`
      <div class="fn-picker">
        <h3>Add Function</h3>

        <input type="text" id="fnSearchInput" placeholder="Search or Create Function..."/>

        <div id="fnPickerResults" class="fn-picker-list"></div>

        <div class="row" style="margin-top:12px;">
          <button class="btn small ghost" id="cancelFnPick">Cancel</button>
        </div>
      </div>
    `);

    function renderFnMatches() {
      const listEl = document.getElementById("fnPickerResults");
      const query = document.getElementById("fnSearchInput").value.toLowerCase();

      let filtered = state.functions.filter(fn =>
        fn.name.toLowerCase().includes(query)
      );

      let html = "";

      filtered.forEach(fn => {
        const alreadyUsed = fn.appsUsed?.includes(app.id);

        html += `
          <div class="fn-option" data-id="${fn.id}">
            ${esc(fn.name)}
            ${alreadyUsed ? `<span class="fn-used">✔ already used</span>` : ""}
          </div>
        `;
      });

      // Option to create new function
      if (query.length) {
        html += `
          <div class="fn-create" id="createFnOption">+ Create “${esc(query)}”</div>
        `;
      }

      listEl.innerHTML = html;


      // CLICK TO ADD EXISTING
      document.querySelectorAll(".fn-option").forEach(btn => {
        btn.onclick = () => {
          const fnId = btn.dataset.id;
          const fn = state.functions.find(x => x.id === fnId);

          if (!fn.appsUsed) fn.appsUsed = [];
          if (!fn.appsUsed.includes(app.id))
            fn.appsUsed.push(app.id);

          persist();
          core.hideModal();
          core.replaceAppModalContent(app);
        };
      });

      // CLICK TO CREATE NEW FUNCTION
      const createOption = document.getElementById("createFnOption");
      if (createOption) {
        createOption.onclick = () => {
          const name = document.getElementById("fnSearchInput").value.trim();
          if (!name) return;

          const newFn = {
            id: core.uid("fn"),
            name,
            notes: "",
            appsUsed: [app.id],
          };
          state.functions.push(newFn);

          persist();
          core.hideModal();
          core.replaceAppModalContent(app);
        };
      }
    }

    // search input listeners
    document.getElementById("fnSearchInput").oninput = renderFnMatches;
    document.getElementById("fnSearchInput").focus();

    // cancel btn
    document.getElementById("cancelFnPick").onclick = () => core.hideModal();

    renderFnMatches();
  };


  // =========================================================
  // PUBLIC API
  // =========================================================
  core.renderAppFunctionsInsideModal = renderAppFunctionsInsideModal;
  core.attachFunctionModalHandlers = attachFunctionModalHandlers;

})();
