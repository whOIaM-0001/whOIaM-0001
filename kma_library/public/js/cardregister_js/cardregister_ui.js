// cardregister_ui.js — cập nhật: Giới tính chuyển sang combobox, auto-select "Hệ" ổn định, kiểm tra email @gmail.com
(function () {
  const root = document.getElementById('section-cardregister');
  if (!root) return;

  const shell = root.closest('main') || document;
  const $ = (sel) => root.querySelector(sel) || shell.querySelector(sel);

  // Elements
  const modalEl = document.getElementById('modal-card');
  const modalFormEl = document.getElementById('modal-form-card');
  const btnModalClose = document.getElementById('modal-close-card');
  const btnModalCancel = document.getElementById('modal-cancel-card');
  const btnSave = document.getElementById('modal-save-card');

  const btnRefresh = shell.querySelector('#btn-refresh');
  const btnPrint = shell.querySelector('#btn-print');
  const btnAdd = shell.querySelector('#btn-add-card');

  const tbody = root.querySelector('#cards-table tbody');
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
  const cols = ['maSVHV', 'hoTen', 'gmail', 'ngaySinh', 'sdt', 'lop', 'gioiTinh', 'chucVu', 'he', 'ngayLamThe', 'ngayHetHanThe'];

  // Helpers
  const escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => escMap[c]); }
  function escapeAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
  function debounce(fn, t) { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), t); }; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function isEmail(s) { if (!s) return true; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s)); }
  function isGmail(s) { if (!s) return true; return /@gmail\.com$/i.test(String(s).trim()); }
  // Fallback confirm
  async function confirmDialog(title, message, okText = 'OK', cancelText = 'Hủy') {
    if (window.showConfirm) return await window.showConfirm(title, message, okText, cancelText);
    return window.confirm(`${title}\n\n${message}`);
  }
  function toYMD(d) { const dt = new Date(d); if (Number.isNaN(dt.getTime())) return ''; const m = String(dt.getMonth() + 1).padStart(2, '0'); const day = String(dt.getDate()).padStart(2, '0'); return `${dt.getFullYear()}-${m}-${day}`; }
  function todayYMD() { return toYMD(new Date()); }
  function parseYMD(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; return { y: +m[1], m: +m[2], d: +m[3] }; }
  function endDateOK(start, end) { const a = parseYMD(start), b = parseYMD(end); if (!a || !b) return false; if (b.y > a.y) return true; if (b.y < a.y) return false; if (b.m > a.m) return true; if (b.m < a.m) return false; return b.d > a.d; }
  // Chuẩn hoá so khớp tiếng Việt (bỏ dấu + lowercase + trim)
  function vnNorm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function setSelectByValueOrText(selectEl, rawText) {
    if (!selectEl) return;
    const want = vnNorm(rawText);
    // 1) thử set theo value trực tiếp
    selectEl.value = rawText;
    if (selectEl.value === rawText) return;
    // 2) khớp theo text hiển thị, không phân biệt dấu/hoa-thường
    let matched = '';
    Array.from(selectEl.options).some(opt => {
      if (vnNorm(opt.value) === want || vnNorm(opt.textContent) === want) { matched = opt.value; return true; }
      return false;
    });
    if (matched) selectEl.value = matched;
  }

  function compareByColumn(a, b, col) {
    const va = (a[col] ?? '') + ''; const vb = (b[col] ?? '') + '';
    if (col === 'ngaySinh' || col === 'ngayLamThe' || col === 'ngayHetHanThe') return va.localeCompare(vb);
    if (col === 'sdt') return digits(va).localeCompare(digits(vb), undefined, { numeric: true });
    return va.localeCompare(vb, undefined, { sensitivity: 'base' });
  }
  function applySort(rows) { if (!sortBy) return rows; const f = sortDir === 'asc' ? 1 : -1; return rows.slice().sort((a, b) => f * compareByColumn(a, b, sortBy)); }
  function applySearch(rows, q) { if (!q) return rows; q = q.trim().toLowerCase(); return rows.filter(r => cols.some(c => (r[c] ?? '').toString().toLowerCase().includes(q))); }
  function getPage(rows, page, size) { const total = rows.length; const totalPages = Math.max(1, Math.ceil(total / size)); page = Math.max(1, Math.min(page, totalPages)); const start = (page - 1) * size; return { slice: rows.slice(start, start + size), total, totalPages, page }; }

  // Menu helpers (module-scoped)
  function closeAllActionMenus() {
    const menus = Array.from(document.querySelectorAll('.action-menu'));
    menus.forEach(m => {
      if (m.__moduleRoot && m.__moduleRoot !== root) return;
      try { if (m.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }
      m.classList.remove('show'); m.style.display = 'none'; m.setAttribute('aria-hidden', 'true');
      if (m.__origParent && m.parentElement === document.body) { try { m.__origParent.appendChild(m); } catch (e) { } }
      m.style.position = ''; m.style.left = ''; m.style.top = ''; m.style.visibility = '';
    });
  }
  if (!root.__menuGlobalBound) {
    root.__menuGlobalBound = true;
    document.addEventListener('click', (ev) => {
      const t = ev.target;
      const menuEl = t.closest('.action-menu'); if (menuEl && menuEl.__moduleRoot === root) return;
      const btn = t.closest('.action-btn'); if (btn && root.contains(btn)) return;
      closeAllActionMenus();
    }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllActionMenus(); });
    window.addEventListener('resize', closeAllActionMenus);
    window.addEventListener('scroll', closeAllActionMenus, true);
  }

  function openActionMenu(menu, btn, tr) {
    const isShown = menu.classList.contains('show');
    closeAllActionMenus();
    if (isShown) return;

    menu.__moduleRoot = root;
    menu.__originRow = tr;
    if (!menu.__origParent) menu.__origParent = menu.parentElement;

    if (!menu.__boundMenu) {
      menu.addEventListener('click', async (e) => {
        e.stopPropagation();
        const t = e.target.closest('button'); if (!t) return;
        const origin = menu.__originRow; if (!origin) return;

        if (t.classList.contains('action-edit')) {
          closeAllActionMenus();
          openEditModal(origin);
          return;
        }
        if (t.classList.contains('action-delete')) {
          closeAllActionMenus();
          const id = origin.children[0].textContent.trim();
          try {
            const ok = await confirmDialog('Xác nhận xóa', `Xóa thẻ của ${id}?`, 'Xóa', 'Hủy');
            if (!ok) return;
            const res = await CardAPI.remove(id);
            if (!res?.ok) throw new Error(res?.error || 'API error');
            window.showToast?.('success', 'Đã xóa', `Đã xóa thẻ ${id}`, 2500);
            await loadAll();
          } catch (err) {
            console.error(err);
            window.showToast?.('error', 'Lỗi', 'Xóa thất bại. Xem console', 3500);
          }
          return;
        }
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

  function bindRowActions() {
    if (!tbody) return;
    tbody.querySelectorAll('.action-btn').forEach(btn => {
      btn.onclick = null;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tr = btn.closest('tr');
        const menu = tr?.querySelector('.action-menu');
        if (!menu) return;
        openActionMenu(menu, btn, tr);
      });
    });
  }

  // Modal helpers
  function openModal(title = 'Đăng ký thẻ', opts = { reset: true }) {
    if (!modalEl || !modalFormEl) return;
    if (opts.reset) {
      try {
        modalFormEl.reset();
        delete modalFormEl.dataset.editing;
        delete modalFormEl.dataset.editId;
        delete modalFormEl.dataset.originalJson;
      } catch (e) { }
    }
    // auto fill Ngày làm thẻ khi thêm mới
    if (!modalFormEl.dataset.editing) {
      const inMake = modalFormEl.elements['ngayLamThe'];
      if (inMake && !inMake.value) inMake.value = todayYMD();
    }
    const titleEl = document.getElementById('modal-title-card') || document.getElementById('modal-title');
    if (titleEl) titleEl.textContent = title;
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.style.pointerEvents = 'auto';
    setTimeout(() => modalFormEl.querySelector('input,select,textarea,button')?.focus(), 10);
  }
  function closeModal() {
    try { if (modalEl && modalEl.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }
    const idInput = modalFormEl?.elements?.['maSVHV']; idInput?.removeAttribute('readonly');
    if (modalEl) { modalEl.setAttribute('aria-hidden', 'true'); modalEl.style.pointerEvents = 'none'; }
  }
  function openEditModal(tr) {
    if (!modalFormEl || !tr) return;
    const vals = {
      maSVHV: (tr.children[0]?.textContent || '').trim(),
      hoTen: (tr.children[1]?.textContent || '').trim(),
      gmail: (tr.children[2]?.textContent || '').trim(),
      ngaySinh: (tr.children[3]?.textContent || '').trim(),
      sdt: (tr.children[4]?.textContent || '').trim(),
      lop: (tr.children[5]?.textContent || '').trim(),
      gioiTinh: (tr.children[6]?.textContent || '').trim(),
      chucVu: (tr.children[7]?.textContent || '').trim(),
      he: (tr.children[8]?.textContent || '').trim(),
      ngayLamThe: (tr.children[9]?.textContent || '').trim(),
      ngayHetHanThe: (tr.children[10]?.textContent || '').trim(),
    };
    const f = modalFormEl.elements;
    f['maSVHV'].value = vals.maSVHV;
    f['hoTen'].value = vals.hoTen;
    f['gmail'].value = vals.gmail;
    f['ngaySinh'].value = vals.ngaySinh;
    f['sdt'].value = vals.sdt;
    f['lop'].value = vals.lop;

    // Giới tính / Chức vụ / Hệ: set robust theo value hoặc text (không phân biệt dấu/hoa-thường)
    setSelectByValueOrText(f['gioiTinh'], vals.gioiTinh);
    setSelectByValueOrText(f['chucVu'], vals.chucVu);
    setSelectByValueOrText(f['he'], vals.he);

    f['ngayLamThe'].value = vals.ngayLamThe || todayYMD();
    f['ngayHetHanThe'].value = vals.ngayHetHanThe || '';

    // lock id
    f['maSVHV'].setAttribute('readonly', 'readonly');

    modalFormEl.dataset.editing = 'true';
    modalFormEl.dataset.editId = vals.maSVHV;
    modalFormEl.dataset.originalJson = JSON.stringify(vals);
    openModal('Sửa thông tin thẻ', { reset: false });
  }

  function validate(payload, isEdit = false) {
    if (!payload.maSVHV) return 'Vui lòng nhập Mã SV/HV';
    if (!payload.hoTen) return 'Vui lòng nhập Họ tên';
    if (payload.gmail && !isEmail(payload.gmail)) return 'Email không hợp lệ';
    if (payload.gmail && !isGmail(payload.gmail)) return 'Email phải là địa chỉ @gmail.com';
    if (payload.sdt && digits(payload.sdt).length < 10) return 'Số điện thoại phải có tối thiểu 10 chữ số';
    if (!payload.ngayLamThe) return 'Vui lòng chọn Ngày làm thẻ';
    if (!payload.ngayHetHanThe) return 'Vui lòng chọn Ngày hết hạn thẻ';
    if (!endDateOK(payload.ngayLamThe, payload.ngayHetHanThe)) return 'Ngày hết hạn phải sau ngày làm thẻ (năm có thể bằng hoặc lớn hơn, nhưng ngày-tháng phải lớn hơn nếu cùng năm)';
    if (!payload.gioiTinh) return 'Vui lòng chọn Giới tính';
    if (!payload.chucVu) return 'Vui lòng chọn Chức vụ';
    if (!payload.he) return 'Vui lòng chọn Hệ';
    if (isEdit && modalFormEl?.dataset?.originalJson) {
      try {
        const orig = JSON.parse(modalFormEl.dataset.originalJson);
        const same =
          payload.hoTen === orig.hoTen &&
          payload.gmail === orig.gmail &&
          (payload.ngaySinh || '') === (orig.ngaySinh || '') &&
          payload.sdt === orig.sdt &&
          payload.lop === orig.lop &&
          payload.gioiTinh === orig.gioiTinh &&
          payload.chucVu === orig.chucVu &&
          payload.he === orig.he &&
          payload.ngayLamThe === orig.ngayLamThe &&
          payload.ngayHetHanThe === orig.ngayHetHanThe;
        if (same) return 'Hãy sửa thông tin trước khi lưu';
      } catch (e) { }
    }
    return '';
  }

  // Render
  function renderRows(rows) {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="12">Không có dữ liệu</td></tr>'; return; }
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td>${esc(r.maSVHV)}</td>`,
        `<td title="${escapeAttr(r.hoTen)}">${esc(r.hoTen)}</td>`,
        `<td>${esc(r.gmail)}</td>`,
        `<td>${esc(r.ngaySinh)}</td>`,
        `<td>${esc(r.sdt)}</td>`,
        `<td>${esc(r.lop)}</td>`,
        `<td>${esc(r.gioiTinh)}</td>`,
        `<td>${esc(r.chucVu)}</td>`,
        `<td>${esc(r.he)}</td>`,
        `<td>${esc(r.ngayLamThe)}</td>`,
        `<td>${esc(r.ngayHetHanThe)}</td>`,
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
  function renderPagination(total, totalPages, page) {
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
    bindHeaderSort();
  }
  function bindHeaderSort() {
    const ths = root.querySelectorAll('#cards-table thead th[data-col]');
    ths.forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (sortBy && th.dataset.col === sortBy) th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      th.onclick = () => {
        const col = th.dataset.col;
        if (sortBy === col) sortDir = (sortDir === 'asc' ? 'desc' : 'asc');
        else { sortBy = col; sortDir = 'asc'; }
        currentPage = 1;
        updateRender();
      };
    });
  }

  // Submit
  if (modalFormEl) {
    modalFormEl.addEventListener('submit', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const f = modalFormEl.elements;
      const payload = {
        maSVHV: (f['maSVHV']?.value || '').trim(),
        hoTen: (f['hoTen']?.value || '').trim(),
        gmail: (f['gmail']?.value || '').trim(),
        ngaySinh: (f['ngaySinh']?.value || '').trim(),
        sdt: (f['sdt']?.value || '').trim(),
        lop: (f['lop']?.value || '').trim(),
        gioiTinh: (f['gioiTinh']?.value || '').trim(),
        chucVu: (f['chucVu']?.value || '').trim(),
        he: (f['he']?.value || '').trim(),
        ngayLamThe: (f['ngayLamThe']?.value || '').trim(),
        ngayHetHanThe: (f['ngayHetHanThe']?.value || '').trim(),
      };
      const isEdit = modalFormEl.dataset.editing === 'true';

      const err = validate(payload, isEdit);
      if (err) { window.showToast?.('error', 'Thiếu thông tin', err, 3500); return; }

      if (!isEdit) {
        const dup = (allRows || []).some(r => String(r.maSVHV || '').trim().toLowerCase() === payload.maSVHV.toLowerCase());
        if (dup) { window.showToast?.('error', 'Trùng mã', 'Mã SV/HV đã tồn tại', 3500); try { f['maSVHV']?.focus(); } catch (e) { } return; }
      }

      if (btnSave) { btnSave.disabled = true; btnSave.textContent = isEdit ? 'Đang lưu...' : 'Đang thêm...'; }
      try {
        let res;
        if (isEdit) res = await CardAPI.update(modalFormEl.dataset.editId, payload);
        else res = await CardAPI.create(payload);
        if (!res || res.ok === false) throw new Error(res?.error || 'API error');
        window.showToast?.('success', isEdit ? 'Cập nhật' : 'Thành công', isEdit ? 'Cập nhật thẻ thành công' : 'Đăng ký thẻ thành công', 2800);
        closeModal();
        await loadAll();
      } catch (err) {
        console.error('Save error', err);
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('đã tồn tại') || msg.includes('duplicate')) {
          window.showToast?.('error', 'Trùng mã', 'Mã SV/HV đã tồn tại', 3500);
        } else {
          window.showToast?.('error', 'Lỗi', 'Lưu thất bại. Xem console', 3500);
        }
      } finally {
        if (btnSave) { btnSave.disabled = false; btnSave.textContent = 'Lưu'; }
      }
    });
  }

  // Modal events
  function bindModalEvents() {
    if (btnModalClose) btnModalClose.onclick = closeModal;
    if (btnModalCancel) btnModalCancel.onclick = closeModal;
    if (modalEl) modalEl.onclick = (e) => { if (e.target === modalEl) closeModal(); };
  }
  bindModalEvents();

  // Export
  function toCSV(rows) { if (!rows.length) return ''; const keys = ['maSVHV', 'hoTen', 'gmail', 'ngaySinh', 'sdt', 'lop', 'gioiTinh', 'chucVu', 'he', 'ngayLamThe', 'ngayHetHanThe']; const lines = [keys.join(',')]; rows.forEach(r => lines.push(keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))); return lines.join('\n'); }
  function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000); }
  if (exportMenu) {
    exportMenu.addEventListener('click', e => e.stopPropagation());
    btnExportNodes.forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllActionMenus();
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
        const res = await CardAPI.list('');
        if (!res || !res.ok) throw new Error(res?.error || 'API error');
        const data = res.data || [];
        if (type === 'json') downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'cards.json');
        else if (type === 'csv') downloadBlob(new Blob([toCSV(data)], { type: 'text/csv;charset=utf-8;' }), 'cards.csv');
      } catch (err) { console.error(err); window.showToast?.('error', 'Export failed', 'Xem console', 3000); }
    }));
  }

  // Header buttons
  if (btnRefresh) { btnRefresh.onclick = null; btnRefresh.addEventListener('click', (e) => { e.stopPropagation(); loadAll(); }); }
  if (btnPrint) btnPrint.addEventListener('click', (e) => { e.stopPropagation(); window.print(); });
  if (btnAdd) { btnAdd.onclick = null; btnAdd.addEventListener('click', (e) => { e.stopPropagation(); openModal('Đăng ký thẻ'); }); }

  // Data load
  async function loadAll() {
    try {
      const res = await CardAPI.list('');
      if (!res || !res.ok) throw new Error(res?.error || 'No data');
      allRows = res.data || [];
      currentPage = 1;
      closeAllActionMenus();
      updateRender();
    } catch (err) {
      console.error('Load failed', err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="12">Lỗi tải dữ liệu</td></tr>';
      window.showToast?.('error', 'Lỗi tải dữ liệu', 'Xem console', 4000);
    }
  }

  // Bindings
  if (selectPageSize) selectPageSize.addEventListener('change', () => { pageSize = Number(selectPageSize.value); currentPage = 1; closeAllActionMenus(); updateRender(); });
  if (tableSearch) tableSearch.addEventListener('input', debounce(() => { currentPage = 1; closeAllActionMenus(); updateRender(); }, 200));

  // Init
  loadAll();

  // expose for debug
  window._closeCardMenus = closeAllActionMenus;
})();