// readers.js — Thống độc giả: 7 card + bảng cardregister + Export + Filter panel (a11y-safe)
(function(){
  const root = document.getElementById('section-readers');
  if (!root) return;

  // Schema đúng thứ tự yêu cầu của bảng cardregister
  const SCHEMA_COLS = ['hoTen','ngaySinh','lop','sdt','gmail','gioiTinh','chucVu','he','ngayLamThe','ngayHetHanThe'];
  const LABELS = {
    hoTen:'Họ tên',
    ngaySinh:'Ngày sinh',
    lop:'Lớp',
    sdt:'SĐT',
    gmail:'Gmail',
    gioiTinh:'Giới tính',
    chucVu:'Chức vụ',
    he:'Hệ',
    ngayLamThe:'Ngày làm thẻ',
    ngayHetHanThe:'Ngày hết hạn thẻ'
  };

  // Cards
  const card = {
    total:   document.getElementById('card-total-readers'),
    male:    document.getElementById('card-male'),
    female:  document.getElementById('card-female'),
    sv:      document.getElementById('card-sinhvien'),
    hv:      document.getElementById('card-hocvien'),
    danSu:   document.getElementById('card-dansu'),
    quocTe:  document.getElementById('card-quocte'),
  };

  // Header controls
  const btnRefresh = document.getElementById('btn-refresh');
  const btnPrint   = document.getElementById('btn-print');
  const btnExport  = document.getElementById('btn-export');
  const exportMenu = document.getElementById('export-menu');

  // Filter controls
  const btnFilter = document.getElementById('btn-filter');
  const filterPanel = document.getElementById('filter-panel');
  const flLop = document.getElementById('filter-lop');
  const flGt  = document.getElementById('filter-gt');
  const flCv  = document.getElementById('filter-cv');
  const flHe  = document.getElementById('filter-he');
  const btnFilterApply = document.getElementById('btn-filter-apply');
  const btnFilterReset = document.getElementById('btn-filter-reset');

  // Table elements
  const table      = document.getElementById('readers-table');
  const theadRow   = document.getElementById('readers-thead-row');
  const tbody      = table?.querySelector('tbody');
  const tableEmpty = document.getElementById('table-empty');
  const tableInfo  = document.getElementById('table-info');
  const pagination = document.getElementById('pagination');

  const pageSizeSel = document.getElementById('select-page-size');
  const searchInput = document.getElementById('table-search');

  // State
  let raw = [];
  let page = 1;
  let pageSize = Number(pageSizeSel?.value || 10);
  let sortBy = null;
  let sortDir = 'asc';
  let filtered = [];
  const filters = { lop:'', gioiTinh:'', chucVu:'', he:'' };

  // Helpers
  const nf = new Intl.NumberFormat('vi-VN');
  const rmAcc = (str) => String(str||'').normalize('NFD').replace(/\p{Diacritic}/gu,'');
  function norm(s){
    return rmAcc(String(s||'')).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function debounce(fn,t){ let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a),t); }; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function countTo(el, target, ms=900){
    if (!el) return; const start=0, t0=performance.now();
    const step=(t)=>{ const p=Math.min(1,(t-t0)/ms); el.textContent = nf.format(Math.round(start+(target-start)*p)); if(p<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // Thead
  function renderThead(){
    if (!theadRow) return;
    theadRow.innerHTML = '';
    SCHEMA_COLS.forEach(c=>{
      const th = document.createElement('th');
      th.dataset.col = c;
      th.innerHTML = `<span class="th-sort">${esc(LABELS[c] || c)} <span class="caret">▾</span></span>`;
      th.addEventListener('click', ()=>{
        if (sortBy === c) sortDir = (sortDir === 'asc' ? 'desc' : 'asc');
        else { sortBy = c; sortDir = 'asc'; }
        page = 1; update();
      });
      theadRow.appendChild(th);
    });
  }
  function compare(a,b,c){
    return String(a?.[c]??'').localeCompare(String(b?.[c]??''), undefined, {sensitivity:'base'});
  }
  function applySort(rows){
    if (!sortBy) return rows;
    const f = (sortDir==='asc'?1:-1);
    return rows.slice().sort((a,b)=> f * compare(a,b,sortBy));
  }
  function applySearch(rows, q){
    if (!q) return rows;
    const nq = norm(q);
    return rows.filter(r => SCHEMA_COLS.some(c => norm(r?.[c]).includes(nq)));
  }

  // Facet filter
  function applyFacet(rows){
    return rows.filter(r=>{
      // Lớp
      if (filters.lop) {
        if (norm(r?.lop) !== norm(filters.lop)) return false;
      }
      // Giới tính
      if (filters.gioiTinh) {
        const gt = norm(r?.gioiTinh);
        if (filters.gioiTinh === 'nam' && gt !== 'nam') return false;
        if (filters.gioiTinh === 'nu'  && gt !== 'nu')  return false;
      }
      // Chức vụ
      if (filters.chucVu) {
        const cv = norm(r?.chucVu);
        if (filters.chucVu === 'sinh vien' && !(cv === 'sinh vien' || cv.includes('sinh vien') || cv === 'sv')) return false;
        if (filters.chucVu === 'hoc vien'  && !(cv === 'hoc vien'  || cv.includes('hoc vien')  || cv === 'hv')) return false;
      }
      // Hệ
      if (filters.he) {
        const he = norm(r?.he);
        if (filters.he === 'dan su'  && !(he === 'dan su'  || /\bdan\s*su\b/.test(he)  || he === 'ds')) return false;
        if (filters.he === 'quoc te' && !(he === 'quoc te' || /\bquoc\s*te\b/.test(he) || he === 'qt')) return false;
      }
      return true;
    });
  }

  function getPage(rows, p, size){
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total/size));
    p = Math.max(1, Math.min(p, totalPages));
    const start = (p-1)*size;
    return { slice: rows.slice(start, start+size), total, totalPages, page: p };
  }
  function renderRows(rows){
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows.length){ tableEmpty.hidden=false; return; }
    tableEmpty.hidden=true;
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = SCHEMA_COLS.map(c => `<td>${esc(r?.[c] ?? '')}</td>`).join('');
      tbody.appendChild(tr);
    });
  }
  function renderPagination(total, totalPages, p){
    if (!pagination || !tableInfo) return;
    const startIndex = (total===0) ? 0 : ((p-1)*pageSize+1);
    const endIndex   = Math.min(p*pageSize, total);
    tableInfo.textContent = `Showing ${startIndex} - ${endIndex} of ${total}`;
    const maxButtons = 5;
    let start = Math.max(1, p - Math.floor(maxButtons/2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, Math.min(start, end - maxButtons + 1));
    const html = [];
    html.push(`<button data-action="prev" ${p===1?'disabled':''}>Prev</button>`);
    for (let i=start; i<=end; i++) html.push(`<button data-page="${i}" class="${i===p?'active':''}">${i}</button>`);
    html.push(`<button data-action="next" ${p===totalPages?'disabled':''}>Next</button>`);
    pagination.innerHTML = html.join('');
    pagination.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const a = btn.getAttribute('data-action');
        if (a==='prev'){ page = Math.max(1, page-1); update(); }
        else if (a==='next'){ page = Math.min(totalPages, page+1); update(); }
        else { const p2 = Number(btn.getAttribute('data-page')); if(!isNaN(p2)){ page = p2; update(); } }
      });
    });
  }
  function highlightCaret(){
    if (!theadRow) return;
    Array.from(theadRow.querySelectorAll('th')).forEach(th=>{
      th.classList.remove('sorted-asc','sorted-desc');
      if (th.dataset.col === sortBy) th.classList.add(sortDir==='asc'?'sorted-asc':'sorted-desc');
    });
  }
  function update(){
    const q = searchInput?.value || '';
    let rows = raw;
    rows = applyFacet(rows);
    rows = applySearch(rows, q);
    const sorted = applySort(rows);
    const pag = getPage(sorted, page, pageSize);
    renderRows(pag.slice);
    renderPagination(pag.total, pag.totalPages, pag.page);
    highlightCaret();
  }

  // Tính chỉ số thẻ — robust normalize
  function computeCards(data){
    const total = data.length;
    let male=0, female=0, sv=0, hv=0, ds=0, qt=0;

    data.forEach(r=>{
      const gt = norm(r?.gioiTinh);
      if (gt === 'nam') male++;
      else if (gt === 'nu') female++;

      const cv = norm(r?.chucVu);
      if (cv === 'sinh vien' || cv === 'sv' || cv.includes('sinh vien')) sv++;
      if (cv === 'hoc vien'  || cv === 'hv' || cv.includes('hoc vien'))  hv++;

      const he = norm(r?.he);
      if (he === 'quoc te' || /\bquoc\s*te\b/.test(he) || he === 'qt') qt++;
      if (he === 'dan su'  || /\bdan\s*su\b/.test(he)  || he === 'ds') ds++;
    });

    countTo(card.total,  total,  900);
    countTo(card.male,   male,   900);
    countTo(card.female, female, 900);
    countTo(card.sv,     sv,     900);
    countTo(card.hv,     hv,     900);
    countTo(card.danSu,  ds,     900);
    countTo(card.quocTe, qt,     900);
  }

  // Export
  function makeCSV(rows){
    const headers = SCHEMA_COLS;
    const lines = [ headers.join(',') ];
    rows.forEach(r=>{
      const row = headers.map(k => `"${String(r?.[k]??'').replace(/"/g,'""')}"`).join(',');
      lines.push(row);
    });
    return '\ufeff' + lines.join('\n'); // BOM UTF-8
  }
  function downloadBlob(blob, name){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 1500);
  }

  // Export menu a11y
  function isMenuOpen(){ return exportMenu && exportMenu.style.display === 'block'; }
  function openExportMenu(){
    if (!exportMenu) return;
    exportMenu.style.display = 'block';
    exportMenu.setAttribute('aria-hidden','false');
    try { exportMenu.inert = false; } catch(e){}
    btnExport?.setAttribute('aria-expanded','true');
    setTimeout(()=> exportMenu.querySelector('button')?.focus(), 10);
    document.addEventListener('keydown', onEscapeExport, true);
  }
  function closeExportMenu(returnFocus=false){
    if (!exportMenu) return;
    if (exportMenu.contains(document.activeElement)) { try { document.activeElement.blur(); } catch(e){} }
    exportMenu.style.display = 'none';
    exportMenu.setAttribute('aria-hidden','true');
    try { exportMenu.inert = true; } catch(e){}
    btnExport?.setAttribute('aria-expanded','false');
    if (returnFocus) btnExport?.focus();
    document.removeEventListener('keydown', onEscapeExport, true);
  }
  function onEscapeExport(e){ if (e.key==='Escape' && isMenuOpen()) { e.preventDefault(); closeExportMenu(true); } }

  function bindExport(){
    if (!exportMenu || !btnExport) return;
    btnExport.setAttribute('aria-haspopup','menu');
    btnExport.setAttribute('aria-controls', exportMenu.id || 'export-menu');
    btnExport.setAttribute('aria-expanded','false');

    btnExport.addEventListener('click', (e)=>{
      e.stopPropagation();
      if (isMenuOpen()) closeExportMenu(true); else openExportMenu();
    });
    exportMenu.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', (e)=>{
      if (!isMenuOpen()) return;
      const t = e.target;
      if (exportMenu.contains(t) || btnExport.contains(t)) return;
      closeExportMenu(false);
    });

    exportMenu.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        const type = b.dataset.type;
        const data = filtered.length ? filtered : raw;
        closeExportMenu(true);
        if (type === 'json') downloadBlob(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}), 'readers.json');
        else if (type === 'csv') downloadBlob(new Blob([makeCSV(data)], {type:'text/csv;charset=utf-8;'}), 'readers.csv');
      });
    });

    exportMenu.style.display = 'none';
    exportMenu.setAttribute('aria-hidden','true');
    try { exportMenu.inert = true; } catch(e){}
  }

  // Filter panel a11y
  function isFilterOpen(){ return filterPanel && filterPanel.style.display === 'block'; }
  function openFilter(){
    if (!filterPanel) return;
    filterPanel.style.display='block';
    filterPanel.setAttribute('aria-hidden','false');
    try { filterPanel.inert = false; } catch(e){}
    btnFilter?.setAttribute('aria-expanded','true');
    setTimeout(()=> flLop?.focus(), 10);
    document.addEventListener('keydown', onEscapeFilter, true);
  }
  function closeFilter(returnFocus=false){
    if (!filterPanel) return;
    if (filterPanel.contains(document.activeElement)) { try { document.activeElement.blur(); } catch(e){} }
    filterPanel.style.display='none';
    filterPanel.setAttribute('aria-hidden','true');
    try { filterPanel.inert = true; } catch(e){}
    btnFilter?.setAttribute('aria-expanded','false');
    if (returnFocus) btnFilter?.focus();
    document.removeEventListener('keydown', onEscapeFilter, true);
  }
  function onEscapeFilter(e){ if (e.key==='Escape' && isFilterOpen()) { e.preventDefault(); closeFilter(true); } }

  function bindFilter(){
    if (!btnFilter || !filterPanel) return;
    btnFilter.addEventListener('click', (e)=>{ e.stopPropagation(); isFilterOpen()? closeFilter(true): openFilter(); });
    filterPanel.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', (e)=>{
      if (!isFilterOpen()) return;
      const t = e.target;
      if (filterPanel.contains(t) || btnFilter.contains(t)) return;
      closeFilter(false);
    });

    btnFilterApply?.addEventListener('click', ()=>{
      filters.lop = String(flLop?.value || '').trim();
      filters.gioiTinh = String(flGt?.value || '').trim();
      filters.chucVu = String(flCv?.value || '').trim();
      filters.he = String(flHe?.value || '').trim();
      page = 1; update();
      closeFilter(true);
    });

    btnFilterReset?.addEventListener('click', ()=>{
      flLop.value = '';
      flGt.value = '';
      flCv.value = '';
      flHe.value = '';
      filters.lop = filters.gioiTinh = filters.chucVu = filters.he = '';
    });

    // init
    filterPanel.style.display='none';
    filterPanel.setAttribute('aria-hidden','true');
    try { filterPanel.inert = true; } catch(e){}
  }

  // Build Lớp options (unique)
  function buildLopOptions(){
    if (!flLop) return;
    const selected = String(flLop.value || '');
    const map = new Map(); // key: normalized, value: first display
    raw.forEach(r=>{
      const display = (r?.lop ?? '').toString().trim();
      const key = norm(display);
      if (key && !map.has(key)) map.set(key, display);
    });
    flLop.innerHTML = '<option value="">Tất cả</option>' + Array.from(map.values()).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    // restore selection if possible
    const opt = Array.from(flLop.options).find(o => norm(o.value) === norm(selected));
    if (opt) flLop.value = opt.value;
  }

  // Load
  async function loadAll(){
    try{
      // Tìm CardAPI dù gán dạng const global
      const api = (typeof window !== 'undefined' && window.CardAPI) ? window.CardAPI
                 : (typeof CardAPI !== 'undefined' ? CardAPI : null);
      if (!api || typeof api.list !== 'function') throw new Error('CardAPI not found');

      const res = await api.list('');
      if (!res || !res.ok) throw new Error(res?.error || 'API error');

      const data = Array.isArray(res.data) ? res.data : [];

      // Chuẩn hóa: chỉ lấy đúng trường, giữ thứ tự
      raw = data.map(r=>{
        const o = {};
        SCHEMA_COLS.forEach(k => { o[k] = (r && (k in r)) ? r[k] : ''; });
        return o;
      });

      renderThead();
      computeCards(raw);
      buildLopOptions();
      page = 1; update();
    }catch(err){
      console.error('Load readers failed', err);
      tbody.innerHTML = '<tr><td colspan="10">Không thể tải dữ liệu</td></tr>';
      tableEmpty.hidden = true;
      // reset cards
      countTo(card.total, 0, 300);
      countTo(card.male, 0, 300);
      countTo(card.female, 0, 300);
      countTo(card.sv, 0, 300);
      countTo(card.hv, 0, 300);
      countTo(card.danSu, 0, 300);
      countTo(card.quocTe, 0, 300);
    }
  }

  // Bind
  pageSizeSel?.addEventListener('change', ()=>{ pageSize = Number(pageSizeSel.value||10); page = 1; update(); });
  searchInput?.addEventListener('input', debounce(()=>{ page = 1; update(); }, 200));
  btnRefresh?.addEventListener('click', (e)=>{ e.stopPropagation(); loadAll(); });
  btnPrint?.addEventListener('click', (e)=>{ e.stopPropagation(); window.print(); });
  bindExport();
  bindFilter();

  // Init
  loadAll();
})();