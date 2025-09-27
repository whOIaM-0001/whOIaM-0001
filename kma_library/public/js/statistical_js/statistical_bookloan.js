// statistical_bookloan.js — Thống kê người mượn: 5 card + bảng quanlymuon + Status filter + Export (a11y-safe)
(function(){
  const root = document.getElementById('section-bookloan');
  if (!root) return;

  // Thứ tự cột cố định
  const SCHEMA_COLS = ['MaPhieuMuon','MaBanDoc','hoTen','MaSach','TenS','NgayMuon','NgayTra','SoLuongMuon','TinhTrang','NgayQuaHan'];
  const LABELS = {
    MaPhieuMuon:'Mã phiếu mượn',
    MaBanDoc:'Mã bạn đọc',
    hoTen:'Họ tên',
    MaSach:'Mã sách',
    TenS:'Tên sách',
    NgayMuon:'Ngày mượn',
    NgayTra:'Ngày trả',
    SoLuongMuon:'Số lượng mượn',
    TinhTrang:'Tình trạng',
    NgayQuaHan:'Ngày quá hạn'
  };

  // Cards
  const card = {
    total: document.getElementById('card-total-borrowers'),
    qty:   document.getElementById('card-total-qty'),
    current: document.getElementById('card-current'),
    overdue: document.getElementById('card-overdue'),
    due:   document.getElementById('card-due')
  };

  // Header controls
  const btnRefresh = document.getElementById('btn-refresh');
  const btnPrint   = document.getElementById('btn-print');
  const btnExport  = document.getElementById('btn-export');
  const exportMenu = document.getElementById('export-menu');

  // Table controls
  const table      = document.getElementById('loan-table');
  const theadRow   = document.getElementById('loan-thead-row');
  const tbody      = table?.querySelector('tbody');
  const tableEmpty = document.getElementById('table-empty');
  const tableInfo  = document.getElementById('table-info');
  const pagination = document.getElementById('pagination');

  const pageSizeSel = document.getElementById('select-page-size');
  const statusSel   = document.getElementById('select-status');
  const searchInput = document.getElementById('table-search');

  // State
  let loansRaw = [];     // bản ghi mượn (đã enrich)
  let page = 1;
  let pageSize = Number(pageSizeSel?.value || 10);
  let sortBy = null;
  let sortDir = 'asc';
  let filteredRows = [];

  // Helpers
  const nf = new Intl.NumberFormat('vi-VN');
  const rmAcc = (str) => String(str||'').normalize('NFD').replace(/\p{Diacritic}/gu,'');
  function norm(s){
    // Bỏ dấu + chuyển đ/Đ -> d, hạ thường, nén khoảng trắng
    return rmAcc(String(s||''))
      .replace(/đ/gi,'d')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function debounce(fn,t){ let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a),t); }; }
  function countTo(el, target, ms=900){
    if (!el) return; const start=0, t0=performance.now();
    const step=(t)=>{ const p=Math.min(1,(t-t0)/ms); el.textContent = nf.format(Math.round(start+(target-start)*p)); if(p<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function toInt(x){ const n = parseInt(x,10); return isNaN(n)?0:n; }
  function toTime(x){
    if (!x) return 0;
    const m = String(x).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3])).getTime() || 0;
    const t = new Date(x).getTime();
    return isNaN(t)?0:t;
  }

  // Render thead
  function renderThead(){
    if (!theadRow) return;
    theadRow.innerHTML = '';
    SCHEMA_COLS.forEach(c=>{
      const th = document.createElement('th');
      th.dataset.col = c;
      th.innerHTML = `<span class="th-sort">${esc(LABELS[c] || c)} <span class="caret">▾</span></span>`;
      th.addEventListener('click', ()=>{
        if (sortBy === c) sortDir = (sortDir === 'asc' ? 'desc' : 'asc'); else { sortBy = c; sortDir = 'asc'; }
        page = 1; update();
      });
      theadRow.appendChild(th);
    });
  }

  // Sort/search/filter
  function compare(a,b,c){
    if (c === 'SoLuongMuon') return toInt(a?.[c]) - toInt(b?.[c]);
    if (c === 'NgayMuon' || c === 'NgayTra' || c === 'NgayQuaHan') return toTime(a?.[c]) - toTime(b?.[c]);
    return String(a?.[c] ?? '').localeCompare(String(b?.[c] ?? ''), undefined, { sensitivity:'base' });
  }
  function applySort(rows){
    if (!sortBy) return rows;
    const f = (sortDir === 'asc') ? 1 : -1;
    return rows.slice().sort((a,b)=> f * compare(a,b,sortBy));
  }
  function applySearch(rows, q){
    if (!q) return rows;
    const nq = norm(q);
    return rows.filter(r => SCHEMA_COLS.some(c => norm(r?.[c]).includes(nq)));
  }
  function applyStatus(rows){
    const s = String(statusSel?.value || '').trim(); // 'dang muon' | 'den hen tra' | 'qua han' | 'da tra' | ''
    if (!s) return rows;
    return rows.filter(r=>{
      const tt = norm(r?.TinhTrang);
      if (s === 'dang muon')  return tt === 'dang muon'  || tt.includes('dang muon');
      if (s === 'den hen tra')return tt === 'den hen tra'|| tt.includes('den hen tra');
      if (s === 'qua han')    return tt === 'qua han'    || tt.includes('qua han');
      if (s === 'da tra')     return tt === 'da tra'     || tt.includes('da tra');
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

  // Render table
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
    let rows = loansRaw;
    rows = applyStatus(rows);
    rows = applySearch(rows, q);
    const sorted = applySort(rows);
    filteredRows = sorted; // để Export xuất đúng tập đang xem
    const pag = getPage(sorted, page, pageSize);
    renderRows(pag.slice);
    renderPagination(pag.total, pag.totalPages, pag.page);
    highlightCaret();
  }

  // Cards (đếm từ cột Tình trạng)
  function computeCards(data){
    const total = data.length; // số phiếu
    const totalQty = data.reduce((s,r)=> s + toInt(r?.SoLuongMuon), 0);

    let cur=0, od=0, due=0;
    data.forEach(r=>{
      const tt = norm(r?.TinhTrang);
      if (tt === 'dang muon'   || tt.includes('dang muon'))   cur++;
      else if (tt === 'qua han'     || tt.includes('qua han'))     od++;
      else if (tt === 'den hen tra' || tt.includes('den hen tra')) due++;
    });

    countTo(card.total, total, 900);
    countTo(card.qty, totalQty, 900);
    countTo(card.current, cur, 900);
    countTo(card.overdue, od, 900);
    countTo(card.due, due, 900);
  }

  // Export (a11y-safe)
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
  function isMenuOpen(){ return exportMenu && exportMenu.style.display === 'block'; }
  function openExportMenu(){
    if (!exportMenu) return;
    exportMenu.style.display = 'block';
    exportMenu.setAttribute('aria-hidden','false');
    try { exportMenu.inert = false; } catch(e){}
    btnExport?.setAttribute('aria-expanded','true');
    setTimeout(()=> exportMenu.querySelector('button')?.focus(), 10);
    document.addEventListener('keydown', onEscape, true);
  }
  function closeExportMenu(returnFocus=false){
    if (!exportMenu) return;
    if (exportMenu.contains(document.activeElement)) { try { document.activeElement.blur(); } catch(e){} }
    exportMenu.style.display = 'none';
    exportMenu.setAttribute('aria-hidden','true');
    try { exportMenu.inert = true; } catch(e){}
    btnExport?.setAttribute('aria-expanded','false');
    if (returnFocus) btnExport?.focus();
    document.removeEventListener('keydown', onEscape, true);
  }
  function onEscape(e){ if (e.key==='Escape' && isMenuOpen()) { e.preventDefault(); closeExportMenu(true); } }
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
        const rows = filteredRows.length ? filteredRows : loansRaw;
        closeExportMenu(true);
        if (type === 'json') downloadBlob(new Blob([JSON.stringify(rows, null, 2)], {type:'application/json'}), 'bookloan.json');
        else if (type === 'csv') downloadBlob(new Blob([makeCSV(rows)], {type:'text/csv;charset=utf-8;'}), 'bookloan.csv');
      });
    });

    exportMenu.style.display = 'none';
    exportMenu.setAttribute('aria-hidden','true');
    try { exportMenu.inert = true; } catch(e){}
  }

  // Build derived fields hoTen, TenS
  function buildIndex(list, keyField, valField){
    const idx = new Map();
    list.forEach(r=>{
      const k = String(r?.[keyField] ?? '').trim();
      if (!k) return;
      if (!idx.has(k)) idx.set(k, r?.[valField] ?? '');
    });
    return idx;
  }

  async function loadAll(){
    try{
      // 1) Load loan data
      const loanApi =
        (typeof window!=='undefined' && (window.LoanAPI||window.BorrowAPI||window.QuanLyMuonAPI)) ||
        (typeof LoanAPI!=='undefined' ? LoanAPI : (typeof BorrowAPI!=='undefined'?BorrowAPI:(typeof QuanLyMuonAPI!=='undefined'?QuanLyMuonAPI:null)));
      if (!loanApi) throw new Error('LoanAPI not found');

      const loanCall = loanApi.table?.bind(loanApi) || loanApi.list?.bind(loanApi) || loanApi.getAll?.bind(loanApi) || loanApi.index?.bind(loanApi);
      if (!loanCall) throw new Error('LoanAPI has no supported method (expected table/list/getAll/index)');

      const loanRes = await loanCall('');
      if (!loanRes || !loanRes.ok) throw new Error(loanRes?.error || 'Loan API error');
      let loans = Array.isArray(loanRes.data) ? loanRes.data : [];

      // 2) Load cardregister for hoTen
      const cardApi = (typeof window!=='undefined' && window.CardAPI) ? window.CardAPI
                    : (typeof CardAPI!=='undefined' ? CardAPI : null);
      let mapReader = new Map();
      if (cardApi?.list) {
        try {
          const cr = await cardApi.list('');
          const arr = Array.isArray(cr?.data) ? cr.data : [];
          // dự kiến mã: maSVHV, tên: hoTen
          mapReader = buildIndex(arr, 'maSVHV', 'hoTen');
        } catch(e){ console.warn('CardAPI list failed', e); }
      }

      // 3) Load books for TenS
      const bookApi = (typeof window!=='undefined' && window.BookAPI) ? window.BookAPI : (typeof BookAPI!=='undefined'?BookAPI:null);
      let mapBook = new Map();
      if (bookApi && (bookApi.table || bookApi.list)) {
        try {
          const fn = bookApi.table?.bind(bookApi) || bookApi.list?.bind(bookApi);
          const br = await fn('');
          const arr = Array.isArray(br?.data) ? br.data : [];
          mapBook = buildIndex(arr, 'maS', 'TenS');
        } catch(e){ console.warn('BookAPI load failed', e); }
      }

      // 4) Enrich fields hoTen/TenS nếu trống
      loans = loans.map(r=>{
        const o = {};
        SCHEMA_COLS.forEach(k => { o[k] = (r && (k in r)) ? r[k] : ''; });
        if (!o.hoTen) {
          const k = String(o.MaBanDoc||'').trim();
          if (k && mapReader.has(k)) o.hoTen = mapReader.get(k);
        }
        if (!o.TenS) {
          const k2 = String(o.MaSach||'').trim();
          if (k2 && mapBook.has(k2)) o.TenS = mapBook.get(k2);
        }
        return o;
      });

      loansRaw = loans;

      renderThead();
      computeCards(loansRaw);
      page = 1; update();
    }catch(err){
      console.error('Load loan failed', err);
      tbody.innerHTML = '<tr><td colspan="10">Không thể tải dữ liệu</td></tr>';
      tableEmpty.hidden = true;
      // reset cards
      countTo(card.total, 0, 300);
      countTo(card.qty, 0, 300);
      countTo(card.current, 0, 300);
      countTo(card.overdue, 0, 300);
      countTo(card.due, 0, 300);
    }
  }

  // Bind
  pageSizeSel?.addEventListener('change', ()=>{ pageSize = Number(pageSizeSel.value||10); page = 1; update(); });
  statusSel?.addEventListener('change', ()=>{ page = 1; update(); });
  searchInput?.addEventListener('input', debounce(()=>{ page = 1; update(); }, 200));
  btnRefresh?.addEventListener('click', (e)=>{ e.stopPropagation(); loadAll(); });
  btnPrint?.addEventListener('click', (e)=>{ e.stopPropagation(); window.print(); });
  bindExport();

  // Init
  loadAll();
})();