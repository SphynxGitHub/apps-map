;(() => {

  if (!window.OL) {
    console.error("ui-modal.js: OL not detected");
    return;
  }

  const OL = window.OL;

  // ============================================================
  // SINGLETON modal container
  // ============================================================
  let modalLayer = null;
  let activeCloseHandler = null;

  function ensureModalLayer() {
    if (modalLayer) return modalLayer;

    modalLayer = document.getElementById("modal-layer");
    if (!modalLayer) {
      modalLayer = document.createElement("div");
      modalLayer.id = "modal-layer";
      document.body.appendChild(modalLayer);
    }

    modalLayer.style.position   = "fixed";
    modalLayer.style.inset      = "0";
    modalLayer.style.display    = "none";
    modalLayer.style.zIndex     = "999";
    modalLayer.style.background = "rgba(0,0,0,.5)";
    modalLayer.style.backdropFilter = "blur(4px)";
    modalLayer.classList.add("modalOverlay");

    return modalLayer;
  }

  // ============================================================
  // PUBLIC — open modal with HTML content
  // ============================================================
  OL.openModal = function(options = {}) {
    const width = options.width || "620px";
    const contentHTML = options.contentHTML || "";
    const onClose = options.onClose || null;

    if (!contentHTML) {
      console.warn("Blocked attempt to open modal with no content");
      return;
    }
    ensureModalLayer();
    modalLayer.innerHTML = "";

    activeCloseHandler = onClose;

    // build modal
    const modal = document.createElement("div");
    modal.className = "modalBox";
    modal.style.position       = "absolute";
    modal.style.top            = "50%";
    modal.style.left           = "50%";
    modal.style.transform      = "translate(-50%, -50%)";
    modal.style.width          = width;
    modal.style.maxHeight      = "80vh";
    modal.style.background     = "var(--panel)";
    modal.style.border         = "1px solid var(--line)";
    modal.style.borderRadius   = "14px";
    modalLayer.classList.add("modal-active");
    modal.style.flexDirection  = "column";
    modal.style.overflow       = "hidden";

    // close behavior: click outside
    modalLayer.onclick = (e) => {
      const modal = modalLayer.querySelector(".modalBox");
      if (!modal.contains(e.target)) closeModal();
    };

    // close behavior: ESC key
    window.addEventListener("keydown", escClose);

    // build scroll container
    const body = document.createElement("div");
    body.className = "modalContent";
    body.style.padding = "16px";
    body.style.overflowY = "auto";
    body.style.flex = "1";
    body.innerHTML = contentHTML;

    modal.appendChild(body);
    modalLayer.appendChild(modal);
    modalLayer.style.display = "flex";
    modalLayer.classList.add("modal-active");

    return modal;
  };

  // ============================================================
  // PUBLIC — programmatic content replacement
  // ============================================================
  OL.replaceModalContent = function(contentHTML){
    if (!modalLayer) return;
    const body = modalLayer.querySelector(".modalContent");
    if (!body) return;
    body.innerHTML = contentHTML;
  };

  // ============================================================
  // PUBLIC — close modal
  // ============================================================
  OL.closeModal = function(){
    closeModal();
  };

   function closeModal(){
    if (!modalLayer) return;
    
    modalLayer.classList.remove("modal-active");
    modalLayer.style.display = "none";
    modalLayer.innerHTML = "";
    
    activeCloseHandler = null;
    window.removeEventListener("keydown", escClose);
  
    // No global UI refresh here.
    // Individual actions (icon change, status change, etc.)
    // are responsible for calling OL.refreshAllUI() themselves.
  }

  function escClose(e){
    if (e.key === "Escape") closeModal();
  }

  // ============================================================
  // SECURITY: Ignore all clicks if icon picker is active
  // ============================================================
  document.addEventListener("click", e => {
    if (window._activeIconPicker) {
      e.stopPropagation();
      return;
    }
  });
})();
