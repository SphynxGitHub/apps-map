;(() => {
  // ------------------------------------------------------
  // CORE WIRING
  // ------------------------------------------------------
  const core = (window.OL = window.OL || {});
  const state = (core.state = core.state || {});

  // localStorage helper (fallback if core.store not defined)
  const store = core.store || {
    get(key, defVal) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? defVal : JSON.parse(raw);
      } catch (e) {
        console.warn('store.get failed', key, e);
        return defVal;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
        console.warn('store.set failed', key, e);
      }
    }
  };

  // utils (fallbacks if not already present)
  const utils = (core.utils = core.utils || {});
  const esc = utils.esc || (function () {
    const fn = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    utils.esc = fn;
    return fn;
  })();

  const uid = utils.uid || (function () {
    const fn = () => 'ic_' + Math.random().toString(36).slice(2, 9);
    utils.uid = fn;
    return fn;
  })();

  // Brand mint for highlight
  const BRAND_MINT = '#1fd3bd';

  // ------------------------------------------------------
  // LETTER ICON META
  // ------------------------------------------------------
  function buildLetterIconMeta(name) {
    const clean = (name || '?').trim();
    let initials = '?';
    if (clean) {
      const parts = clean.split(/\s+/);
      if (parts.length === 1) {
        initials = parts[0][0] || '?';
      } else {
        initials = (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
      }
    }
    initials = initials.toUpperCase();

    // simple deterministic color based on hash
    const palette = [
      '#1f2937', // slate
      '#111827', // near black
      '#0f172a', // deep navy
      '#1e293b', // dark blue
      '#022c22', // dark teal
      '#1f2933'  // grey blue
    ];
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash * 31 + clean.charCodeAt(i)) | 0;
    }
    const bg = palette[Math.abs(hash) % palette.length];
    const fg = '#e5f2ff';

    return { initials, bg, fg };
  }
  utils.buildLetterIconMeta = utils.buildLetterIconMeta || buildLetterIconMeta;

  // ------------------------------------------------------
  // ICON LIBRARY (METADATA + THUMBS IN LOCALSTORAGE)
  // ------------------------------------------------------
  const ICON_LIB_KEY = 'ol_icon_library_v1';

  function seedDefaultIcons() {
    return [
      { id: 'builtin_crm',        label: 'CRM',               kind: 'emoji', emoji: '📇' },
      { id: 'builtin_sched',      label: 'Scheduling',        kind: 'emoji', emoji: '🗓' },
      { id: 'builtin_email',      label: 'Email',             kind: 'emoji', emoji: '📧' },
      { id: 'builtin_docs',       label: 'Documents',         kind: 'emoji', emoji: '📁' },
      { id: 'builtin_automation', label: 'Automation',        kind: 'emoji', emoji: '🔁' },
      { id: 'builtin_tasks',      label: 'Tasks',             kind: 'emoji', emoji: '✅' },
      { id: 'builtin_finplan',    label: 'Financial Planning',kind: 'emoji', emoji: '📊' },
      { id: 'builtin_tax',        label: 'Tax / Accounting',  kind: 'emoji', emoji: '🧮' },
      { id: 'builtin_phone',      label: 'Phone / SMS',       kind: 'emoji', emoji: '📞' },
      { id: 'builtin_forms',      label: 'Forms',             kind: 'emoji', emoji: '📝' },
      { id: 'builtin_esign',      label: 'eSignature',        kind: 'emoji', emoji: '✍️' },
      { id: 'builtin_video',      label: 'Video / Meetings',  kind: 'emoji', emoji: '🎥' },
      { id: 'builtin_marketing',  label: 'Email Marketing',   kind: 'emoji', emoji: '📣' },
      { id: 'builtin_storage',    label: 'File Storage',      kind: 'emoji', emoji: '🗄️' },
      { id: 'builtin_other',      label: 'Other',             kind: 'emoji', emoji: '🧩' }
    ];
  }

  let iconLibrary = store.get(ICON_LIB_KEY, null);
  if (!Array.isArray(iconLibrary) || !iconLibrary.length) {
    iconLibrary = seedDefaultIcons();
    store.set(ICON_LIB_KEY, iconLibrary);
  }
  state.iconLibrary = iconLibrary;

  function saveIconLibrary() {
    store.set(ICON_LIB_KEY, iconLibrary);
    state.iconLibrary = iconLibrary;
  }

  function findIconById(id) {
    return iconLibrary.find((i) => i.id === id) || null;
  }

  // ------------------------------------------------------
  // INDEXEDDB FOR FULL-SIZE BLOBS
  // ------------------------------------------------------
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
    getDB()
      .then((db) => {
        const tx = db.transaction('icons', 'readwrite');
        tx.objectStore('icons').put({ id, blob });
      })
      .catch((err) => {
        console.warn('Failed to save icon blob', err);
      });
  }

  // ------------------------------------------------------
  // FILE → THUMB (40x40 PNG) + ORIGINAL BLOB
  // ------------------------------------------------------
  function fileToThumbAndBlob(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const size = 40;
            const canvas = document.createElement('canvas');
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

  // ------------------------------------------------------
  // ICON HTML RENDERING (USED EVERYWHERE)
  // entity.icon format:
  //   { type:'lib', iconId:'...' }
  //   { type:'emoji', value:'📧' }  (legacy)
  //   { type:'image', value:'https://...' } (legacy)
  // ------------------------------------------------------
  function appIconHTML(entity) {
    const name = entity && entity.name ? entity.name : '';
    const icon = entity && entity.icon;

    // 1) library icon
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

    // 2) legacy emoji
    if (icon && icon.type === 'emoji' && icon.value) {
      return `<span class="app-icon-emoji" title="${esc(name)}">${esc(icon.value)}</span>`;
    }

    // 3) legacy image URL
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

  // ------------------------------------------------------
  // ICON PICKER PANEL
  // opens near a target element
  // ------------------------------------------------------
  let activePicker = null;

  function closePicker() {
    if (activePicker && activePicker.parentNode) {
      activePicker.parentNode.removeChild(activePicker);
    }
    activePicker = null;
    document.removeEventListener('click', handleDocClick, true);
  }

  function handleDocClick(e) {
    if (!activePicker) return;
    if (!activePicker.contains(e.target)) {
      closePicker();
    }
  }

  function openPicker(anchorEl, options) {
    const { currentIcon, onSelect, onClear } = options || {};
    const currentId = currentIcon && currentIcon.type === 'lib' ? currentIcon.iconId : null;

    closePicker(); // ensure only one

    const picker = document.createElement('div');
    picker.className = 'icon-picker';
    picker.style.position = 'absolute';

    // Position under anchor
    const rect = anchorEl.getBoundingClientRect();
    picker.style.left = rect.left + 'px';
    picker.style.top = rect.bottom + 6 + 'px';

    picker.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <input type="text" class="icon-picker-search" placeholder="Search icons..." style="flex:1;">
        <button class="btn small" data-act="upload">Upload</button>
      </div>
      <div class="grid small-icon-grid" id="iconPickerGrid"></div>
      <div class="row" style="margin-top:8px;justify-content:space-between;align-items:center;font-size:11px;color:var(--muted);">
        <span>Click an icon to select.</span>
        <button class="btn small ghost" data-act="clear">Remove icon</button>
      </div>
      <input type="file" accept="image/*" style="display:none;" id="iconPickerFile">
    `;

    document.body.appendChild(picker);
    activePicker = picker;

    const searchInput = picker.querySelector('.icon-picker-search');
    const gridEl = picker.querySelector('#iconPickerGrid');
    const fileInput = picker.querySelector('#iconPickerFile');

    function matchesSearch(icon, term) {
      if (!term) return true;
      const t = term.toLowerCase();
      return (
        (icon.label || '').toLowerCase().includes(t) ||
        (icon.emoji || '').toLowerCase().includes(t)
      );
    }

    function renderGrid() {
      const term = (searchInput.value || '').trim().toLowerCase();
      gridEl.innerHTML = '';

      iconLibrary.forEach((icon) => {
        if (!matchesSearch(icon, term)) return;

        const card = document.createElement('div');
        card.className = 'app-icon-card';
        card.dataset.iconId = icon.id;

        if (icon.id === currentId) {
          card.style.borderColor = BRAND_MINT;
          card.style.boxShadow = `0 0 0 1px ${BRAND_MINT}`;
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
          if (typeof onSelect === 'function') {
            onSelect({ type: 'lib', iconId: icon.id });
          }
          closePicker();
        });

        gridEl.appendChild(card);
      });
    }

    searchInput.addEventListener('input', renderGrid);

    picker.addEventListener('click', (e) => {
      const act = e.target.getAttribute('data-act');
      if (act === 'upload') {
        fileInput.click();
      } else if (act === 'clear') {
        if (typeof onClear === 'function') onClear();
        closePicker();
      }
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const { thumb, blob } = await fileToThumbAndBlob(file);
        const id = 'custom_' + uid();
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
        searchInput.value = '';
        renderGrid();
      } catch (e) {
        console.error('Icon upload failed', e);
        alert('Could not process that image.');
      } finally {
        fileInput.value = '';
      }
    });

    document.addEventListener('click', handleDocClick, true);
    renderGrid();
  }

  // ------------------------------------------------------
  // PUBLIC ICONS API
  // ------------------------------------------------------
  core.icons = {
    appIconHTML,
    openPicker,
    findIconById,
    get library() {
      return iconLibrary.slice();
    }
  };

})();
