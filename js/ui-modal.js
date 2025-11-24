;(() => {

  if (!window.OL) {
    console.error("ui-modal.js: OL core not present");
    return;
  }

  const OL = window.OL;

  let modalLayer = null;
  let modalContent = null;

  // =========================================================================
  // INIT (once)
  // =========================================================================
  function ensureModalLayer(){
    if (!modalLayer){
      modalLayer = document.createElement("div");
      modalLayer.id = "modal-layer";
      modalLayer.style.position = "fixed";
      modalLayer.style.inset = "0";
      modalLayer.style.background = "rgba(0,0,0,.5)";
      modalLayer.style.display = "none";
      modalLayer.style.zIndex = "999";
      modalLayer.style.backdropFilter = "blur(4px)";

      modalLayer.addEventListener("click", (e)=>{
        if (e.target === modalLayer){
          hideModal();
        }
      });

      document.body.appendChild(modalLayer);
    }
  }

  // =========================================================================
  // OPEN (with HTML string or HTMLElement)
  // =========================================================================
  function showModal(content){

    ensureModalLayer();
    modalLayer.innerHTML = "";
    modalLayer.style.display = "block";

    modalContent = document.createElement("div");
    modalContent.className = "modalPanel";
    modalContent.style.position = "absolute";
    modalContent.style.top = "50%";
    modalContent.style.left = "50%";
    modalContent.style.transform = "translate(-50%, -50%)";
    modalContent.style.background = "var(--panel)";
    modalContent.style.border = "1px solid var(--line)";
    modalContent.style.borderRadius = "12px";
    modalContent.style.padding = "16px";
    modalContent.style.maxHeight = "80vh";
    modalContent.style.overflowY = "auto";
    modalContent.style.minWidth = "400px";
    modalContent.style.maxWidth = "680px";

    if (typeof content === "string"){
      modalContent.innerHTML = content;
    } else {
      modalContent.appendChild(content);
    }

    modalLayer.appendChild(modalContent);

    window.addEventListener("keydown", escListener);
  }

  // =========================================================================
  // CLOSE
  // =========================================================================
  function hideModal(){
    if (!modalLayer) return;

    modalLayer.style.display = "none";
    modalLayer.innerHTML = "";
    modalContent = null;

    window.removeEventListener("keydown", escListener);
  }

  function escListener(e){
    if (e.key === "Escape"){
      hideModal();
    }
  }

  // =========================================================================
  // UPDATE EXISTING MODAL CONTENT
  // =========================================================================
  function replaceModalContent(html){
    if (!modalContent) return;

    modalContent.innerHTML = html;
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================
  OL.showModal         = showModal;
  OL.hideModal         = hideModal;
  OL.replaceModalContent = replaceModalContent;

})();
