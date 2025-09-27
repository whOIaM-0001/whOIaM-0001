// statistical_books.js — Thống kê sách: cards + bảng có sort/tìm kiếm/phân trang/Export (a11y fixed for export menu)
(function(){
  const root = document.getElementById('section-statistical-books');
  if (!root) return;

  // Cấu trúc cột CỐ ĐỊNH theo bảng `sach`
  const SCHEMA_COLS = ['maS','TenS','MaTheLoai','Tacgia','NamXB','MaNhaXuatBan','SoLuong','TinhTrang'];
  const LABELS = {
    maS:'Mã sách',
    TenS:'Tên sách',
    MaTheLoai:'Mã TL',
    Tacgia:'Tác giả',
    NamXB:'Năm XB',
    MaNhaXuatBan:'Mã NXB',
    SoLuong:'Số lượng',
    TinhTrang:'Tình trạng'
  };
  const NUM_COLS = new Set(['SoLuong','NamXB']); // cột so sánh kiểu số

  // Cards
  const elTotals = {
    titles: document.getElementById('card-total-titles'),
    qty:    document.getElementById('card-total-quantity'),
    avail:  document.getElementById('card-available'),
    out:    document.getElementById('card-out')
  };

  // Controls
  const btnRefresh = document.getElementById('btn-refresh');
  const btnPrint   = document.getElementById('btn-print');
  const btnExport  = document.getElementById('btn-export');
  const exportMenu = document.getElementById('export-menu');

  // Table
  const table      = document.getElementById('books-table');
  const theadRow   = document.getElementById('books-thead-row');
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

  // Helpers
  const nf = new Intl.NumberFormat('vi-VN');
  const rmAcc = (str) => String(str||'').normalize('NFD').replace(/\p{Diacritic}/gu,'');
  const num = (x)=> { const n = parseInt(x,10); return isNaN(n)?0:n; };
  function debounce(fn,t){ let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a),t); }; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function countTo(el, target, ms=900){
    if (!el) return;
    const start = 0; const t0 = performance.now();
    const anim = (t)=>{
      const p = Math.min(1, (t - t0)/ms);
      const val = Math.round(start + (target - start)*p);
      el.textContent = nf.format(val);
      if (p < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

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
    const av = a?.[c]; const bv = b?.[c];
    if (NUM_COLS.has(c)) return (num(av) - num(bv));
    return String(av??'').localeCompare(String(bv??''), undefined, { sensitivity:'base' });
  }
  function applySort(rows){
    if (!sortBy) return rows;
    const f = (sortDir === 'asc' ? 1 : -1);
    return rows.slice().sort((a,b)=> f * compare(a,b,sortBy));
  }
  function applySearch(rows, q){
    if (!q) return rows;
    q = rmAcc(q).toLowerCase().trim();
    return rows.filter(r => SCHEMA_COLS.some(c => rmAcc(r?.[c]??'').toLowerCase().includes(q)));
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
    if (!rows.length){
      tableEmpty.hidden = false;
      return;
    } else {
      tableEmpty.hidden = true;
    }
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
        if (a === 'prev') { page = Math.max(1, page-1); update(); }
        else if (a === 'next') { page = Math.min(totalPages, page+1); update(); }
        else {
          const p2 = Number(btn.getAttribute('data-page'));
          if (!isNaN(p2)) { page = p2; update(); }
        }
      });
    });
  }

  function highlightCaret(){
    if (!theadRow) return;
    Array.from(theadRow.querySelectorAll('th')).forEach(th=>{
      th.classList.remove('sorted-asc','sorted-desc');
      if (th.dataset.col === sortBy) th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    });
  }

  function update(){
    const q = searchInput?.value || '';
    filtered = applySearch(raw, q);
    const sorted = applySort(filtered);
    const pag = getPage(sorted, page, pageSize);
    renderRows(pag.slice);
    renderPagination(pag.total, pag.totalPages, pag.page);
    highlightCaret();
  }

  // Cards:
  // - Tổng sách trong kho: số dòng (raw.length)
  // - Tổng số lượng sách: SUM(SoLuong)
  // - Tổng số sách còn: COUNT(dòng có TinhTrang = "Còn")
  // - Tổng số sách hết: COUNT(dòng có TinhTrang = "Hết")
  function computeCards(data){
    const totalTitles = data.length;
    let totalQty = 0, availCount = 0, outCount = 0;
    data.forEach(r=>{
      totalQty += num(r?.SoLuong);
      const st = rmAcc(r?.TinhTrang||'').toLowerCase().trim(); // "con" / "het"
      if (st === 'con') availCount++;
      else if (st === 'het') outCount++;
    });
    countTo(elTotals.titles, totalTitles, 900);
    countTo(elTotals.qty,    totalQty,    900);
    countTo(elTotals.avail,  availCount,  900);
    countTo(elTotals.out,    outCount,    900);
  }

  // Export with a11y-safe menu
  function makeCSV(rows){
    const headers = SCHEMA_COLS;
    const lines = [ headers.join(',') ];
    rows.forEach(r=>{
      const row = headers.map(k => `"${String(r?.[k]??'').replace(/"/g,'""')}"`).join(',');
      lines.push(row);
    });
    // BOM UTF-8 để Excel đọc tiếng Việt đúng
    return '\ufeff' + lines.join('\n');
  }
  function downloadBlob(blob, name){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 1500);
  }

  // Export menu: open/close quản lý focus + aria
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
    // nếu focus đang nằm trong menu, blur trước khi aria-hidden
    if (exportMenu.contains(document.activeElement)) {
      try { document.activeElement.blur(); } catch(e){}
    }
    exportMenu.style.display = 'none';
    exportMenu.setAttribute('aria-hidden','true');
    try { exportMenu.inert = true; } catch(e){}
    btnExport?.setAttribute('aria-expanded','false');
    if (returnFocus) btnExport?.focus();
    document.removeEventListener('keydown', onEscape, true);
  }
  function onEscape(e){
    if (e.key === 'Escape' && isMenuOpen()) { e.preventDefault(); closeExportMenu(true); }
  }

  function bindExport(){
    if (!exportMenu || !btnExport) return;
    // set ARIA cho nút
    btnExport.setAttribute('aria-haspopup','menu');
    btnExport.setAttribute('aria-expanded','false');
    btnExport.setAttribute('aria-controls', exportMenu.id || 'export-menu');

    btnExport.addEventListener('click', (e)=>{
      e.stopPropagation();
      if (isMenuOpen()) closeExportMenu(true);
      else openExportMenu();
    });

    exportMenu.addEventListener('click', e => e.stopPropagation());

    // outside click
    document.addEventListener('click', (e)=>{
      if (!isMenuOpen()) return;
      const t = e.target;
      if (exportMenu.contains(t) || btnExport.contains(t)) return;
      closeExportMenu(false);
    });

    // các nút Export
    exportMenu.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        const type = b.dataset.type;
        const data = filtered.length ? filtered : raw;
        // đóng menu an toàn trước khi tải
        closeExportMenu(true);
        if (type === 'json') {
          downloadBlob(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}), 'statistical_books.json');
        } else if (type === 'csv') {
          const csv = makeCSV(data);
          downloadBlob(new Blob([csv], {type:'text/csv;charset=utf-8;'}), 'statistical_books.csv');
        }
      });
    });

    // khởi tạo trạng thái ẩn menu (inert)
    exportMenu.style.display = 'none';
    exportMenu.setAttribute('aria-hidden','true');
    try { exportMenu.inert = true; } catch(e){}
  }

  // Load
  async function loadAll(){
    try{
      const res = await (window.BookAPI?.table?.() ?? Promise.reject(new Error('BookAPI not found')));
      if (!res || !res.ok) throw new Error(res?.error || 'API error');
      raw = Array.isArray(res.data) ? res.data : [];

      // Đảm bảo dữ liệu có đủ key theo schema (nếu thiếu thì fill rỗng)
      raw = raw.map(r => {
        const o = {};
        SCHEMA_COLS.forEach(k => { o[k] = (r && (k in r)) ? r[k] : ''; });
        return o;
      });

      renderThead();
      computeCards(raw);
      page = 1;
      update();
    }catch(err){
      console.error('Load failed', err);
      tbody.innerHTML = '<tr><td colspan="8">Không thể tải dữ liệu</td></tr>';
      tableEmpty.hidden = true;
      countTo(elTotals.titles, 0, 300);
      countTo(elTotals.qty,    0, 300);
      countTo(elTotals.avail,  0, 300);
      countTo(elTotals.out,    0, 300);
    }
  }

  // Bind
  pageSizeSel?.addEventListener('change', ()=>{ pageSize = Number(pageSizeSel.value||10); page = 1; update(); });
  searchInput?.addEventListener('input', debounce(()=>{ page = 1; update(); }, 200));
  btnRefresh?.addEventListener('click', (e)=>{ e.stopPropagation(); loadAll(); });
  btnPrint?.addEventListener('click', (e)=>{ e.stopPropagation(); window.print(); });
  bindExport();

  // Init
  loadAll();
})();