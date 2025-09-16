// public/js/categories/category_ui.js (bản vá: SCOPED SELECTORS)
(function () {
  // SCOPED ROOT: chỉ thao tác trong module categories
  const root = document.getElementById('section-categories'); // container của module
  if (!root) { console.warn('section-categories not found'); return; }

  const $ = sel => root.querySelector(sel);
  const $$ = sel => Array.from(root.querySelectorAll(sel));

  // Elements (TẤT CẢ query trong root)
  const tbody = $('#categories-table tbody');
  const emptyBox = $('#table-empty-category');
  const selectPageSize = $('#select-page-size-category');
  const tableSearch = $('#table-search-category') || document.getElementById('header-search'); // ưu tiên search nội bảng
  const paginationEl = $('#pagination-category');
  const tableInfo = $('#table-info-category');

  // Các nút trong page-head (nằm ngoài section? vẫn lấy theo document)
  const btnRefresh = document.getElementById('btn-refresh');
  const btnPrint = document.getElementById('btn-print');
  const btnAdd = document.getElementById('btn-add-category');

  // Modal: lấy đúng ID theo categories.html
  const modalEl = document.getElementById('modal-category') || root.parentElement.querySelector('#modal-category') || root.parentElement.querySelector('#modal');
  const modalFormEl = document.getElementById('modal-form-category') || (modalEl ? modalEl.querySelector('#modal-form-category') : null) || (modalEl ? modalEl.querySelector('#modal-form') : null);
  const btnModalClose = document.getElementById('modal-close-category') || (modalEl ? modalEl.querySelector('#modal-close-category') : null) || (modalEl ? modalEl.querySelector('#modal-close') : null);
  const btnModalCancel = document.getElementById('modal-cancel-category') || (modalEl ? modalEl.querySelector('#modal-cancel-category') : null) || (modalEl ? modalEl.querySelector('#modal-cancel') : null);

  // State
  let allRows = [];
  let filtered = [];
  let pageSize = Number(selectPageSize?.value || 10);
  let currentPage = 1;
  let sortBy = null;
  let sortDir = 'asc';
  const cols = ['MaTheLoai', 'TenTheLoai'];

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function escapeAttr(s) { return String(s ?? '').replace(/"/g,'&quot;'); }
  function debounce(fn, t) { let timer; return (...a) => { clearTimeout(timer); timer = setTimeout(() => fn(...a), t); }; }

  function compareByColumn(a,b,col) {
    const va = (a[col] ?? '') + ''; const vb = (b[col] ?? '') + '';
    return va.localeCompare(vb, undefined, {sensitivity:'base', numeric:true});
  }
  function applySort(rows) { if (!sortBy) return rows; const f = (sortDir==='asc'?1:-1); return rows.slice().sort((a,b)=> f * compareByColumn(a,b,sortBy)); }
  function applySearch(rows,q) { if (!q) return rows; q = q.trim().toLowerCase(); return rows.filter(r => cols.some(c => (r[c] ?? '').toString().toLowerCase().includes(q))); }
  function getPage(rows,page,size) { const total = rows.length; const totalPages = Math.max(1, Math.ceil(total/size)); page = Math.max(1, Math.min(page,totalPages)); const start = (page-1)*size; return { slice: rows.slice(start,start+size), total, totalPages, page }; }

  function renderRows(rows) {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="3">Không có dữ liệu</td></tr>'; return; }
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(r.MaTheLoai)}</td>
        <td title="${escapeAttr(r.TenTheLoai)}">${esc(r.TenTheLoai)}</td>
        <td class="row-actions">
          <button class="action-btn" aria-label="more" type="button">⋮</button>
          <div class="action-menu" aria-hidden="true" style="display:none">
            <button class="action-edit" type="button">Edit</button>
            <button class="action-delete" type="button">Delete</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function renderPagination(total, totalPages, page) {
    if (!paginationEl || !tableInfo) return;
    const startIndex = total === 0 ? 0 : ((page-1)*pageSize + 1);
    const endIndex = Math.min(page*pageSize, total);
    tableInfo.textContent = `Showing ${startIndex} - ${endIndex} of ${total}`;

    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons/2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, Math.min(start, end - maxButtons + 1));
    const html = [];
    html.push(`<button data-action="prev" ${page===1?'disabled':''}>Prev</button>`);
    for (let p=start;p<=end;p++) html.push(`<button data-page="${p}" class="${p===page?'active':''}">${p}</button>`);
    html.push(`<button data-action="next" ${page===totalPages?'disabled':''}>Next</button>`);
    paginationEl.innerHTML = html.join('');
    paginationEl.querySelectorAll('button').forEach(btn=> btn.addEventListener('click', ()=> {
      const a = btn.getAttribute('data-action');
      if (a==='prev') { currentPage = Math.max(1,currentPage-1); updateRender(); }
      else if (a==='next') { currentPage = Math.min(totalPages,currentPage+1); updateRender(); }
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
    const ths = root.querySelectorAll('#categories-table thead th[data-col]');
    ths.forEach(th => {
      th.classList.remove('sorted-asc','sorted-desc');
      if (sortBy && th.dataset.col === sortBy) th.classList.add(sortDir==='asc'?'sorted-asc':'sorted-desc');
      th.onclick = () => {
        const col = th.dataset.col;
        if (sortBy === col) sortDir = (sortDir === 'asc' ? 'desc' : 'asc');
        else { sortBy = col; sortDir = 'asc'; }
        currentPage = 1;
        updateRender();
      };
    });
  }

  function closeAllActionMenus() {
    root.querySelectorAll('.action-menu').forEach(m => {
      try { if (m.contains(document.activeElement)) document.activeElement.blur(); } catch(e){}
      m.classList.remove('show'); m.style.display='none'; m.setAttribute('aria-hidden','true');
      if (m.__origParent && m.parentElement === document.body) { try { m.__origParent.appendChild(m); } catch(e){} }
      m.style.position=''; m.style.left=''; m.style.top='';
    });
  }

  // persistent outside-click and Escape closer
  if (!document.__categoriesOutsideClick) {
    document.__categoriesOutsideClick = (ev) => {
      const t = ev.target;
      if (!t.closest('#section-categories .action-menu') && !t.closest('#section-categories .action-btn')) {
        closeAllActionMenus();
      }
    };
    document.addEventListener('click', document.__categoriesOutsideClick);
    document.addEventListener('keydown', (e)=> { if (e.key === 'Escape') closeAllActionMenus(); });
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
            btn.onclick = null;
            btn.__bound = true;
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const tr = btn.closest('tr');
              const menu = tr.querySelector('.action-menu');
              if (!menu) return;
              closeAllActionMenus();
              openActionMenu(menu, btn, tr);
            });
          });
          // Also rebind Edit buttons inside action-menus
          tbody.querySelectorAll('.action-edit').forEach(editBtn => {
            editBtn.onclick = null;
            editBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const tr = editBtn.closest('tr');
              openEditModal(tr);
            });
          });
          if (btnAdd) {
            btnAdd.onclick = null;
            btnAdd.addEventListener('click', (e)=> { e.stopPropagation(); openModal('Thêm thể loại'); });
          }
          if (tableSearch) {
            tableSearch.oninput = null;
            tableSearch.addEventListener('input', debounce(()=> { currentPage = 1; updateRender(); }, 200));
          }
        }

    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    menu.style.position = 'fixed';
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    menu.style.left = '0px'; menu.style.top = '0px';
    const rect = btn.getBoundingClientRect();
    const mRect = menu.getBoundingClientRect();
    const width = mRect.width;
    let left = Math.round(rect.left + rect.width/2 - width/2);
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + 8;
    if (top + mRect.height > window.innerHeight - 8) { top = rect.top - mRect.height - 8; if (top < 8) top = 8; }
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';
    menu.setAttribute('aria-hidden','false');
    menu.classList.add('show');
    setTimeout(()=> menu.querySelector('button')?.focus(), 10);
  }

  function bindRowActions() {
    if (!tbody) return;
    tbody.querySelectorAll('.action-btn').forEach(btn => {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tr = btn.closest('tr');
        const menu = tr.querySelector('.action-menu');
        if (!menu) return;
        const isShown = menu.classList.contains('show');
        if (isShown) closeAllActionMenus();
        else openActionMenu(menu, btn, tr);
      });
    });
    // persistent outside-click closer (SPA-safe and module-scoped)
    if (!document.__categoriesOutsideClick) {
      document.__categoriesOutsideClick = (ev) => {
        const t = ev.target;
        if (!t.closest('#section-categories .action-menu') && !t.closest('#section-categories .action-btn')) {
          closeAllActionMenus();
        }
      };
      document.addEventListener('click', document.__categoriesOutsideClick);
      document.addEventListener('keydown', (e)=> { if (e.key === 'Escape') closeAllActionMenus(); });
    }
  }

  // Modal helpers — SỬA: dùng form trong modalEl, không đụng DOM khác
  function closeModal() {
    if (!modalEl) return;
    try { if (modalEl.contains(document.activeElement)) document.activeElement.blur(); } catch(e){}
    const idInput = modalFormEl?.elements?.['MaTheLoai'];
    idInput?.removeAttribute('readonly');
    modalEl.setAttribute('aria-hidden','true');
    modalEl.style.pointerEvents = 'none';
  }

  function openModal(title='Thêm thể loại', opts={reset:true}) {
    if (!modalEl || !modalFormEl) return;
    if (opts.reset) {
      try { modalFormEl.reset(); delete modalFormEl.dataset.editing; delete modalFormEl.dataset.editId; } catch(e){}
    }
  const titleEl = modalEl.querySelector('#modal-title-category') || modalEl.querySelector('#modal-title');
    if (titleEl) titleEl.textContent = title;
    modalEl.setAttribute('aria-hidden','false');
    modalEl.style.pointerEvents = 'auto';
    setTimeout(()=> modalFormEl?.querySelector('input')?.focus(), 10);
  }

  function openEditModal(tr) {
    if (!modalFormEl || !tr) return;
    const idVal = (tr.children[0]?.textContent || '').trim();
    const nameVal = (tr.children[1]?.textContent || '').trim();

    const idInput = modalFormEl.elements['MaTheLoai'];
    const nameInput = modalFormEl.elements['TenTheLoai'];
    if (!idInput || !nameInput) { console.error('Form inputs not found'); return; }

    idInput.value = idVal;
    nameInput.value = nameVal;

    idInput.setAttribute('readonly','readonly');
    modalFormEl.dataset.editing = 'true';
    modalFormEl.dataset.editId = idVal;

    openModal('Sửa thể loại', { reset:false });
  }

  if (modalFormEl) {
    modalFormEl.addEventListener('submit', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const MaTheLoai = (modalFormEl.elements['MaTheLoai']?.value || '').trim();
      const TenTheLoai = (modalFormEl.elements['TenTheLoai']?.value || '').trim();

      if (!MaTheLoai) { window.showToast?.('error','Lỗi','Mã thể loại bắt buộc'); return; }
      if (!TenTheLoai) { window.showToast?.('error','Lỗi','Tên thể loại bắt buộc'); return; }

      const isEdit = !!(modalFormEl.dataset.editing === 'true' || modalFormEl.dataset.editId);
      const dupId = allRows.some(r => String(r.MaTheLoai||'').trim().toLowerCase() === MaTheLoai.toLowerCase() && (!isEdit || String(r.MaTheLoai||'').trim().toLowerCase() !== (modalFormEl.dataset.editId||'').toLowerCase()));
      if (!isEdit && dupId) { window.showToast?.('error','Lỗi','Mã thể loại đã tồn tại'); return; }

      try {
        let res;
        if (isEdit) res = await CategoryAPI.update(modalFormEl.dataset.editId, { TenTheLoai });
        else res = await CategoryAPI.create({ MaTheLoai, TenTheLoai });

        if (!res?.ok) throw new Error(res?.error || 'API error');
        window.showToast?.('success', isEdit ? 'Cập nhật' : 'Thành công', isEdit ? 'Cập nhật thể loại thành công' : 'Thêm thể loại thành công', 3000);
        closeModal();
        await loadAll();
      } catch (err) {
        console.error('Save error', err);
        window.showToast?.('error','Lỗi','Lưu thất bại');
      }
    });
  }
  modalEl && modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
  btnModalClose && btnModalClose.addEventListener('click', closeModal);
  btnModalCancel && btnModalCancel.addEventListener('click', closeModal);

  // Export
  const exportMenu = document.getElementById('export-menu');
  const btnExportNodes = Array.from(document.querySelectorAll('#btn-export, .btn-export'));
  function toCSV(rows) {
    if (!rows.length) return '';
    const keys = ['MaTheLoai','TenTheLoai'];
    const lines = [keys.join(',')];
    rows.forEach(r => lines.push(keys.map(k=>`"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(',')));
    return lines.join('\n');
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 3000);
  }
  if (exportMenu) {
    exportMenu.addEventListener('click', e=> e.stopPropagation());
    btnExportNodes.forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.style.display = exportMenu.style.display === 'block' ? 'none' : 'block';
      exportMenu.setAttribute('aria-hidden', exportMenu.style.display === 'block' ? 'false' : 'true');
    }));
    exportMenu.querySelectorAll('button').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      exportMenu.style.display='none';
      exportMenu.setAttribute('aria-hidden','true');
      const type = b.dataset.type;
      try {
        const res = await CategoryAPI.list('');
        const data = res?.data || [];
        if (type === 'json') downloadBlob(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}), 'categories.json');
        else if (type === 'csv') downloadBlob(new Blob([toCSV(data)], {type:'text/csv;charset=utf-8;'}), 'categories.csv');
      } catch(err) { window.showToast?.('error','Export failed','Xem console'); console.error(err); }
    }));
  }

  // Header buttons
  btnRefresh && btnRefresh.addEventListener('click', (e)=> { e.stopPropagation(); loadAll(); });
  btnPrint && btnPrint.addEventListener('click', (e)=> { e.stopPropagation(); window.print(); });
  btnAdd && btnAdd.addEventListener('click', (e)=> { e.stopPropagation(); openModal('Thêm thể loại'); });

  // Load data
  async function loadAll() {
    try {
      const res = await CategoryAPI.list('');
      if (!res || !res.ok) throw new Error(res?.error || 'No data');
      allRows = res.data || [];
      currentPage = 1;
      updateRender();
    } catch(err) {
      console.error('Load failed', err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="3">Lỗi tải dữ liệu</td></tr>';
      window.showToast?.('error','Lỗi tải dữ liệu','Xem console',4000);
    }
  }

  // init
  bindHeaderSort();
  loadAll();
})();
