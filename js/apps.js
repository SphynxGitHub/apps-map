;(() => {
  if (!window.OL) {
    console.error('OL core not found. Load app-core.js first.');
    return;
  }

  const { state, persist } = window.OL;
  const { appIconHTML } = window.OL.icons;

  // ROUTE HANDLER ///////////////////////////////////////////////////////////
  window.OL.routeHandlers = window.OL.routeHandlers || {};
  window.OL.routeHandlers['/apps'] = renderAppsView;

  // VIEW RENDER //////////////////////////////////////////////////////////////
  function renderAppsView() {
    const container = document.getElementById('view');
    if (!container) return;
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="sticky">
        <h2>Applications</h2>
        <div class="row">
          <button class="seg-btn ${state.appsViewMode === 'details' ? 'active' : ''}" data-mode="details">Details</button>
          <button class="seg-btn ${state.appsViewMode === 'icons' ? 'active' : ''}" data-mode="icons">Icons</button>
        </div>
      </div>
      
      <div id="appsGrid"></div>
    `;
    container.appendChild(wrap);

    const grid = wrap.querySelector('#appsGrid');

    // BUTTON HANDLERS FOR VIEW MODE
    wrap.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.mode;
        if (!m) return;
        if (m !== state.appsViewMode) {
          state.appsViewMode = m;
          persist();
          renderGrid();
        }
      });
    });

    // GRID RENDER
    function renderGrid() {
      grid.innerHTML = '';

      if (state.appsViewMode === 'icons') {
        grid.className = 'grid cols-3';
      } else {
        grid.className = 'grid cols-2';
      }

      state.apps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'card app-card';
        card.dataset.id = app.id;

        if (state.appsViewMode === 'icons') {
          card.style.display = 'flex';
          card.style.justifyContent = 'center';
          card.style.alignItems = 'center';
          card.style.height = '80px';

          card.innerHTML = `
            <div class="app-icon-box small">
              ${appIconHTML(app)}
            </div>
          `;
        } else {
          card.style.display = 'flex';
          card.style.alignItems = 'center';
          card.style.gap = '10px';

          card.innerHTML = `
            <div class="app-icon-box small">
              ${appIconHTML(app)}
            </div>
            <div class="app-title">${app.name}</div>
          `;
        }

        // click handler (we will implement modal in step B)
        card.addEventListener('click', () => {
          window.OL.openAppModal && window.OL.openAppModal(app.id);
        });

        grid.appendChild(card);
      });
    }

    renderGrid();
  }

})();
