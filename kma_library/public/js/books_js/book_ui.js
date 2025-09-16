// ...existing code...
// book_ui.js — consolidated, updated to use custom notifications (showToast/showConfirm)
(async function () {
  const root = document.getElementById('section-books');
  if (!root) { return; }
  const shell = root.closest('main') || document;
  const $ = sel => root.querySelector(sel) || shell.querySelector(sel);

  // Elements
  // Ưu tiên modal/form/close/cancel của Books
  const modalEl = document.getElementById('modal-book') || document.getElementById('modal');
  const modalFormEl = document.getElementById('modal-form-book') || document.getElementById('modal-form');
  const btnModalClose = document.getElementById('modal-close-book') || document.getElementById('modal-close');
  const btnModalCancel = document.getElementById('modal-cancel-book') || document.getElementById('modal-cancel');
  const btnSave = document.getElementById('modal-save-book') || document.getElementById('modal-save');
  const btnRefresh = shell.querySelector('#btn-refresh');
  const btnPrint = shell.querySelector('#btn-print');
  const btnAdd = shell.querySelector('#btn-add');
  const tbody = root.querySelector('#books-table tbody');
  const selectPageSize = shell.querySelector('#select-page-size');
  const tableSearch = shell.querySelector('#table-search') || document.getElementById('header-search');
  const paginationEl = shell.querySelector('#pagination');
  const tableInfo = shell.querySelector('#table-info');
  const exportMenu = shell.querySelector('#export-menu');
  const btnExportNodes = Array.from(shell.querySelectorAll('#btn-export, .btn-export'));

  // state
  let allRows = [];
  let pageSize = Number(selectPageSize?.value || 10);
  let currentPage = 1;
  let sortBy = null;
  let sortDir = 'asc';
  let filtered = [];
  const cols = ['maS', 'TenS', 'MaTheLoai', 'Tacgia', 'NamXB', 'MaNhaXuatBan', 'SoLuong', 'TinhTrang'];
  const DEBUG = !!window.DEBUG_BOOKS;

  // A11y: lưu focus trước khi mở modal để phục hồi khi đóng
  let lastFocus = null;

  // small helpers (ensure module safe to run standalone)
  function esc(s) { return String(s ?? '').replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c)); }
  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
  function debounce(fn, t) { let timer; return (...a) => { clearTimeout(timer); timer = setTimeout(() => fn(...a), t); }; }
  function trimOrEmpty(v) { return String(v ?? '').trim(); }
  function isFiniteInt(v) { return Number.isInteger(v) && Number.isFinite(v); }

  // Populate selects for categories and publishers used in the modal.
  async function populateSelects() {
    try {
      const API_BASE = location.origin + '/kma_library/library_api/functions/function_books/command/books';
      const DB_PATH = API_BASE + '/books_database';
      const selCat = document.getElementById('MaTheLoai');
      const selPub = document.getElementById('MaNhaXuatBan');

      const prevCat = selCat ? selCat.value : null;
      const prevPub = selPub ? selPub.value : null;

      const fetches = [];
      if (selCat) fetches.push(fetch(`${DB_PATH}/categories.php`).then(r => r.json()).catch(() => ({ ok: false })));
      else fetches.push(Promise.resolve(null));
      if (selPub) fetches.push(fetch(`${DB_PATH}/publishers.php`).then(r => r.json()).catch(() => ({ ok: false })));
      else fetches.push(Promise.resolve(null));

      const [catsRes, pubsRes] = await Promise.all(fetches);

      if (selCat && catsRes && catsRes.ok && Array.isArray(catsRes.data)) {
        selCat.innerHTML = '<option value="">-- Chọn --</option>';
        catsRes.data.forEach(row => {
          const opt = document.createElement('option');
          opt.value = row.MaTheLoai ?? '';
          opt.textContent = row.TenTheLoai ?? String(row.MaTheLoai ?? '');
          selCat.appendChild(opt);
        });
        if (prevCat) selCat.value = prevCat;
      }

      if (selPub && pubsRes && pubsRes.ok && Array.isArray(pubsRes.data)) {
        selPub.innerHTML = '<option value="">-- Chọn --</option>';
        pubsRes.data.forEach(row => {
          const opt = document.createElement('option');
          opt.value = row.MaNhaXuatBan ?? '';
          opt.textContent = row.TenNhaXuatBan ?? String(row.MaNhaXuatBan ?? '');
          selPub.appendChild(opt);
        });
        if (prevPub) selPub.value = prevPub;
      }

      return Promise.resolve();
    } catch (err) {
      console.error('populateSelects failed', err);
      return Promise.resolve();
    }
  }

  // modal helpers
  function openModal(title = 'Thêm sách mới', opts = { reset: true }) {
    if (!modalEl || !modalFormEl) return;

    // A11y: lưu focus trước khi mở và chặn focus vào nền (inert)
    try { lastFocus = document.activeElement; } catch(e){}
    const app = document.querySelector('.app');
    if (app) app.setAttribute('inert', '');

    if (opts.reset) {
      try {
        modalFormEl.reset();
        delete modalFormEl.dataset.editing;
        delete modalFormEl.dataset.editId;
        delete modalFormEl.dataset.originalJson;
      } catch (e) { }
    }
    populateSelects().catch(() => { }).then(() => {
      const titleEl = document.getElementById('modal-title-book') || document.getElementById('modal-title');
      if (titleEl) titleEl.textContent = title;
      modalEl.setAttribute('aria-hidden', 'false');
      modalEl.style.pointerEvents = 'auto';
      setTimeout(() => {
        const firstInput = modalFormEl.querySelector('input,select,textarea,button');
        if (firstInput) firstInput.focus();
      }, 10);
    });
  }

  function closeModal() {
    try {
      // A11y: blur nếu focus đang nằm trong modal trước khi aria-hidden
      if (modalEl && modalEl.contains(document.activeElement)) {
        try { document.activeElement.blur(); } catch (e) {}
      }
    } catch (e) {}

    try {
      if (modalEl) {
        modalEl.setAttribute('aria-hidden', 'true');
        modalEl.style.pointerEvents = 'none';
      }
    } catch (e) { }

    // Bỏ inert nền và phục hồi focus
    try {
      const app = document.querySelector('.app');
      if (app) app.removeAttribute('inert');
      const target = lastFocus || btnAdd || document.body;
      // Đừng focus vào <body> nếu có nút Add
      if (target && typeof target.focus === 'function' && target !== document.body) {
        target.focus();
      }
    } catch(e){}
  }

  function openEditModal(tr) {
    if (!modalFormEl || !tr) return;
    const inputs = modalFormEl.elements;
    const fields = ['maS', 'TenS', 'MaTheLoai', 'Tacgia', 'NamXB', 'MaNhaXuatBan', 'SoLuong'];

    const original = {};
    fields.forEach((f, i) => {
      const val = (tr.children[i] && tr.children[i].textContent) ? tr.children[i].textContent.trim() : '';
      original[f] = val;
      if (inputs[f]) inputs[f].value = val;
    });

    modalFormEl.dataset.editing = 'true';
    modalFormEl.dataset.editId = original.maS || '';
    // Lưu bản gốc để kiểm tra "không có thay đổi"
    modalFormEl.dataset.originalJson = JSON.stringify(original);

    // populate lại select rồi mở modal "Sửa"
    populateSelects()
      .then(() => openModal('Sửa sách', { reset: false }))
      .catch(() => openModal('Sửa sách', { reset: false }));
  }

  // build payload from form
  function getFormData() {
    if (!modalFormEl) return null;
    const f = modalFormEl.elements;
    const data = {
      maS: trimOrEmpty(f.maS?.value),
      TenS: trimOrEmpty(f.TenS?.value),
      MaTheLoai: trimOrEmpty(f.MaTheLoai?.value),
      Tacgia: trimOrEmpty(f.Tacgia?.value),
      NamXB: trimOrEmpty(f.NamXB?.value),
      MaNhaXuatBan: trimOrEmpty(f.MaNhaXuatBan?.value),
      SoLuong: (() => {
        const v = String(f.SoLuong?.value ?? '').trim();
        if (v === '') return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      })()
    };
    return data;
  }

  function validateForm(data, isEdit = false) {
    if (!data) return 'Dữ liệu trống';
    if (!data.maS) return 'Vui lòng nhập Mã sách';
    if (!data.TenS) return 'Vui lòng nhập Tên sách';
    if (!data.MaTheLoai) return 'Hãy chọn Thể loại';
    if (!data.MaNhaXuatBan) return 'Hãy chọn Nhà xuất bản';
    if (!isFiniteInt(Number(data.SoLuong)) || Number(data.SoLuong) < 0) return 'Số lượng phải là số nguyên không âm';

    if (isEdit && modalFormEl?.dataset?.originalJson) {
      try {
        const orig = JSON.parse(modalFormEl.dataset.originalJson);
        const keys = ['TenS','MaTheLoai','Tacgia','NamXB','MaNhaXuatBan','SoLuong'];
        const changed = keys.some(k => String(data[k] ?? '').trim() !== String(orig[k] ?? '').trim());
        if (!changed) return 'Hãy sửa thông tin';
      } catch(e){}
    }
    return '';
  }

  // submit handler
  async function onSubmit(e) {
    e.preventDefault(); e.stopPropagation();
    try {
      const data = getFormData();
      const isEdit = modalFormEl.dataset.editing === 'true';
      const id = modalFormEl.dataset.editId || data.maS;

      // Validate
      const msg = validateForm(data, isEdit);
      if (msg) { window.showToast?.('error', 'Thiếu thông tin', msg, 3000); return; }

      // Pre-check duplicate cho TH thêm mới
      if (!isEdit) {
        const dup = (allRows || []).some(r => String(r.maS).trim().toLowerCase() === data.maS.toLowerCase());
        if (dup) {
          window.showToast?.('error', 'Trùng mã', `Mã sách ${data.maS} đã tồn tại`, 3500);
          try { modalFormEl.elements.maS?.focus(); } catch(e){}
          return;
        }
      }

      if (btnSave) { btnSave.disabled = true; btnSave.textContent = isEdit ? 'Đang lưu...' : 'Đang thêm...'; }

      let res;
      if (isEdit) {
        res = await BookAPI.update(id, data);
      } else {
        res = await BookAPI.create(data);
      }

      // Nếu backend trả ok=false
      if (res && res.ok === false) {
        const err = res?.error || 'Lỗi API';
        window.showToast?.('error', 'Thất bại', err, 3500);
        return;
      }

      window.showToast?.('success',
        isEdit ? 'Đã cập nhật' : 'Đã thêm',
        isEdit ? `Sách ${id} đã được cập nhật` : `Sách ${data.maS} đã được thêm`,
        2500
      );
      closeModal();
      await loadAll();
    } catch (err) {
      console.error('Save failed', err);
      const msg = String(err?.message || '');
      if (/Duplicate entry/i.test(msg)) {
        window.showToast?.('error', 'Trùng mã', 'Mã sách đã tồn tại', 3500);
        try { modalFormEl.elements.maS?.focus(); } catch(e){}
      } else {
        window.showToast?.('error', 'Lỗi', 'Không thể lưu. Xem console', 4000);
      }
    } finally {
      if (btnSave) { btnSave.disabled = false; btnSave.textContent = 'Lưu'; }
    }
  }

  // Always rebind modal events after module load
  function bindModalEvents() {
    if (btnModalClose) btnModalClose.onclick = closeModal;
    if (btnModalCancel) btnModalCancel.onclick = closeModal;
    if (modalEl) modalEl.onclick = (e) => { if (e.target === modalEl) closeModal(); };
    if (modalFormEl) {
      modalFormEl.onsubmit = onSubmit; // CHẶN submit mặc định và gọi API
    }
  }
  bindModalEvents();

  // table utils: sorting/search/pagination
  function parseLeadingNumber(s) { const m = String(s || '').trim().match(/^[-+]?\d+/); return m ? parseInt(m[0], 10) : null; }
  function trailingNumber(s) { const m = String(s || '').trim().match(/(\d+)$/); return m ? parseInt(m[1], 10) : null; }
  function lastChar(s) { s = String(s || '').trim(); return s.length ? s[s.length - 1] : ''; }

  function compareByColumn(a, b, col) {
    const va = (a[col] ?? '') + ''; const vb = (b[col] ?? '') + '';
    if (col === 'maS') {
      const na = trailingNumber(va), nb = trailingNumber(vb);
      if (na !== null && nb !== null) return na - nb;
      if (na !== null) return 1;
      if (nb !== null) return -1;
      return lastChar(va).localeCompare(lastChar(vb), undefined, { sensitivity: 'base' });
    }
    if (col === 'TenS' || col === 'Tacgia' || col === 'MaTheLoai' || col === 'MaNhaXuatBan') return va.localeCompare(vb, undefined, { sensitivity: 'base', numeric: false });
    if (col === 'NamXB' || col === 'SoLuong') {
      const na = parseLeadingNumber(va), nb = parseLeadingNumber(vb);
      if (na !== null && nb !== null) return na - nb;
      if (na !== null) return -1;
      if (nb !== null) return 1;
      return va.localeCompare(vb, undefined, { sensitivity: 'base' });
    }
    return va.localeCompare(vb, undefined, { sensitivity: 'base' });
  }
  function applySort(rows) { if (!sortBy) return rows; const factor = sortDir === 'asc' ? 1 : -1; return rows.slice().sort((a, b) => factor * compareByColumn(a, b, sortBy)); }
  function applySearch(rows, q) { if (!q) return rows; q = q.trim().toLowerCase(); return rows.filter(r => cols.some(c => (r[c] ?? '').toString().toLowerCase().includes(q))); }
  function getPage(rows, page, size) { const total = rows.length; const totalPages = Math.max(1, Math.ceil(total / size)); page = Math.max(1, Math.min(page, totalPages)); const start = (page - 1) * size; return { slice: rows.slice(start, start + size), total, totalPages, page }; }

  function renderRows(rows) {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="9">Không có dữ liệu</td></tr>'; return; }
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td>${esc(r.maS)}</td>`,
        `<td title="${escapeAttr(r.TenS)}">${esc(r.TenS)}</td>`,
        `<td>${esc(r.MaTheLoai)}</td>`,
        `<td title="${escapeAttr(r.Tacgia)}">${esc(r.Tacgia)}</td>`,
        `<td>${esc(r.NamXB)}</td>`,
        `<td>${esc(r.MaNhaXuatBan)}</td>`,
        `<td>${esc(r.SoLuong)}</td>`,
        `<td>${esc(r.TinhTrang)}</td>`,
        `<td class="row-actions">
           <button class="action-btn" aria-label="more" type="button">⋮</button>
           <div class="action-menu" aria-hidden="true" style="display:none">
             <button class="action-edit" type="button">Edit</button>
             <button class="action-delete" type="button">Delete</button>
             <button class="action-details" type="button">Details</button>
           </div>
         </td>`
      ].join('');
      tbody.appendChild(tr);
    });
  }

  function renderPagination(total, totalPages, page) {
    if (!paginationEl || !tableInfo) return;
    tableInfo.textContent = `Showing ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, total)} of ${total}`;
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, Math.min(start, end - maxButtons + 1));
    const html = [];
    html.push(`<button data-action="prev" ${page === 1 ? 'disabled' : ''}>Prev</button>`);
    for (let p = start; p <= end; p++) html.push(`<button data-page="${p}" class="${p === page ? 'active' : ''}">${p}</button>`);
    html.push(`<button data-action="next" ${page === totalPages ? 'disabled' : ''}>Next</button>`);
    paginationEl.innerHTML = html.join('');
    paginationEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      const a = btn.getAttribute('data-action');
      if (a === 'prev') { currentPage = Math.max(1, currentPage - 1); updateRender(); }
      else if (a === 'next') { currentPage = Math.min(totalPages, currentPage + 1); updateRender(); }
      else { const p = Number(btn.getAttribute('data-page')); if (!isNaN(p)) { currentPage = p; updateRender(); } }
    }));
  }

  async function updateRender() {
    const q = tableSearch?.value?.trim() ?? '';
    filtered = applySearch(allRows, q);
    const sorted = applySort(filtered);
    const pag = getPage(sorted, currentPage, pageSize);
    renderRows(pag.slice);
    renderPagination(pag.total, pag.totalPages, pag.page);
    bindRowActions();
  }

  function bindHeaderSort() {
    const ths = root.querySelectorAll('#books-table thead th[data-col]');
    ths.forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (sortBy && th.dataset.col === sortBy) th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      th.onclick = () => {
        const col = th.dataset.col;
        if (sortBy === col) sortDir = (sortDir === 'asc' ? 'desc' : 'asc');
        else { sortBy = col; sortDir = 'asc'; }
        currentPage = 1;
        updateRender();
        bindHeaderSort();
      };
    });
  }

  // row actions
  function closeAllActionMenus() {
    // Quét toàn bộ action-menu trên document (vì menu đã được bưng ra body khi mở)
    document.querySelectorAll('.action-menu').forEach(m => {
      try { if (m.contains(document.activeElement)) document.activeElement.blur(); } catch (e) {}
      m.classList.remove('show');
      m.style.display = 'none';
      m.setAttribute('aria-hidden', 'true');
      // Trả về vị trí gốc trong hàng nếu đang nổi ở body
      if (m.__origParent && m.parentElement === document.body) {
        try { m.__origParent.appendChild(m); } catch (e) {}
      }
      m.style.position = '';
      m.style.left = '';
      m.style.top = '';
      m.style.visibility = '';
    });
  }

  // persistent outside-click and Escape closer
  if (!document.__booksOutsideClick) {
    document.__booksOutsideClick = (ev) => {
      const t = ev.target;
      // Nếu click KHÔNG nằm trong menu nổi và KHÔNG phải nút 3 chấm -> đóng tất cả menu
      if (!t.closest('.action-menu') && !t.closest('.action-btn')) {
        closeAllActionMenus();
      }
    };
    document.addEventListener('click', document.__booksOutsideClick);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllActionMenus(); });
  }

  function openActionMenu(menu, btn, tr) {
    closeAllActionMenus();
    menu.__originRow = tr;
    if (!menu.__origParent) menu.__origParent = menu.parentElement;
    if (!menu.__boundMenu) {
      menu.addEventListener('click', async (e) => {
        e.stopPropagation();
        const t = e.target.closest('button');
        if (!t) return;
        const origin = menu.__originRow;
        if (!origin) return;
        if (t.classList.contains('action-edit')) { closeAllActionMenus(); openEditModal(origin); return; }
        if (t.classList.contains('action-delete')) {
          closeAllActionMenus();
          const id = origin.children[0].textContent.trim();
          try {
            const ok = await window.showConfirm?.('Xác nhận xóa', `Xóa sách ${id} ?`, 'Xóa', 'Hủy');
            if (!ok) return;
            await BookAPI.remove(id);
            window.showToast?.('success', 'Đã xóa', `Đã xóa ${id}`, 2500);
            await loadAll();
          } catch (err) {
            console.error(err);
            window.showToast?.('error', 'Lỗi', 'Xóa thất bại. Xem console', 4000);
          }
          return;
        }
        if (t.classList.contains('action-details')) { closeAllActionMenus(); window.showResult?.('success', 'Chi tiết', 'Chi tiết sách: ' + origin.children[0].textContent.trim(), 'OK'); return; }
      });
      menu.__boundMenu = true;
    }

    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    menu.style.position = 'fixed';
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    menu.style.left = '0px'; menu.style.top = '0px';
    const rect = btn.getBoundingClientRect();
    const mRect = menu.getBoundingClientRect();
    const width = mRect.width;
    let left = Math.round(rect.left + rect.width / 2 - width / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + 8;
    if (top + mRect.height > window.innerHeight - 8) {
      top = rect.top - mRect.height - 8;
      if (top < 8) top = 8;
    }
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';
    menu.setAttribute('aria-hidden', 'false');
    menu.classList.add('show');
    setTimeout(() => menu.querySelector('button')?.focus(), 10);
  }

  function bindRowActions() {
    if (!tbody) return;
    // Nút 3 chấm
    tbody.querySelectorAll('.action-btn').forEach(btn => {
      btn.onclick = null;
      btn.__bound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tr = btn.closest('tr');
        const menu = tr?.querySelector('.action-menu');
        if (!menu) return;
        closeAllActionMenus();
        openActionMenu(menu, btn, tr);
      });
    });
    // ĐÃ gỡ listener riêng cho .action-edit (handler ở cấp menu đã xử lý)
  }

  // export menu
  if (exportMenu) {
    exportMenu.addEventListener('click', e => e.stopPropagation());
    btnExportNodes.forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllActionMenus();
      if (window._profileMenuRoot) window._profileMenuRoot.style.display = 'none';
      if (exportMenu.style.display === 'block') {
        try { if (exportMenu.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }
        exportMenu.style.display = 'none';
        exportMenu.setAttribute('aria-hidden', 'true');
      } else {
        exportMenu.style.display = 'block';
        exportMenu.setAttribute('aria-hidden', 'false');
        setTimeout(() => exportMenu.querySelector('button')?.focus(), 10);
      }
    }));
    exportMenu.querySelectorAll('button').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (exportMenu) { try { if (exportMenu.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { } exportMenu.style.display = 'none'; exportMenu.setAttribute('aria-hidden', 'true'); }
      const type = b.dataset.type;
      try {
        const res = await BookAPI.table();
        if (!res || !res.ok) throw new Error(res?.error || 'API error');
        const data = res.data || [];
        if (type === 'json') downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'books.json');
        else if (type === 'csv') downloadBlob(new Blob([toCSV(data)], { type: 'text/csv;charset=utf-8;' }), 'books.csv');
      } catch (err) { window.showToast?.('error', 'Export failed', 'Xem console', 3000); console.error(err); }
    }));
  }

  // header buttons
  if (btnRefresh) { btnRefresh.removeAttribute('onclick'); btnRefresh.addEventListener('click', (e) => { e.stopPropagation(); loadAll(); }); }
  if (btnPrint) btnPrint?.addEventListener('click', (e) => { e.stopPropagation(); window.print(); });
  if (btnAdd) {
    btnAdd.onclick = null;
    btnAdd.addEventListener('click', (e)=> { e.stopPropagation(); openModal('Thêm sách mới'); });
  }
  // Always rebind modal events after module load
  bindModalEvents();

  // helpers CSV/download
  function toCSV(rows) { if (!rows.length) return ''; const keys = Object.keys(rows[0]); const lines = [keys.join(',')]; rows.forEach(r => lines.push(keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))); return lines.join('\n'); }
  function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); }

  // data load
  async function loadAll() {
    try {
      const res = await BookAPI.table();
      if (!res || !res.ok) throw new Error(res?.error || 'No data');
      allRows = res.data || [];
      currentPage = 1;
      updateRender();
      bindHeaderSort();
    } catch (err) {
      console.error('Load failed', err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="8">Lỗi tải dữ liệu</td></tr>';
      window.showToast?.('error', 'Lỗi tải dữ liệu', 'Xem console', 4000);
    }
  }

  // bindings
  if (selectPageSize) selectPageSize.addEventListener('change', () => { pageSize = Number(selectPageSize.value); currentPage = 1; updateRender(); });
  if (tableSearch) tableSearch.addEventListener('input', debounce(() => { currentPage = 1; updateRender(); }, 200));

  // init
  bindHeaderSort();
  loadAll();

  // outside click to close action menus (module-safe, đảm bảo chỉ đăng ký 1 lần)
  if (!document.__booksOutsideClick) {
    document.__booksOutsideClick = (ev) => {
      const t = ev.target;
      if (!t.closest('.action-menu') && !t.closest('.action-btn')) {
        try { closeAllActionMenus(); } catch (e) { }
      }
    };
    document.addEventListener('click', document.__booksOutsideClick);
  }

  // expose minimal helpers
  window.openEditModal = openEditModal;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.closeAllActionMenus = closeAllActionMenus;

})();