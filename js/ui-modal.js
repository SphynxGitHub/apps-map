;(() => {

  if (!window.OL) {
    console.error("ui-modal.js: OL core not loaded");
    return;
  }

  const OL = window.OL;

  // ============================================================
  // CREATE modal-layer if missing
  // ============================================================
  function ensureLayer() {
    let layer = document.getElementById("modal-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "modal-layer";
      document.body.appendChild(layer);
    }
    return layer;
  }

  // ============================================================
  // PUBLIC — OPEN MODAL
  // ============================================================
  OL.openModal = function(html, options = {}) {
    const layer = ensureLayer();
    layer.innerHTML = "";

    const modal = document.createElement("div");
    modal.className = "modal";

    modal.innerHTML = `
      <div class="modal-body">${html}</div>
    `;

    layer.appendChild(modal);
    layer.style.display = "flex";

    // Close on background click
    layer.onclick = (e) => {
      if (e.target === layer) OL.closeModal();
    };

    // ESC to close
    window.addEventListener("keydown", escListener);
  };

  // ============================================================
  // PUBLIC — CLOSE MODAL
  // ============================================================
  OL.closeModal = function() {
    const layer = document.getElementById("modal-layer");
    if (!layer) return;
    layer.style.display = "none";
    layer.innerHTML = "";
    window.removeEventListener("keydown", escListener);
  };

  function escListener(e){
    if (e.key === "Escape") {
      OL.closeModal();
    }
  }

})();
