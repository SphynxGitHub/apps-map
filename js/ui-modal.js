;(() => {

  // ============================================================
  // MODAL ROOT LAYER
  // ============================================================
  let modalLayer = null;

  function ensureModalLayer() {
    if (!modalLayer) {
      modalLayer = document.createElement('div');
      modalLayer.id = 'modal-layer';
      modalLayer.style.position = 'fixed';
      modalLayer.style.inset = '0';
      modalLayer.style.zIndex = '2000';
      modalLayer.style.display = 'none';
      document.body.appendChild(modalLayer);
    }
  }

  ensureModalLayer();

  // ============================================================
  // MODAL STATE
  // ============================================================
  let activeModal = null;
  let closeGuard = false;

  // ============================================================
  // HARD CLOSE (force)
  // ============================================================
  function _destroyModal() {
    if (activeModal && activeModal.parentNode) {
      activeModal.parentNode.removeChild(activeModal);
    }
    activeModal = null;
    modalLayer.style.display = 'none';
    document.body.classList.remove('has-modal');
  }

  // ============================================================
  // PUBLIC CLOSE (with safety & animation)
  // ============================================================
  function close() {
    if (closeGuard) return;
    if (!activeModal) return;
    const m = activeModal;
    activeModal = null;

    // fade out
    m.style.opacity = '0';
    modalLayer.style.background = 'rgba(0,0,0,0)';

    setTimeout(() => {
      _destroyModal();
    }, 180);
  }

  // ============================================================
  // PUBLIC OPEN
  // ============================================================
  function open(renderFn, opts={}) {
    close(); // close existing if any  
    ensureModalLayer();

    // Create modal wrapper
    const modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.style.opacity = '0';
    modal.style.transform = 'scale(.96)';
    modal.style.transition = 'opacity .18s ease, transform .18s ease';
    modal.style.willChange = 'opacity, transform';

    activeModal = modal;

    modalLayer.innerHTML = '';
    modalLayer.appendChild(modal);

    // initial overlay style
    modalLayer.style.background = 'rgba(0,0,0,0)';
    modalLayer.style.display = 'block';
    document.body.classList.add('has-modal');

    // RUN CONTENT RENDER FN
    try {
      renderFn(modal);
    } catch (e) {
      console.error('modal render failed', e);
    }

    // fade in
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.style.transform = 'scale(1)';
      modalLayer.style.background = 'rgba(0,0,0,.55)';
    });
  }

  // ============================================================
  // CLICK OUTSIDE TO CLOSE
  // ============================================================
  modalLayer.addEventListener('mousedown', (e) => {
    if (!activeModal) return;
    if (modalLayer && e.target === modalLayer) {
      close();
    }
  });

  // ============================================================
  // ESC CLOSE
  // ============================================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeModal) {
      close();
    }
  });

  // ============================================================
  // OPTIONAL: GUARD BLOCK
  // Prevent closure during critical transitions
  // ============================================================
  function setGuard(v) {
    closeGuard = !!v;
  }

  // ============================================================
  // Export on global OL namespace
  // ============================================================
  window.OL.modal = { open, close, setGuard };

})();
