;(() => {

  //
  // SAFETY CHECK
  //
  if (!window.OL) {
    console.error('OL core not found — load app-core.js first.');
    return;
  }

  //
  // MODAL ROOT (singleton)
  //
  let modalLayer = null;
  function ensureModalLayer() {
    if (!modalLayer) {
      modalLayer = document.createElement('div');
      modalLayer.id = 'modal-layer';
      modalLayer.style.position = 'fixed';
      modalLayer.style.inset = '0';
      modalLayer.style.display = 'none';
      modalLayer.style.zIndex = '999';
      modalLayer.style.background = 'rgba(0,0,0,.5)';
      modalLayer.style.backdropFilter = 'blur(4px)';

      document.body.appendChild(modalLayer);
    }
  }

  //
  // PUBLIC: open app modal
  //
  function openAppModal(appId) {
    const app = window.OL.state.apps.find(a => a.id === appId);
    if (!app) return;
    showModal(app);
  }

  //
  // BUILD THE MODAL CONTENT FIXED STRUCTURE
  //
  function showModal(app) {
    ensureModalLayer();
    modalLayer.innerHTML = '';  // clear old

    // Modal container
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '620px';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'hidden';
    modal.style.borderRadius = '14px';
    modal.style.background = 'var(--panel)';
    modal.style.border = '1px solid var(--line)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';

    // Create scrollable body container
    const body = document.createElement('div');
    body.id = 'appModalBody';
    body.style.padding = '16px';
    body.style.overflowY = 'auto';
    body.style.flex = '1';

    // Insert static sections structure
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div id="modalAppIcon" class="app-icon-box small" style="cursor:pointer;"></div>
        <input id="modalAppName" type="text"
          style="background:none;border:none;font-size:18px;font-weight:600;color:var(--text);outline:none;"
        />
      </div>

      <label>Notes</label>
      <textarea id="modalAppNotes" style="width:100%;min-height:60px;"></textarea>

      <br>

      <label>Functions</label>
      <div id="modalAppFunctions"></div>
      <button id="modalAddFunction" class="btn small" style="margin-top:6px;">+ Add Function</button>

      <br>

      <label>Integrations</label>
      <div id="modalAppIntegrations"></div>
      <button id="modalAddIntegration" class="btn small" style="margin-top:6px;">+ Add Integration</button>

      <br>

      <label>Datapoints</label>
      <div id="modalAppDatapoints"></div>
      <button id="modalAddDatapoint" class="btn small" style="margin-top:6px;">+ Add Datapoint</button>
    `;

    modal.appendChild(body);
    modalLayer.appendChild(modal);
    modalLayer.style.display = 'flex';

    //
    // CLOSE ON CLICK OUTSIDE
    //
    modalLayer.addEventListener('click', e => {
      if (e.target === modalLayer) hideModal();
    });

    //
    // CLOSE ON ESC
    //
    window.addEventListener('keydown', escCloseModal);

    //
    // Hand off to STEP B part 2 for data binding
    //
    renderModalAppData(app);
  }

  function hideModal() {
    if (modalLayer) {
      modalLayer.style.display = 'none';
      modalLayer.innerHTML = '';
    }
    window.removeEventListener('keydown', escCloseModal);
  }

  function escCloseModal(e) {
    if (e.key === 'Escape') hideModal();
  }

  //
  // expose public API
  //
  window.OL.openAppModal = openAppModal;
  window.OL.hideModal = hideModal;

})();
