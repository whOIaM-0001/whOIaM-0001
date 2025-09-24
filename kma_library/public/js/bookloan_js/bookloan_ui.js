// bookloan_ui.js — thêm nút "Trả sách"; giữ picker 7 dòng + sort + scroll ngang; fix close/hủy modal
(function(){
  const root = document.getElementById('section-bookloan');
  if (!root) return;

  const shell = root.closest('main') || document;
  const $ = (sel) => root.querySelector(sel) || shell.querySelector(sel);

  // Elements (main)
  const modalEl = document.getElementById('modal-loan');
  const modalFormEl = document.getElementById('modal-form-loan');
  const btnModalClose = document.getElementById('modal-close-loan');
  const btnModalCancel = document.getElementById('modal-cancel-loan');
  const btnSave = document.getElementById('modal-save-loan');

  const btnRefresh = shell.querySelector('#btn-refresh');
  const btnPrint = shell.querySelector('#btn-print');
  const btnAdd = shell.querySelector('#btn-add-loan');

  const tbody = root.querySelector('#bookloan-table tbody');
  const selectPageSize = shell.querySelector('#select-page-size');
  const tableSearch = shell.querySelector('#table-search') || document.getElementById('header-search');
  const paginationEl = shell.querySelector('#pagination');
  const tableInfo = shell.querySelector('#table-info');

  const exportMenu = shell.querySelector('#export-menu');
  const btnExportNodes = Array.from(shell.querySelectorAll('#btn-export, .btn-export'));

  // Picker
  const bookSearch = document.getElementById('book-search');
  const bookPickTable = document.getElementById('books-pick-table');
  const bookPickBody = bookPickTable?.querySelector('tbody');
  const bookPickEmpty = document.getElementById('books-pick-empty');
  const bookPickPagination = document.getElementById('books-pick-pagination');

  // State (main)
  let allRows = [];
  let pageSize = Number(selectPageSize?.value || 10);
  let currentPage = 1;
  let sortBy = null;
  let sortDir = 'asc';
  let filtered = [];
  const cols = ['MaPhieuMuon','MaSach','MaBanDoc','SoLuongMuon','NgayMuon','NgayTra','TinhTrang','NgayQuaHan'];

  // State (picker)
  let bookList = []; // {maS, TenS}
  let pickPageSize = 7;
  let pickCurrentPage = 1;
  let pickSortBy = 'maS';
  let pickSortDir = 'asc';
  let pickFiltered = [];

  // Helpers
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return String(s ?? '').replace(/"/g,'&quot;'); }
  function debounce(fn,t){ let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a),t); }; }
  function toYMD(d){ const dt=new Date(d); if(Number.isNaN(dt.getTime())) return ''; const m=String(dt.getMonth()+1).padStart(2,'0'); const day=String(dt.getDate()).padStart(2,'0'); return `${dt.getFullYear()}-${m}-${day}`; }
  function todayYMD(){ return toYMD(new Date()); }
  function parseYMD(s){ const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return null; return { y:+m[1], m:+m[2], d:+m[3] }; }
  function addMonths(ymd, months){ const p=parseYMD(ymd); if(!p) return ''; const d=new Date(p.y, p.m-1, p.d); d.setMonth(d.getMonth()+months); return toYMD(d); }
  function cmpDate(a,b){ return a.localeCompare(b); }
  function computeStatus(today, due){
    if (!due) return { status:'', overdue:0 };
    if (cmpDate(today, due) < 0) return { status:'Đang mượn', overdue:0 };
    if (cmpDate(today, due) === 0) return { status:'Đến hẹn trả', overdue:0 };
    const t = parseYMD(today), d = parseYMD(due);
    const start = new Date(d.y, d.m-1, d.d);
    const end = new Date(t.y, t.m-1, t.d);
    const ms = end - start;
    const days = Math.max(1, Math.round(ms/86400000));
    return { status:'Quá hạn', overdue:days };
  }

  // Sort/Search/Paginate (main)
  function compareByColumn(a,b,col){
    const va = (a[col] ?? '') + '';
    const vb = (b[col] ?? '') + '';
    if (col==='NgayMuon' || col==='NgayTra') return va.localeCompare(vb);
    if (col==='SoLuongMuon' || col==='NgayQuaHan') return (parseInt(va||'0',10) - parseInt(vb||'0',10));
    return va.localeCompare(vb, undefined, { sensitivity:'base' });
  }
  function applySort(rows){ if(!sortBy) return rows; const f = (sortDir==='asc'?1:-1); return rows.slice().sort((a,b)=> f*compareByColumn(a,b,sortBy)); }
  function applySearch(rows,q){ if(!q) return rows; q=q.trim().toLowerCase(); return rows.filter(r => cols.some(c => (r[c] ?? '').toString().toLowerCase().includes(q))); }
  function getPage(rows,page,size){ const total=rows.length; const totalPages=Math.max(1, Math.ceil(total/size)); page=Math.max(1, Math.min(page,totalPages)); const start=(page-1)*size; return { slice: rows.slice(start, start+size), total, totalPages, page }; }

  // Sort/Search/Paginate (picker)
  function pickCompare(a,b,col){ const va=(a[col]??'')+''; const vb=(b[col]??'')+''; return va.localeCompare(vb, undefined, {sensitivity:'base'}); }
  function pickApplySort(rows){ if(!pickSortBy) return rows; const f=(pickSortDir==='asc'?1:-1); return rows.slice().sort((a,b)=> f*pickCompare(a,b,pickSortBy)); }
  function pickApplySearch(rows,q){ if(!q) return rows; q=q.trim().toLowerCase(); return rows.filter(r => String(r.maS||'').toLowerCase().includes(q) || String(r.TenS||'').toLowerCase().includes(q)); }
  function pickGetPage(rows,page,size){ const total=rows.length; const totalPages=Math.max(1, Math.ceil(total/size)); page=Math.max(1, Math.min(page,totalPages)); const start=(page-1)*size; return { slice: rows.slice(start, start+size), total, totalPages, page }; }

  // Menu helpers
  function closeAllActionMenus(){
    const menus = Array.from(document.querySelectorAll('.action-menu'));
    menus.forEach(m=>{
      if (m.__moduleRoot && m.__moduleRoot !== root) return;
      try { if (m.contains(document.activeElement)) document.activeElement.blur(); } catch(e){}
      m.classList.remove('show'); m.style.display='none'; m.setAttribute('aria-hidden','true');
      if (m.__origParent && m.parentElement===document.body){ try { m.__origParent.appendChild(m); } catch(e){} }
      m.style.position=''; m.style.left=''; m.style.top=''; m.style.visibility='';
    });
  }
  if (!root.__menuGlobalBound){
    root.__menuGlobalBound = true;
    document.addEventListener('click',(ev)=>{
      const t=ev.target;
      const menuEl=t.closest('.action-menu'); if (menuEl && menuEl.__moduleRoot===root) return;
      const btn=t.closest('button.action-btn'); if (btn && root.contains(btn)) return;
      closeAllActionMenus();
    }, true);
    document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeAllActionMenus(); });
    window.addEventListener('resize', closeAllActionMenus);
    window.addEventListener('scroll', closeAllActionMenus, true);
  }

  function openActionMenu(menu, btn, tr){
    const isShown = menu.classList.contains('show');
    closeAllActionMenus();
    if (isShown) return;

    menu.__moduleRoot = root;
    menu.__originRow = tr;
    if (!menu.__origParent) menu.__origParent = menu.parentElement;

    if (!menu.__boundMenu){
      menu.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const t=e.target.closest('button'); if(!t) return;
        const origin=menu.__originRow; if(!origin) return;

        const id = origin.children[0]?.textContent?.trim();

        if (t.classList.contains('action-edit')) { closeAllActionMenus(); openEditModal(origin); return; }

        if (t.classList.contains('action-return')) {
          closeAllActionMenus();
          if (!id) return;
          const statusTxt = origin.children[6]?.textContent?.trim() || '';
          if (statusTxt === 'Đã trả') { window.showToast?.('info','Trả sách','Phiếu này đã trả rồi',1800); return; }
          try {
            const ok = await window.showConfirm?.('Trả sách', `Xác nhận trả sách cho phiếu ${id}?`, 'Trả', 'Hủy');
            if (!ok) return;
            const res = await LoanAPI.markReturned(id);
            if (!res?.ok) throw new Error(res?.error||'API error');
            window.showToast?.('success','Đã trả','Hoàn kho thành công',2200);
            await loadAll();
          } catch(err) {
            window.showToast?.('error','Lỗi', String(err?.message||'Không thể trả'), 3200);
          }
          return;
        }

        if (t.classList.contains('action-delete')) {
          closeAllActionMenus();
          if (!id) return;
          try{
            const ok = await window.showConfirm?.('Xóa phiếu', `Xóa phiếu ${id}?`, 'Xóa', 'Hủy');
            if (!ok) return;
            const res = await LoanAPI.remove(id);
            if (!res?.ok) throw new Error(res?.error || 'API error');
            window.showToast?.('success','Đã xóa',`Đã xóa phiếu ${id}`,2500);
            await loadAll();
          }catch(err){
            window.showToast?.('error','Lỗi','Xóa thất bại. ' + (err?.message || 'Xem console'),3500);
          }
          return;
        }
      });
      menu.__boundMenu = true;
    }

    if (menu.parentElement!==document.body) document.body.appendChild(menu);
    menu.style.position='fixed';
    menu.style.display='block';
    menu.style.visibility='hidden';
    menu.style.left='0px'; menu.style.top='0px';

    const rect=btn.getBoundingClientRect();
    const mRect=menu.getBoundingClientRect();
    let left=Math.round(rect.left + rect.width/2 - mRect.width/2);
    left=Math.max(8, Math.min(left, window.innerWidth - mRect.width - 8));
    let top=rect.bottom+8;
    if (top + mRect.height > window.innerHeight - 8){ top=rect.top - mRect.height - 8; if (top<8) top=8; }
    menu.style.left = left+'px';
    menu.style.top  = top+'px';
    menu.style.visibility='visible';
    menu.setAttribute('aria-hidden','false');
    menu.classList.add('show');
    setTimeout(()=> menu.querySelector('button')?.focus(), 10);
  }

  function bindRowActions(){
    if (!tbody) return;
    tbody.querySelectorAll('.action-btn').forEach(btn=>{
      btn.onclick=null;
      btn.addEventListener('click',(e)=>{
        e.stopPropagation();
        const tr=btn.closest('tr');
        const menu=tr?.querySelector('.action-menu');
        if (!menu) return;
        openActionMenu(menu, btn, tr);
      });
    });
  }

  // Render (main)
  function renderRows(rows){
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="9">Không có dữ liệu</td></tr>'; return; }
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td>${esc(r.MaPhieuMuon)}</td>`,
        `<td>${esc(r.MaSach)}</td>`,
        `<td>${esc(r.MaBanDoc)}</td>`,
        `<td>${esc(r.SoLuongMuon)}</td>`,
        `<td>${esc(r.NgayMuon)}</td>`,
        `<td>${esc(r.NgayTra)}</td>`,
        `<td>${esc(r.TinhTrang)}</td>`,
        `<td>${esc(r.NgayQuaHan)}</td>`,
        `<td class="row-actions">
          <button class="action-btn" aria-label="more" type="button">⋮</button>
          <div class="action-menu" aria-hidden="true" style="display:none">
            <button class="action-edit" type="button">Edit</button>
            <button class="action-return" type="button">Trả sách</button>
            <button class="action-delete" type="button">Delete</button>
          </div>
        </td>`
      ].join('');
      tbody.appendChild(tr);
    });
  }
  function renderPagination(total, totalPages, page){
    if (!paginationEl || !tableInfo) return;
    const startIndex = total===0 ? 0 : ((page-1)*pageSize+1);
    const endIndex = Math.min(page*pageSize, total);
    tableInfo.textContent = `Showing ${startIndex} - ${endIndex} of ${total}`;
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons/2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, Math.min(start, end - maxButtons + 1));
    const html = [];
    html.push(`<button data-action="prev" ${page===1?'disabled':''}>Prev</button>`);
    for (let p=start; p<=end; p++) html.push(`<button data-page="${p}" class="${p===page?'active':''}">${p}</button>`);
    html.push(`<button data-action="next" ${page===totalPages?'disabled':''}>Next</button>`);
    paginationEl.innerHTML = html.join('');
    paginationEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', ()=>{
      const a=btn.getAttribute('data-action');
      if (a==='prev'){ currentPage = Math.max(1,currentPage-1); updateRender(); }
      else if (a==='next'){ currentPage = Math.min(totalPages,currentPage+1); updateRender(); }
      else { const p = Number(btn.getAttribute('data-page')); if(!isNaN(p)) { currentPage = p; updateRender(); } }
    }));
  }
  async function updateRender(){
    const q = tableSearch?.value?.trim() ?? '';
    filtered = applySearch(allRows, q);
    const sorted = applySort(filtered);
    const pag = getPage(sorted, currentPage, pageSize);
    renderRows(pag.slice);
    renderPagination(pag.total, pag.totalPages, pag.page);
    bindRowActions();
    bindHeaderSort();
  }
  function bindHeaderSort(){
    const ths = root.querySelectorAll('#bookloan-table thead th[data-col]');
    ths.forEach(th=>{
      th.classList.remove('sorted-asc','sorted-desc');
      if (sortBy && th.dataset.col===sortBy) th.classList.add(sortDir==='asc'?'sorted-asc':'sorted-desc');
      th.onclick = ()=>{
        const col = th.dataset.col;
        if (sortBy===col) sortDir = (sortDir==='asc'?'desc':'asc');
        else { sortBy=col; sortDir='asc'; }
        currentPage=1;
        updateRender();
      };
    });
  }

  // Modal open/close
  function openModal(title='Lập phiếu mượn', opts={reset:true}){
    if (!modalEl || !modalFormEl) return;
    if (opts.reset){
      try{
        modalFormEl.reset();
        delete modalFormEl.dataset.editing;
        delete modalFormEl.dataset.editId;
        delete modalFormEl.dataset.originalJson;
      }catch(e){}
    }
    const f = modalFormEl.elements;
    if (!modalFormEl.dataset.editing){
      if (f['NgayMuon'] && !f['NgayMuon'].value) f['NgayMuon'].value = todayYMD();
    }
    syncDueDateLimit();
    updateStatusPreview();

    const titleEl = document.getElementById('modal-title-loan') || document.getElementById('modal-title');
    if (titleEl) titleEl.textContent = title;
    modalEl.setAttribute('aria-hidden','false');
    modalEl.style.pointerEvents='auto';
    setTimeout(()=> modalFormEl.querySelector('input,select,textarea,button')?.focus(), 10);
  }
  function closeModal(){
    try { if (modalEl && modalEl.contains(document.activeElement)) document.activeElement.blur(); } catch(e){}
    const idInput = modalFormEl?.elements?.['MaPhieuMuon']; idInput?.removeAttribute('readonly');
    if (modalEl) { modalEl.setAttribute('aria-hidden','true'); modalEl.style.pointerEvents='none'; }
  }
  function bindModalEvents(){
    if (!modalEl) return;
    if (!bindModalEvents.bound){
      btnModalClose?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); closeModal(); });
      btnModalCancel?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); closeModal(); });
      modalEl.addEventListener('click', (e)=> { if (e.target === modalEl) closeModal(); });
      bindModalEvents.bound = true;
    }
  }
  bindModalEvents();

  async function openEditModal(tr){
    if (!modalFormEl || !tr) return;
    const vals = {
      MaPhieuMuon: (tr.children[0]?.textContent||'').trim(),
      MaSach: (tr.children[1]?.textContent||'').trim(),
      MaBanDoc: (tr.children[2]?.textContent||'').trim(),
      SoLuongMuon: (tr.children[3]?.textContent||'').trim(),
      NgayMuon: (tr.children[4]?.textContent||'').trim(),
      NgayTra: (tr.children[5]?.textContent||'').trim(),
    };
    const f = modalFormEl.elements;
    f['MaPhieuMuon'].value = vals.MaPhieuMuon;
    f['MaSach'].value = vals.MaSach;
    f['MaBanDoc'].value = vals.MaBanDoc;
    f['SoLuongMuon'].value = vals.SoLuongMuon || '1';
    f['NgayMuon'].value = vals.NgayMuon || todayYMD();
    f['NgayTra'].value = vals.NgayTra || '';
    f['MaPhieuMuon'].setAttribute('readonly','readonly');

    modalFormEl.dataset.editing = 'true';
    modalFormEl.dataset.editId = vals.MaPhieuMuon;
    modalFormEl.dataset.originalJson = JSON.stringify(vals);

    syncDueDateLimit();
    updateStatusPreview();

    // Load picker trước khi show
    await loadBooksForPicker();
    openModal('Sửa phiếu mượn', { reset:false });
  }

  function syncDueDateLimit(){
    const f = modalFormEl?.elements; if (!f) return;
    const nm = f['NgayMuon']?.value || todayYMD();
    const max = addMonths(nm, 6);
    if (f['NgayTra']) {
      f['NgayTra'].setAttribute('min', nm);
      if (max) f['NgayTra'].setAttribute('max', max);
      if (f['NgayTra'].value && f['NgayTra'].value > max) f['NgayTra'].value = max;
      if (f['NgayTra'].value && f['NgayTra'].value < nm) f['NgayTra'].value = nm;
    }
  }
  function updateStatusPreview(){
    const f = modalFormEl?.elements; if (!f) return;
    const today = todayYMD();
    const due = f['NgayTra']?.value || '';
    const prev = document.getElementById('TinhTrangPreview');
    const res = computeStatus(today, due);
    if (prev) prev.value = (due ? res.status : '');
  }

  // Picker render
  function pickRenderRows(rows){
    if (!bookPickBody) return;
    bookPickBody.innerHTML = '';
    if (!rows.length) {
      if (bookPickEmpty) bookPickEmpty.hidden = false;
      return;
    }
    if (bookPickEmpty) bookPickEmpty.hidden = true;
    rows.forEach(b=>{
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `<td>${esc(b.maS)}</td><td title="${escapeAttr(b.TenS)}">${esc(b.TenS)}</td>`;
      tr.addEventListener('click', ()=>{
        const inMa = modalFormEl?.elements?.['MaSach'];
        if (inMa) inMa.value = String(b.maS || '').trim();
        window.showToast?.('success','Đã chọn sách', `${b.maS} - ${b.TenS}`, 1500);
      });
      bookPickBody.appendChild(tr);
    });
  }
  function pickRenderHeaderSort(){
    const ths = bookPickTable?.querySelectorAll('thead th[data-col]') || [];
    ths.forEach(th=>{
      th.classList.remove('sorted-asc','sorted-desc');
      if (pickSortBy && th.dataset.col===pickSortBy) th.classList.add(pickSortDir==='asc'?'sorted-asc':'sorted-desc');
      th.onclick = ()=>{
        const col = th.dataset.col;
        if (pickSortBy===col) pickSortDir = (pickSortDir==='asc'?'desc':'asc');
        else { pickSortBy=col; pickSortDir='asc'; }
        pickCurrentPage = 1;
        pickUpdateRender();
      };
    });
  }
  function pickRenderPagination(total, totalPages, page){
    if (!bookPickPagination) return;
    const html = [];
    html.push(`<button data-action="prev" ${page===1?'disabled':''}>Prev</button>`);
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons/2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, Math.min(start, end - maxButtons + 1));
    for (let p=start; p<=end; p++) html.push(`<button data-page="${p}" class="${p===page?'active':''}">${p}</button>`);
    html.push(`<button data-action="next" ${page===totalPages?'disabled':''}>Next</button>`);
    bookPickPagination.innerHTML = html.join('');
    Array.from(bookPickPagination.querySelectorAll('button')).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const a = btn.getAttribute('data-action');
        if (a==='prev') { pickCurrentPage = Math.max(1, pickCurrentPage-1); pickUpdateRender(); }
        else if (a==='next') { const last = Math.ceil((pickFiltered.length||1)/pickPageSize); pickCurrentPage = Math.min(last, pickCurrentPage+1); pickUpdateRender(); }
        else { const p = Number(btn.getAttribute('data-page')); if (!isNaN(p)) { pickCurrentPage = p; pickUpdateRender(); } }
      });
    });
  }
  function pickUpdateRender(){
    const q = bookSearch?.value?.trim() ?? '';
    pickFiltered = pickApplySearch(bookList, q);
    const sorted = pickApplySort(pickFiltered);
    const pag = pickGetPage(sorted, pickCurrentPage, pickPageSize);
    pickRenderRows(pag.slice);
    pickRenderHeaderSort();
    pickRenderPagination(pag.total, pag.totalPages, pag.page);
  }

  async function loadBooksForPicker(){
    try{
      const res = await (window.BookAPI?.table?.() ?? Promise.reject(new Error('BookAPI not found')));
      if (!res || !res.ok) throw new Error(res?.error || 'API error');
      bookList = (res.data||[]).map(r => ({ maS: r.maS, TenS: r.TenS }));
    }catch(err){
      console.warn('Load books for picker failed', err);
      bookList = [];
    }
    pickCurrentPage = 1;
    pickUpdateRender();
  }

  // Validate + payload
  async function validateAndBuildPayload(){
    const f = modalFormEl.elements;
    const payload = {
      MaPhieuMuon: (f['MaPhieuMuon']?.value||'').trim(),
      MaSach: (f['MaSach']?.value||'').trim(),
      MaBanDoc: (f['MaBanDoc']?.value||'').trim(),
      SoLuongMuon: parseInt((f['SoLuongMuon']?.value||'1'), 10) || 1,
      NgayMuon: (f['NgayMuon']?.value||'').trim() || todayYMD(),
      NgayTra: (f['NgayTra']?.value||'').trim()
    };
    if (!payload.MaPhieuMuon) return { error: 'Vui lòng nhập Mã phiếu mượn' };
    if (!payload.MaSach) return { error: 'Vui lòng nhập Mã sách' };
    if (!payload.MaBanDoc) return { error: 'Vui lòng nhập Mã bạn đọc' };
    if (!payload.NgayTra) return { error: 'Vui lòng chọn Ngày hẹn trả' };
    if (payload.SoLuongMuon < 1 || payload.SoLuongMuon > 5) return { error: 'Số lượng mượn phải từ 1 đến 5' };
    const maxDue = addMonths(payload.NgayMuon, 6);
    if (payload.NgayTra > maxDue) return { error: 'Ngày hẹn trả không được quá 6 tháng kể từ ngày mượn' };
    if (payload.NgayTra < payload.NgayMuon) return { error: 'Ngày hẹn trả không được trước ngày mượn' };
    const st = computeStatus(todayYMD(), payload.NgayTra);
    payload.TinhTrang = st.status;
    payload.NgayQuaHan = st.overdue;
    return { payload };
  }

  // Submit
  if (modalFormEl){
    modalFormEl.addEventListener('submit', async (e)=>{
      e.preventDefault(); e.stopPropagation();
      const isEdit = modalFormEl.dataset.editing === 'true';
      const f = modalFormEl.elements;

      const { payload, error } = await validateAndBuildPayload();
      if (error) {
        window.showToast?.('error','Thiếu thông tin', error, 3400);
        if (/phiếu/i.test(error)) f['MaPhieuMuon']?.focus();
        else if (/bạn đọc/i.test(error)) f['MaBanDoc']?.focus();
        else if (/sách/i.test(error)) f['MaSach']?.focus();
        else if (/hẹn trả|ngày/i.test(error)) f['NgayTra']?.focus();
        return;
      }

      if (btnSave){ btnSave.disabled=true; btnSave.textContent = isEdit ? 'Đang lưu...' : 'Đang thêm...'; }
      try{
        let res;
        if (isEdit) res = await LoanAPI.update(modalFormEl.dataset.editId, payload);
        else res = await LoanAPI.create(payload);
        if (!res || res.ok===false) {
          const msg = String(res?.error || 'Không thể lưu, vui lòng kiểm tra lại').trim();
          window.showToast?.('error','Không thể lưu', msg, 3800);
          if (/bạn đọc/i.test(msg)) f['MaBanDoc']?.focus();
          else if (/m[aã] s[aá]ch|sách|ma sach/i.test(msg)) f['MaSach']?.focus();
          else if (/trùng|tồn tại|duplicate/i.test(msg)) f['MaPhieuMuon']?.focus();
          return;
        }
        window.showToast?.('success', isEdit?'Cập nhật':'Thành công', isEdit?'Cập nhật phiếu thành công':'Lập phiếu thành công', 2600);
        closeModal();
        await loadAll();
      } finally {
        if (btnSave){ btnSave.disabled=false; btnSave.textContent='Lưu'; }
      }
    });
  }

  // Interaction
  if (bookSearch) bookSearch.addEventListener('input', debounce(()=> { pickCurrentPage = 1; pickUpdateRender(); }, 150));
  if (modalFormEl?.elements?.['NgayTra']) modalFormEl.elements['NgayTra'].addEventListener('change', updateStatusPreview);
  if (modalFormEl?.elements?.['NgayMuon']) modalFormEl.elements['NgayMuon'].addEventListener('change', ()=>{ syncDueDateLimit(); updateStatusPreview(); });

  // Export
  function toCSV(rows){ if(!rows.length) return ''; const keys = ['MaPhieuMuon','MaSach','MaBanDoc','SoLuongMuon','NgayMuon','NgayTra','TinhTrang','NgayQuaHan']; const lines=[keys.join(',')]; rows.forEach(r=>lines.push(keys.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))); return lines.join('\n'); }
  function downloadBlob(blob,name){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),3000); }
  if (exportMenu){
    exportMenu.addEventListener('click', e=> e.stopPropagation());
    btnExportNodes.forEach(btn=> btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      closeAllActionMenus();
      if (exportMenu.style.display==='block'){
        try{ if (exportMenu.contains(document.activeElement)) document.activeElement.blur(); }catch(e){}
        exportMenu.style.display='none'; exportMenu.setAttribute('aria-hidden','true');
      }else{
        exportMenu.style.display='block'; exportMenu.setAttribute('aria-hidden','false');
        setTimeout(()=> exportMenu.querySelector('button')?.focus(), 10);
      }
    }));
    exportMenu.querySelectorAll('button').forEach(b=> b.addEventListener('click', async (e)=>{
      e.stopPropagation();
      exportMenu.style.display='none'; exportMenu.setAttribute('aria-hidden','true');
      const type = b.dataset.type;
      try{
        const res = await LoanAPI.list('');
        if (!res || !res.ok) throw new Error(res?.error || 'API error');
        const data = res.data || [];
        if (type==='json') downloadBlob(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}), 'bookloans.json');
        else if (type==='csv') downloadBlob(new Blob([toCSV(data)], {type:'text/csv;charset=utf-8;'}), 'bookloans.csv');
      }catch(err){ console.error(err); window.showToast?.('error','Export failed','Xem console',3000); }
    }));
  }

  // Header buttons
  if (btnRefresh){ btnRefresh.onclick=null; btnRefresh.addEventListener('click', (e)=>{ e.stopPropagation(); loadAll(); }); }
  if (btnPrint) btnPrint.addEventListener('click',(e)=>{ e.stopPropagation(); window.print(); });
  if (btnAdd){ btnAdd.onclick=null; btnAdd.addEventListener('click', async (e)=>{ e.stopPropagation(); await loadBooksForPicker(); openModal('Lập phiếu mượn'); }); }

  // Data load (main)
  async function loadAll(){
    try{
      const res = await LoanAPI.list('');
      if (!res || !res.ok) throw new Error(res?.error || 'No data');
      allRows = res.data || [];
      currentPage = 1;
      closeAllActionMenus();
      updateRender();
    }catch(err){
      if (tbody) tbody.innerHTML = '<tr><td colspan="9">Lỗi tải dữ liệu</td></tr>';
      window.showToast?.('error','Lỗi tải dữ liệu','Xem console',3000);
    }
  }

  // Bindings
  if (selectPageSize) selectPageSize.addEventListener('change', ()=> { pageSize = Number(selectPageSize.value); currentPage = 1; closeAllActionMenus(); updateRender(); });
  if (tableSearch) tableSearch.addEventListener('input', debounce(()=> { currentPage = 1; closeAllActionMenus(); updateRender(); }, 200));

  // Init
  loadAll();
})();