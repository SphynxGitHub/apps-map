;(() => {

  if (!window.OL) {
    console.error("capabilityModal.js: OL core missing");
    return;
  }

  const OL = window.OL;
  const { esc } = OL.utils;

  // ============================================================
  // PUBLIC: OPEN CAPABILITY EDITOR
  // ============================================================
  OL.openCapabilityEditModal = function(cap) {
    ensureModalLayer();
    showCapabilityModal(cap);
  };

  let modalLayer = null;
  function ensureModalLayer() {
    modalLayer = document.getElementById("modal-layer");
    modalLayer.innerHTML = "";
    modalLayer.style.display = "flex";
  }

  function close() {
    modalLayer.style.display = "none";
    modalLayer.innerHTML = "";
  }

  // ============================================================
  // BUILD MODAL
  // ============================================================
  function showCapabilityModal(cap) {
    const appA = OL.state.apps.find(a => a.id === cap.from);
    const appB = OL.state.apps.find(a => a.id === cap.to);

    const modal = document.createElement("div");
    modal.className = "modal-window capability-modal";

    modal.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-text">${esc(appA.name)} → ${esc(appB.name)}</div>
      </div>

      <div class="modal-body capability-body">

        <label class="modal-section-label">Label</label>
        <input id="capLabel" type="text" class="std-input" value="${esc(cap.label)}">

        <label class="modal-section-label">Type</label>
        <div class="type-selector">
          <button data-t="trigger" class="type-pill">Trigger</button>
          <button data-t="action" class="type-pill">Action</button>
          <button data-t="search" class="type-pill">Search</button>
        </div>

        <label class="modal-section-label">Description</label>
        <textarea id="capDesc" class="std-textarea">${esc(cap.description || "")}</textarea>

      </div>
    `;

    modalLayer.appendChild(modal);

    modalLayer.onclick = e => { if (e.target === modalLayer) close(); };

    bind(cap);
  }

  // ============================================================
  // FIELD BINDING
  // ============================================================
  function bind(cap) {

    // label
    const lbl = document.getElementById("capLabel");
    lbl.oninput = () => {
      cap.label = lbl.value.trim();
      OL.persist();
    };

    // description
    const desc = document.getElementById("capDesc");
    desc.oninput = () => {
      cap.description = desc.value.trim();
      OL.persist();
    };

    // type
    document.querySelectorAll(".type-pill").forEach(p => {
      const t = p.dataset.t;

      if (t === cap.type) p.classList.add("active");

      p.onclick = () => {
        cap.type = t;
        OL.persist();

        document.querySelectorAll(".type-pill").forEach(x => x.classList.remove("active"));
        p.classList.add("active");
      };
    });

  }

})();
