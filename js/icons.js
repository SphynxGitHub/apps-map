;(() => {
  if (!window.OL) {
    console.error('OL core not found. Load app-core.js before icons.js');
    return;
  }

  const { utils, store, state } = window.OL;
  const { esc, buildLetterIconMeta } = utils;

  // ============================================================
  // ICON LIBRARY STORAGE (localStorage + IndexedDB)
  // ============================================================

  const ICON_LIB_KEY = 'iconLibrary';

  function seedDefaultIcons() {
    return [
      { id: 'builtin_crm',      label: 'CRM',              kind: 'emoji', emoji: '📇' },
      { id: 'builtin_sched',    label: 'Scheduling',       kind: 'emoji', emoji: '🗓' },
      { id: 'builtin_email',    label: 'Email',            kind: 'emoji', emoji: '📧' },
      { id: 'builtin_docs',     label: 'Documents',        kind: 'emoji', emoji: '📁' },
      { id: 'builtin_automation', label: 'Automation',     kind: 'emoji', emoji: '🔁' },
      { id: 'builtin_tasks',    label: 'Tasks',            kind: 'emoji', emoji: '✅' },
      { id: 'builtin_finplan',  label: 'Financial Planning', kind: 'emoji', emoji: '📊' },
      { id: 'builtin_tax',      label: 'Tax / Accounting', kind: 'emoji', emoji: '🧮' },
      { id: 'builtin_phone',    label: 'Phone / SMS',      kind: 'emoji', emoji: '📞' },
      { id: 'builtin_forms',    label: 'Forms',            kind: 'emoji', emoji: '📝' },
      { id: 'builtin_esign',    label: 'eSignature',       kind: 'emoji', emoji: '✍️' },
      { id: 'builtin_video',    label: 'Video / Meetings', kind: 'emoji', emoji: '🎥' },
      { id: 'builtin_marketing',label: 'Email Marketing',  kind: 'emoji', emoji: '📣' },
      { id: 'builtin_storage',  label: 'File Storage',     kind: 'emoji', emoji: '🗄️' },
      { id: 'builtin_other',    label: 'Other',            kind: 'emoji', emoji: '🧩' }
    ];
  }

  let iconLibrary = store.get(ICON_LIB_KEY, null);
  if (!Array.isArray(iconLibrary) || !iconLibrary.length) {
    iconLibrary = seedDefaultIcons();
    store.set(ICON_LIB_KEY, iconLibrary);
  }
  // mirror onto state for convenience
  state.iconLibrary = iconLibrary;

  function saveIconLibrary() {
    store.set(ICON_LIB_KEY, iconLibrary);
    state.iconLibrary = iconLibrary;
  }

  function findIconById(id) {
    return iconLibrary.find(i => i.id === id);
  }

  // ============================================================
  // INDEXEDDB (full-size blobs)
  // ============================================================
  let dbPromise = null;

  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('OL_ICONS', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('icons')) {
          db.createObjectStore('icons', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function saveIconBlob(id, blob) {
    getDB().then(db => {
      const tx = db.transaction('icons', 'readwrite');
      tx.objectStore('icons').put({ id, blob });
    }).catch(err => {
      console.warn('Failed to save icon blob', err);
    });
  }

  // ============================================================
  // IMAGE → THUMB (40x40) VIA CANVAS
  // ============================================================
  function fileToThumbAndBlob(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const size = 40;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, size, size);

            const scale = Math.min(size / img.width, size / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const dx = (size - w) / 2;
            const dy = (size - h) / 2;

            ctx.drawImage(img, dx, dy, w, h);
            const dataUrl = canvas.toDataURL('image/png');
            // Use the original file as "full blob"
            resolve({ thumb: dataUrl, blob: file });
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  // ============================================================
  // RENDER ICON HTML (USED BY APPS / FUNCTIONS / ETC.)
  // ============================================================
  function appIconHTML(entity) {
    const name = entity && entity.name ? entity.name : '';
    const icon = entity && entity.icon;

    // 1) icon from library
    if (icon && icon.type === 'lib' && icon.iconId) {
      const libIcon = findIconById(icon.iconId);
      if (libIcon) {
        if (libIcon.kind === 'emoji' && libIcon.emoji) {
          return `<span class="app-icon-emoji" title="${esc(libIcon.label || '')}">${esc(libIcon.emoji)}</span>`;
        }
        if (libIcon.kind === 'custom' && libIcon.thumb) {
          return `<img src="${esc(libIcon.thumb)}" alt="${esc(libIcon.label || '')}" title="${esc(libIcon.label || '')}">`;
        }
      }
    }

    // 2) direct emoji icon (legacy)
    if (icon && icon.type === 'emoji' && icon.value) {
      return `<span class="app-icon-emoji" title="${esc(name)}">${esc(icon.value)}</span>`;
    }

    // 3) direct image (legacy)
    if (icon && icon.type === 'image' && icon.value) {
      return `<img src="${esc(icon.value)}" alt="${esc(name)}" title="${esc(name)}">`;
    }

    // 4) fallback: letter icon
    const meta = buildLetterIconMeta(name || '?');
    return `
      <span class="app-icon-emoji"
            title="${esc(name || '')}"
            style="
              background:${meta.bg};
              color:${meta.fg};
              width:100%;
              height:100%;
              display:flex;
              align-items:center;
              justify-content:center;
              border-radius:10px;
              font-weight:600;
              font-size:16px;
            ">
        ${esc(meta.initials)}
      </span>
    `;
  }

  // ============================================================
  // ICON PICKER MODAL
  // ============================================================
  function openIconPicker(options) {
    const { currentIcon, onSelect, onClear } = options || {};
    let selectedId = currentIcon && currentIcon.type === 'lib' ? currentIcon.iconId : null;
    let searchTerm = '';

    window.OL.modal.open(modal => {
      modal.innerHTML = `
        <div class="app-modal-header" style="padding:10px 14px; border-bottom:1px solid var(--line);">
          <div class="row" style="align-items:center;">
            <div style="font-weight:600;">Select Icon</div>
            <div class="spacer"></div>
            ${onClear ? `<button class="btn small ghost" id="iconClearBtn">Remove Icon</button>` : ''}
          </div>
        </div>
        <div class="app-modal-body" style="padding:12px 14px; display:flex; flex-direction:column; gap:10px;">
          <input type="text" id="iconSearch" placeholder="Search icons..." />
          <div class="row" style="justify-content:space-between; align-items:center;">
            <div class="muted" style="font-size:12px;">
              Click an icon to select. Upload custom logos as PNG/JPG/SVG.
            </div>
            <div class="row" style="gap:6px;">
              <button class="btn small" id="iconUploadBtn">Upload</button>
              <input type="file" id="iconUploadInput" accept="image/*" style="display:none;">
            </div>
          </div>
          <div id="iconGrid" class="grid small-icon-grid"></div>
        </div>
      `;

      const searchInput = modal.querySelector('#iconSearch');
      const gridEl = modal.querySelector('#iconGrid');
      const uploadBtn = modal.querySelector('#iconUploadBtn');
      const uploadInput = modal.querySelector('#iconUploadInput');
      const clearBtn = modal.querySelector('#iconClearBtn');

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (typeof onClear === 'function') onClear();
          window.OL.modal.close();
        });
      }

      function matchesSearch(icon, term) {
        if (!term) return true;
        const t = term.toLowerCase();
        const label = (icon.label || '').toLowerCase();
        const emoji = (icon.emoji || '').toLowerCase();
        return label.includes(t) || emoji.includes(t);
      }

      function renderGrid() {
        gridEl.innerHTML = '';
        const term = searchTerm.trim().toLowerCase();

        iconLibrary.forEach(icon => {
          if (!matchesSearch(icon, term)) return;

          const card = document.createElement('div');
          card.className = 'app-icon-card';
          card.dataset.iconId = icon.id;

          if (icon.id === selectedId) {
            card.style.borderColor = '#1fd3bd';
            card.style.boxShadow = '0 0 0 1px #1fd3bd';
          }

          const box = document.createElement('div');
          box.className = 'app-icon-box small';

          if (icon.kind === 'emoji' && icon.emoji) {
            box.innerHTML = `<span class="app-icon-emoji" title="${esc(icon.label || '')}">${esc(icon.emoji)}</span>`;
          } else if (icon.kind === 'custom' && icon.thumb) {
            box.innerHTML = `<img src="${esc(icon.thumb)}" alt="${esc(icon.label || '')}" title="${esc(icon.label || '')}">`;
          } else {
            const meta = buildLetterIconMeta(icon.label || '');
            box.innerHTML = `
              <span class="app-icon-emoji"
                    title="${esc(icon.label || '')}"
                    style="
                      background:${meta.bg};
                      color:${meta.fg};
                      width:100%;
                      height:100%;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      border-radius:10px;
                      font-weight:600;
                      font-size:16px;
                    ">
                ${esc(meta.initials)}
              </span>
            `;
          }

          const nameEl = document.createElement('div');
          nameEl.className = 'app-icon-name';
          nameEl.textContent = icon.label || '';
          nameEl.style.display = term ? 'block' : 'none';

          card.appendChild(box);
          card.appendChild(nameEl);

          card.addEventListener('click', () => {
            selectedId = icon.id;
            if (typeof onSelect === 'function') {
              onSelect({ type: 'lib', iconId: icon.id });
            }
            window.OL.modal.close();
          });

          gridEl.appendChild(card);
        });
      }

      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value || '';
        renderGrid();
      });

      uploadBtn.addEventListener('click', () => {
        uploadInput.click();
      });

      uploadInput.addEventListener('change', async () => {
        const file = uploadInput.files && uploadInput.files[0];
        if (!file) return;

        try {
          const { thumb, blob } = await fileToThumbAndBlob(file);
          const id = 'custom_' + utils.uid();
          const label = (file.name || '').replace(/\.[^.]+$/, '');

          const iconObj = {
            id,
            label: label || 'Custom Icon',
            kind: 'custom',
            thumb
          };

          iconLibrary.push(iconObj);
          saveIconLibrary();
          saveIconBlob(id, blob);
          searchTerm = '';
          searchInput.value = '';
          renderGrid();
        } catch (e) {
          console.error('Icon upload failed', e);
          alert('Could not process that image.');
        } finally {
          uploadInput.value = '';
        }
      });

      renderGrid();
    });
  }

  // ============================================================
  // EXPORT PUBLIC ICON API
  // ============================================================
  window.OL.icons = {
    appIconHTML,
    openIconPicker,
    findIconById,
    get library() {
      return iconLibrary.slice();
    }
  };

})();
