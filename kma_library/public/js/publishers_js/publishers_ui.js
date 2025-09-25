// publishers_ui.js — UI quản lý Nhà xuất bản
// - Guard module theo #section-publishers
// - Fix auto-close menu 3 chấm
// - Đổi tên hàm có prefix pub_ để tránh xung đột
(function () {
  const root = document.getElementById('section-publishers');
  if (!root) return; // Không nằm trên trang Publishers thì thoát ngay

  const shell = root.closest('main') || document;
  const $ = (sel) => root.querySelector(sel) || shell.querySelector(sel);

  // Elements
  const modalEl = document.getElementById('modal-publisher');
  const modalFormEl = document.getElementById('modal-form-publisher');
  const btnModalClose = document.getElementById('modal-close-publisher');
  const btnModalCancel = document.getElementById('modal-cancel-publisher');
  const btnSave = document.getElementById('modal-save-publisher');

  const btnRefresh = shell.querySelector('#btn-refresh');
  const btnPrint = shell.querySelector('#btn-print');
  const btnAdd = shell.querySelector('#btn-add-publisher') || shell.querySelector('#btn-add');

  const tbody = root.querySelector('#publishers-table tbody');
  const selectPageSize = shell.querySelector('#select-page-size');
  const tableSearch = shell.querySelector('#table-search') || document.getElementById('header-search');
  const paginationEl = shell.querySelector('#pagination');
  const tableInfo = shell.querySelector('#table-info');

  const exportMenu = shell.querySelector('#export-menu');
  const btnExportNodes = Array.from(shell.querySelectorAll('#btn-export, .btn-export'));

  // State
  let allRows = [];
  let pageSize = Number(selectPageSize?.value || 10);
  let currentPage = 1;
  let sortBy = null;
  let sortDir = 'asc';
  let filtered = [];
  const cols = ['MaNhaXuatBan', 'TenNhaXuatBan', 'DiaChi', 'SoDienThoai'];

  // Helpers
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
  function debounce(fn, t) { let timer; return (...a) => { clearTimeout(timer); timer = setTimeout(() => fn(...a), t); }; }

  // Fallback confirm
  async function confirmDialog(title, message, okText = 'OK', cancelText = 'Hủy') {
    if (window.showConfirm) return await window.showConfirm(title, message, okText, cancelText);
    return window.confirm(`${title}\n\n${message}`);
  }

  function compareByColumn(a, b, col) {
    const va = (a[col] ?? '') + '';
    const vb = (b[col] ?? '') + '';
    if (col === 'SoDienThoai') { const da = va.replace(/\D/g, ''); const db = vb.replace(/\D/g, ''); return da.localeCompare(db, undefined, { numeric: true }); }
    return va.localeCompare(vb, undefined, { sensitivity: 'base', numeric: false });
  }
  function pub_applySort(rows) { if (!sortBy) return rows; const f = sortDir === 'asc' ? 1 : -1; return rows.slice().sort((a, b) => f * compareByColumn(a, b, sortBy)); }
  function pub_applySearch(rows, q) { if (!q) return rows; q = q.trim().toLowerCase(); return rows.filter(r => cols.some(c => (r[c] ?? '').toString().toLowerCase().includes(q))); }
  function pub_getPage(rows, page, size) { const total = rows.length; const totalPages = Math.max(1, Math.ceil(total / size)); page = Math.max(1, Math.min(page, totalPages)); const start = (page - 1) * size; return { slice: rows.slice(start, start + size), total, totalPages, page }; }

  // Menu helpers (SCOPED to this module even when menu is moved to body)
  function pub_closeAllActionMenus() {
    const menus = Array.from(document.querySelectorAll('.action-menu'));
    menus.forEach(m => {
      if (m.__moduleRoot && m.__moduleRoot !== root) return; // chỉ đóng menu của module này
      try { if (m.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }
      m.classList.remove('show'); m.style.display = 'none'; m.setAttribute('aria-hidden', 'true');
      if (m.__origParent && m.parentElement === document.body) {
        try { m.__origParent.appendChild(m); } catch (e) { }
      }
      m.style.position = ''; m.style.left = ''; m.style.top = ''; m.style.visibility = '';
    });
  }

  // Bind one-time global closers for this module
  if (!root.__menuGlobalBound) {
    root.__menuGlobalBound = true;
    // Click ra ngoài
    document.addEventListener('click', (ev) => {
      const t = ev.target;
      const menuEl = t.closest('.action-menu');
      if (menuEl && menuEl.__moduleRoot === root) return; // click trong menu của module này => bỏ qua
      const btn = t.closest('.action-btn');
      if (btn && root.contains(btn)) return; // click chính nút => handler riêng xử lý toggle
      pub_closeAllActionMenus();
    }, true);
    // Esc, resize, scroll -> đóng
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') pub_closeAllActionMenus(); });
    window.addEventListener('resize', pub_closeAllActionMenus);
    window.addEventListener('scroll', pub_closeAllActionMenus, true);
  }

  function pub_openActionMenu(menu, btn, tr) {
    // Toggle
    const isShown = menu.classList.contains('show');
    pub_closeAllActionMenus();
    if (isShown) return;

    // Đánh dấu thuộc module này và lưu parent gốc
    menu.__moduleRoot = root;
    menu.__originRow = tr;
    if (!menu.__origParent) menu.__origParent = menu.parentElement;

    // Bind click trong menu 1 lần
    if (!menu.__boundMenu) {
      menu.addEventListener('click', async (e) => {
        e.stopPropagation();
        const t = e.target.closest('button');
        if (!t) return;
        const origin = menu.__originRow; if (!origin) return;

        if (t.classList.contains('action-edit')) {
          pub_closeAllActionMenus();
          pub_openEditModal(origin);
          return;
        }
        if (t.classList.contains('action-delete')) {
          pub_closeAllActionMenus();
          const id = origin.children[0].textContent.trim();
          try {
            const ok = await confirmDialog('Xác nhận xóa', `Xóa nhà xuất bản ${id}?`, 'Xóa', 'Hủy');
            if (!ok) return;
            const res = await PublisherAPI.remove(id);
            if (!res?.ok) throw new Error(res?.error || 'API error');
            window.showToast?.('success', 'Đã xóa', `Đã xóa ${id}`, 2500);
            await pub_loadAll();
          } catch (err) {
            console.error(err);
            window.showToast?.('error', 'Lỗi', 'Xóa thất bại. Xem console', 3500);
          }
          return;
        }
      });
      menu.__boundMenu = true;
    }

    // Chuyển menu ra body để định vị fixed
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    menu.style.position = 'fixed';
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    menu.style.left = '0px'; menu.style.top = '0px';

    const rect = btn.getBoundingClientRect();
    const mRect = menu.getBoundingClientRect();
    let left = Math.round(rect.left + rect.width / 2 - mRect.width / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - mRect.width - 8));
    let top = rect.bottom + 8;
    if (top + mRect.height > window.innerHeight - 8) { top = rect.top - mRect.height - 8; if (top < 8) top = 8; }
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';
    menu.setAttribute('aria-hidden', 'false');
    menu.classList.add('show');
    setTimeout(() => menu.querySelector('button')?.focus(), 10);
  }

  function pub_bindRowActions() {
    if (!tbody) return;
    tbody.querySelectorAll('.action-btn').forEach(btn => {
      btn.onclick = null;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tr = btn.closest('tr');
        const menu = tr?.querySelector('.action-menu');
        if (!menu) return;
        pub_openActionMenu(menu, btn, tr);
      });
    });
  }

  // Modal helpers
  function pub_openModal(title = 'Thêm nhà xuất bản', opts = { reset: true }) {
    if (!modalEl || !modalFormEl) return;
    if (opts.reset) {
      try {
        modalFormEl.reset();
        delete modalFormEl.dataset.editing;
        delete modalFormEl.dataset.editId;
        delete modalFormEl.dataset.originalJson;
      } catch (e) { }
    }
    const titleEl = document.getElementById('modal-title-publisher') || document.getElementById('modal-title');
    if (titleEl) titleEl.textContent = title;
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.style.pointerEvents = 'auto';
    setTimeout(() => modalFormEl.querySelector('input,select,textarea,button')?.focus(), 10);
  }
  function pub_closeModal() {
    try { if (modalEl && modalEl.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }
    const idInput = modalFormEl?.elements?.['MaNhaXuatBan']; idInput?.removeAttribute('readonly');
    if (modalEl) { modalEl.setAttribute('aria-hidden', 'true'); modalEl.style.pointerEvents = 'none'; }
  }
  function pub_openEditModal(tr) {
    if (!modalFormEl || !tr) return;
    const idVal = (tr.children[0]?.textContent || '').trim();
    const nameVal = (tr.children[1]?.textContent || '').trim();
    const addrVal = (tr.children[2]?.textContent || '').trim();
    const phoneVal = (tr.children[3]?.textContent || '').trim();

    const idInput = modalFormEl.elements['MaNhaXuatBan'];
    const nameInput = modalFormEl.elements['TenNhaXuatBan'];
    const addrInput = modalFormEl.elements['DiaChi'];
    const phoneInput = modalFormEl.elements['SoDienThoai'];
    if (!idInput || !nameInput || !addrInput || !phoneInput) { console.error('Form inputs not found'); return; }

    idInput.value = idVal; nameInput.value = nameVal; addrInput.value = addrVal; phoneInput.value = phoneVal;
    idInput.setAttribute('readonly', 'readonly');
    modalFormEl.dataset.editing = 'true';
    modalFormEl.dataset.editId = idVal;
    modalFormEl.dataset.originalJson = JSON.stringify({ MaNhaXuatBan: idVal, TenNhaXuatBan: nameVal, DiaChi: addrVal, SoDienThoai: phoneVal });
    pub_openModal('Sửa nhà xuất bản', { reset: false });
  }
  function pub_sanitizePhone(s) { return String(s || '').replace(/\D/g, ''); }
  function pub_validate(data, isEdit = false) {
    if (!data.MaNhaXuatBan) return 'Vui lòng nhập Mã Nhà xuất bản';
    if (!data.TenNhaXuatBan) return 'Vui lòng nhập Tên Nhà xuất bản';
    const digits = pub_sanitizePhone(data.SoDienThoai);
    if (data.SoDienThoai && digits.length < 10) return 'Số điện thoại phải có tối thiểu 10 chữ số';
    if (isEdit && modalFormEl?.dataset?.originalJson) {
      try {
        const orig = JSON.parse(modalFormEl.dataset.originalJson);
        if (
          String(data.TenNhaXuatBan ?? '').trim() === String(orig.TenNhaXuatBan ?? '').trim() &&
          String(data.DiaChi ?? '').trim() === String(orig.DiaChi ?? '').trim() &&
          pub_sanitizePhone(data.SoDienThoai) === pub_sanitizePhone(orig.SoDienThoai)
        ) return 'Hãy sửa thông tin trước khi lưu';
      } catch (e) { }
    }
    return '';
  }

  // Render functions (đặt trước loadAll để chắc chắn sẵn sàng)
  function pub_renderRows(rows) {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="5">Không có dữ liệu</td></tr>'; return; }
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td>${esc(r.MaNhaXuatBan)}</td>`,
        `<td title="${escapeAttr(r.TenNhaXuatBan)}">${esc(r.TenNhaXuatBan)}</td>`,
        `<td title="${escapeAttr(r.DiaChi)}">${esc(r.DiaChi)}</td>`,
        `<td>${esc(r.SoDienThoai)}</td>`,
        `<td class="row-actions">
           <button class="action-btn" aria-label="more" type="button">⋮</button>
           <div class="action-menu" aria-hidden="true" style="display:none">
             <button class="action-edit" type="button">Edit</button>
             <button class="action-delete" type="button">Delete</button>
           </div>
         </td>`
      ].join('');
      tbody.appendChild(tr);
    });
  }
  function pub_renderPagination(total, totalPages, page) {
    if (!paginationEl || !tableInfo) return;
    const startIndex = total === 0 ? 0 : ((page - 1) * pageSize + 1);
    const endIndex = Math.min(page * pageSize, total);
    tableInfo.textContent = `Showing ${startIndex} - ${endIndex} of ${total}`;
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, Math.min(start, end - maxButtons + 1));
    const html = [];
    html.push(`<button data-action="prev" ${page === 1 ? 'disabled' : ''}>Prev</button>`);
    for (let p = start; p <= end; p++) html.push(`<button data-page="${p}" class="${p === page ? 'active' : ''}">${p}</button>`);
    html.push(`<button data-action="next" ${page === totalPages ? 'disabled' : ''}>Next</button>`);
    paginationEl.innerHTML = html.join('');
    paginationEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.getAttribute('data-action');
        if (a === 'prev') { currentPage = Math.max(1, currentPage - 1); pub_updateRender(); }
        else if (a === 'next') { currentPage = Math.min(totalPages, currentPage + 1); pub_updateRender(); }
        else { const p = Number(btn.getAttribute('data-page')); if (!isNaN(p)) { currentPage = p; pub_updateRender(); } }
      });
    });
  }
  async function pub_updateRender() {
    const q = tableSearch?.value?.trim() ?? '';
    filtered = pub_applySearch(allRows, q);
    const sorted = pub_applySort(filtered);
    const pag = pub_getPage(sorted, currentPage, pageSize);
    pub_renderRows(pag.slice);
    pub_renderPagination(pag.total, pag.totalPages, pag.page);
    pub_bindRowActions();
    pub_bindHeaderSort();
  }
  function pub_bindHeaderSort() {
    const ths = root.querySelectorAll('#publishers-table thead th[data-col]');
    ths.forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (sortBy && th.dataset.col === sortBy) th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      th.onclick = () => {
        const col = th.dataset.col;
        if (sortBy === col) sortDir = (sortDir === 'asc' ? 'desc' : 'asc');
        else { sortBy = col; sortDir = 'asc'; }
        currentPage = 1;
        pub_updateRender();
      };
    });
  }

  // Submit
  if (modalFormEl) {
    modalFormEl.addEventListener('submit', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const MaNhaXuatBan = (modalFormEl.elements['MaNhaXuatBan']?.value || '').trim();
      const TenNhaXuatBan = (modalFormEl.elements['TenNhaXuatBan']?.value || '').trim();
      const DiaChi = (modalFormEl.elements['DiaChi']?.value || '').trim();
      const SoDienThoaiRaw = (modalFormEl.elements['SoDienThoai']?.value || '').trim();
      const SoDienThoai = SoDienThoaiRaw;
      const isEdit = modalFormEl.dataset.editing === 'true';

      const errMsg = pub_validate({ MaNhaXuatBan, TenNhaXuatBan, DiaChi, SoDienThoai }, isEdit);
      if (errMsg) { window.showToast?.('error', 'Thiếu thông tin', errMsg, 3200); return; }

      if (!isEdit) {
        const dup = (allRows || []).some(r => String(r.MaNhaXuatBan || '').trim().toLowerCase() === MaNhaXuatBan.toLowerCase());
        if (dup) { window.showToast?.('error', 'Trùng mã', 'Mã Nhà xuất bản đã tồn tại', 3500); try { modalFormEl.elements['MaNhaXuatBan']?.focus(); } catch (e) { } return; }
      }

      if (btnSave) { btnSave.disabled = true; btnSave.textContent = isEdit ? 'Đang lưu...' : 'Đang thêm...'; }
      try {
        let res;
        if (isEdit) res = await PublisherAPI.update(modalFormEl.dataset.editId, { TenNhaXuatBan, DiaChi, SoDienThoai });
        else res = await PublisherAPI.create({ MaNhaXuatBan, TenNhaXuatBan, DiaChi, SoDienThoai });
        if (!res || res.ok === false) throw new Error(res?.error || 'API error');
        window.showToast?.('success', isEdit ? 'Cập nhật' : 'Thành công', isEdit ? 'Cập nhật NXB thành công' : 'Thêm NXB thành công', 2800);
        pub_closeModal();
        await pub_loadAll();
      } catch (err) {
        console.error('Save error', err);
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('đã tồn tại') || msg.includes('duplicate')) {
          window.showToast?.('error', 'Trùng mã', 'Mã Nhà xuất bản đã tồn tại', 3500);
        } else {
          window.showToast?.('error', 'Lỗi', 'Lưu thất bại. Xem console', 3500);
        }
      } finally {
        if (btnSave) { btnSave.disabled = false; btnSave.textContent = 'Lưu'; }
      }
    });
  }

  // Modal events
  function pub_bindModalEvents() {
    if (btnModalClose) btnModalClose.onclick = pub_closeModal;
    if (btnModalCancel) btnModalCancel.onclick = pub_closeModal;
    if (modalEl) modalEl.onclick = (e) => { if (e.target === modalEl) pub_closeModal(); };
  }
  pub_bindModalEvents();

  // Export (đóng action menu trước khi mở export)
  function toCSV(rows) { if (!rows.length) return ''; const keys = ['MaNhaXuatBan', 'TenNhaXuatBan', 'DiaChi', 'SoDienThoai']; const lines = [keys.join(',')]; rows.forEach(r => lines.push(keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))); return lines.join('\n'); }
  function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000); }
  if (exportMenu) {
    exportMenu.addEventListener('click', e => e.stopPropagation());
    btnExportNodes.forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pub_closeAllActionMenus();
      if (exportMenu.style.display === 'block') {
        try { if (exportMenu.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }
        exportMenu.style.display = 'none'; exportMenu.setAttribute('aria-hidden', 'true');
      } else {
        exportMenu.style.display = 'block'; exportMenu.setAttribute('aria-hidden', 'false');
        setTimeout(() => exportMenu.querySelector('button')?.focus(), 10);
      }
    }));
    exportMenu.querySelectorAll('button').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      exportMenu.style.display = 'none'; exportMenu.setAttribute('aria-hidden', 'true');
      const type = b.dataset.type;
      try {
        const res = await PublisherAPI.list('');
        if (!res || !res.ok) throw new Error(res?.error || 'API error');
        const data = res.data || [];
        if (type === 'json') downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'publishers.json');
        else if (type === 'csv') downloadBlob(new Blob([toCSV(data)], { type: 'text/csv;charset=utf-8;' }), 'publishers.csv');
      } catch (err) { window.showToast?.('error', 'Export failed', 'Xem console'); console.error(err); }
    }));
  }

  // Header buttons
  if (btnRefresh) { btnRefresh.onclick = null; btnRefresh.addEventListener('click', (e) => { e.stopPropagation(); pub_loadAll(); }); }
  if (btnPrint) btnPrint?.addEventListener('click', (e) => { e.stopPropagation(); window.print(); });
  if (btnAdd) {
    btnAdd.onclick = null;
    btnAdd.addEventListener('click', (e) => { e.stopPropagation(); pub_openModal('Thêm nhà xuất bản'); });
  }

  // Data load
  async function pub_loadAll() {
    try {
      const res = await PublisherAPI.list('');
      if (!res || !res.ok) throw new Error(res?.error || 'No data');
      allRows = res.data || [];
      currentPage = 1;
      pub_closeAllActionMenus();
      pub_updateRender();
    } catch (err) {
      console.error('Load failed', err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="5">Lỗi tải dữ liệu</td></tr>';
      window.showToast?.('error', 'Lỗi tải dữ liệu', 'Xem console', 4000);
    }
  }

  // Bindings
  if (selectPageSize) selectPageSize.addEventListener('change', () => { pageSize = Number(selectPageSize.value); currentPage = 1; pub_closeAllActionMenus(); pub_updateRender(); });
  if (tableSearch) tableSearch.addEventListener('input', debounce(() => { currentPage = 1; pub_closeAllActionMenus(); pub_updateRender(); }, 200));

  // Init
  pub_loadAll();

  // expose minimal helper (optional for debug)
  window._closePublisherMenus = pub_closeAllActionMenus;
})();