// Librarians_list.js - đầy đủ hàm (Fix: openDeleteModal undefined) + popover portal + Email/Password validation
window.LibrariansListModule = (function(){
  const ROOT='/' + location.pathname.split('/')[1];
  const BASE=location.origin + ROOT;
  const API_LIST=`${BASE}/library_api/functions/function_books/command/accounts/Librarians_list.php`;
  const API_CRUD=`${BASE}/library_api/functions/function_books/command/accounts/Librarians_crud.php`;

  let state={page:1,limit:20,q:'',role:'',sort_by:'UserID',sort_dir:'DESC'};

  // Utils
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const qs=o=>Object.entries(o).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  const debounce=(fn,ms=350)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};
  const fmtShowing=(p,l,t)=>!t?'Showing 0 - 0 of 0':`Showing ${(p-1)*l+1} - ${Math.min(p*l,t)} of ${t}`;

  // Rules
  const EMAIL_RE=/^[A-Za-z0-9._%+-]+@gmail\.com$/i;
  const PASS_RE=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/;

  // View
  function template(){
    return `
      <div class="mod-wrap">
        <h1 class="mod-title">Librarians</h1>
        <section class="panel">
          <header class="panel-head">
            <h2 class="panel-title">Librarians</h2>
            <div class="panel-actions">
              <button id="btnRotate" class="icon-btn" title="Refresh"><i class='bx bx-rotate-right'></i></button>
              <button id="btnPrint" class="icon-btn" title="Print"><i class='bx bx-printer'></i></button>
              <button id="btnExport" class="btn ghost"><i class='bx bx-export'></i> Export</button>
              <button id="btnAdd" class="btn primary"><i class='bx bx-plus'></i> Add Librarian</button>
            </div>
            <div class="panel-tools">
              <label class="field mini">
                <span>Row Per Page</span>
                <select id="selLimit"><option>10</option><option>20</option><option>50</option></select>
              </label>
              <div class="search mini">
                <i class='bx bx-search'></i>
                <input id="inpSearch" placeholder="Search table..." />
              </div>
            </div>
          </header>

          <div class="panel-body">
            <table class="grid" id="grid">
              <thead>
                <tr>
                  ${th('UserID')}
                  ${th('Username')}
                  ${th('Email')}
                  ${th('Role')}
                  <th class="act">Thao tác</th>
                </tr>
              </thead>
              <tbody id="tbody">
                ${skeletonRows(10)}
              </tbody>
            </table>

            <footer class="panel-foot">
              <div id="showing" class="muted">${fmtShowing(1,state.limit,0)}</div>
              <div class="pager" id="pager">
                <button class="btn mini" id="btnPrev" disabled>Prev</button>
                <span id="pages"></span>
                <button class="btn mini" id="btnNext" disabled>Next</button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    `;
  }
  function th(key){
    const dir=(state.sort_by===key)?state.sort_dir:'';
    const arrow=dir==='ASC'?'▲':dir==='DESC'?'▼':'—';
    return `<th data-key="${key}"><button class="th-sort"><span>${key}</span><i class="arrow">${arrow}</i></button></th>`;
  }
  function skeletonRows(n){
    return Array.from({length:n}).map(()=>`
      <tr class="skeleton">
        <td><span class="sk sk-id"></span></td>
        <td><span class="sk w-60"></span></td>
        <td><span class="sk w-70"></span></td>
        <td><span class="sk w-40"></span></td>
        <td class="act"><span class="sk w-20"></span></td>
      </tr>`).join('');
  }

  // Data
  async function fetchList(){
    const url=`${API_LIST}?${qs({page:state.page,limit:state.limit,q:state.q,role:state.role,sort_by:state.sort_by,sort_dir:state.sort_dir})}`;
    const res=await fetch(url,{credentials:'include',cache:'no-store'});
    const txt=await res.text(); let data={};
    try{data=txt?JSON.parse(txt):{}}catch(e){throw new Error(`Invalid JSON: ${txt.slice(0,120)}...`);}
    if(!res.ok||data.ok===false) throw new Error((data&&data.error)||`HTTP ${res.status}`);
    return data;
  }

  // Render
  function renderRows(items){
    const tb=$('#tbody');
    if(!items||items.length===0){ tb.innerHTML=`<tr><td colspan="5" class="empty">Không có dữ liệu</td></tr>`; return; }
    tb.innerHTML=items.map(r=>`
      <tr data-id="${r.UserID}">
        <td>${r.UserID}</td>
        <td>${esc(r.Username)}</td>
        <td>${esc(r.Email)}</td>
        <td><span class="tag role">${esc(r.Role||'')}</span></td>
        <td class="act">
          <button class="dots-btn" title="Actions" aria-haspopup="menu" aria-expanded="false"><span class="dots">⋮</span></button>
        </td>
      </tr>`).join('');
  }
  function renderPager(page,total_pages){
    const box=$('#pages');
    const btn=(p,a=false)=>`<button class="page-btn ${a?'active':''}" data-p="${p}">${p}</button>`;
    const pages=[]; const max=7;
    let st=Math.max(1,page-3), en=Math.min(total_pages,st+max-1); st=Math.max(1,en-max+1);
    for(let p=st;p<=en;p++) pages.push(btn(p,p===page));
    box.innerHTML=pages.join('');
    box.querySelectorAll('.page-btn').forEach(b=>b.addEventListener('click',()=>{state.page=+b.dataset.p;load();}));
  }

  // Sort, topbar
  function bindSort(){
    $('#grid thead').addEventListener('click',(ev)=>{
      const th=ev.target.closest('th[data-key]'); if(!th) return;
      const key=th.getAttribute('data-key');
      if(state.sort_by===key) state.sort_dir = state.sort_dir==='ASC'?'DESC':'ASC';
      else { state.sort_by=key; state.sort_dir= key==='UserID'?'DESC':'ASC'; }
      $$('#grid thead th').forEach(h=>{
        const k=h.getAttribute('data-key');
        h.querySelector('.arrow').textContent=(k===state.sort_by)?(state.sort_dir==='ASC'?'▲':'▼'):'—';
      });
      state.page=1; load();
    },{passive:true});
  }
  function bindTopBar(){
    $('#selLimit').value=String(state.limit);
    $('#btnRotate').addEventListener('click',()=>load());
    $('#btnPrint').addEventListener('click',()=>window.print());
    $('#btnExport').addEventListener('click',()=>{
      const url=`${API_LIST}?${qs({page:state.page,limit:state.limit,q:state.q,role:state.role,sort_by:state.sort_by,sort_dir:state.sort_dir,export:'csv'})}`;
      window.open(url,'_blank');
    });
    $('#selLimit').addEventListener('change',()=>{state.limit=+$('#selLimit').value||10; state.page=1; load();});
    $('#inpSearch').addEventListener('input',debounce(()=>{state.q=$('#inpSearch').value.trim(); state.page=1; load();},280));
    $('#btnPrev').addEventListener('click',()=>{if(state.page>1){state.page--; load();}});
    $('#btnNext').addEventListener('click',()=>{state.page++; load();});
    $('#btnAdd').addEventListener('click',openCreateModal);
  }

  // ========= Popover portal (menu 3 chấm) =========
  let currentPop=null;
  function closePop(){
    if(currentPop){ currentPop.el?.remove(); currentPop.arrow?.remove(); currentPop=null; }
    document.querySelectorAll('.dots-btn[aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false'));
  }
  function positionPopNear(btn, pop, arrow){
    const br=btn.getBoundingClientRect();
    const pr=pop.getBoundingClientRect();
    const pw=pr.width||180, ph=pr.height||120;
    let left=Math.min(window.innerWidth - pw - 8, Math.max(8, br.right - pw));
    let top=br.bottom + 8;
    if(top + ph > window.innerHeight - 8) top = Math.max(8, br.top - ph - 8);

    pop.style.position='fixed';
    pop.style.left=`${Math.round(left)}px`;
    pop.style.top =`${Math.round(top)}px`;

    if (arrow){
      arrow.style.position='fixed';
      arrow.style.left = `${Math.round(br.left + Math.min(40, br.width/2))}px`;
      arrow.style.top  = `${Math.round(top < br.top ? br.top - 8 : br.bottom)}px`;
      arrow.style.borderBottomColor = '#fff';
    }
  }
  function showActionMenu(button,id,tr){
    closePop();

    const pop=document.createElement('div');
    pop.className='ll-popover';
    pop.style.left='-9999px'; pop.style.top='-9999px';
    pop.style.visibility='hidden'; pop.style.opacity='0';
    pop.innerHTML=`
      <button class="ll-item js-edit"><i class='bx bx-edit-alt'></i> Edit</button>
      <button class="ll-item js-reset"><i class='bx bx-key'></i> Reset password</button>
      <button class="ll-item danger js-del"><i class='bx bx-trash'></i> Delete</button>
    `;
    const arrow=document.createElement('div'); arrow.className='ll-pass-arrow';
    document.body.appendChild(pop); document.body.appendChild(arrow);

    requestAnimationFrame(()=>{
      positionPopNear(button, pop, arrow);
      pop.style.visibility='visible'; pop.style.opacity='1';
    });

    currentPop={el:pop, arrow};
    button.setAttribute('aria-expanded','true');

    pop.addEventListener('click',(ev)=>{
      if(ev.target.closest('.js-edit')) { openEditModal(id,tr); closePop(); }
      else if(ev.target.closest('.js-reset')) { openResetModal(id,tr); closePop(); }
      else if(ev.target.closest('.js-del'))   { openDeleteModal(id,tr); closePop(); }
    });

    const onDocClick=(e)=>{ if(!pop.contains(e.target) && e.target!==button) closePop(); };
    setTimeout(()=> document.addEventListener('click', onDocClick, { once:true }), 0);
    window.addEventListener('resize', closePop, { once:true });
    window.addEventListener('scroll', closePop, { once:true, capture:true });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closePop(); }, { once:true });
  }
  function bindRowActions(){
    $('#tbody').addEventListener('click',(ev)=>{
      const dot=ev.target.closest('.dots-btn'); if(!dot) return;
      const tr=ev.target.closest('tr[data-id]'); if(!tr) return;
      const id=+tr.getAttribute('data-id');
      ev.stopPropagation();
      showActionMenu(dot, id, tr);
    });
  }

  // ========= Modal helpers =========
  function openModal(title, contentHtml, onSubmit, submitText='Save'){
    const wrap=document.createElement('div');
    wrap.className='ll-modal-wrap';
    wrap.innerHTML=`
      <div class="ll-modal-mask"></div>
      <div class="ll-modal">
        <header class="ll-modal-head">
          <h3>${title}</h3>
          <button class="ll-modal-x" title="Close">×</button>
        </header>
        <div class="ll-modal-body">${contentHtml}</div>
        <footer class="ll-modal-foot">
          <button class="btn ghost ll-cancel">Cancel</button>
          <button class="btn primary ll-ok">${submitText}</button>
        </footer>
      </div>`;
    document.body.appendChild(wrap);
    const close=()=>wrap.remove();
    wrap.querySelector('.ll-modal-x').onclick=close;
    wrap.querySelector('.ll-modal-mask').onclick=close;
    wrap.querySelector('.ll-cancel').onclick=close;
    wrap.querySelector('.ll-ok').onclick=async()=>{ try{ await onSubmit(close);}catch(e){} };
    return wrap;
  }
  function inputRow(label,id,type='text',ph='',val=''){
    return `<label class="frow"><span>${label}</span><input id="${id}" type="${type}" placeholder="${ph}" value="${esc(val)}"/></label>`;
  }
  function selectRow(label,id,value='Librarian'){
    // SỬA Ở ĐÂY: Thêm 'Reader' vào danh sách và sắp xếp lại cho hợp lý
    const roles = ['Librarian', 'Admin', 'Reader'];
    const options = roles.map(r => `<option value="${r}"${value === r ? ' selected' : ''}>${r}</option>`).join('');
    return `<label class="frow"><span>${label}</span><select id="${id}">${options}</select></label>`;
  }
  const getVal=id=>(document.getElementById(id)?.value||'').trim();

  // ========= Email check + Password popup =========
  async function checkEmailExists(email){
    const url = `${API_CRUD}?action=check_email&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { credentials:'include', cache:'no-store' });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    return !!data.exists;
  }
  function attachEmailValidation(inputId){
    const el = document.getElementById(inputId);
    if (!el) return { ok: ()=>false, checkServer: async()=>false };
    el.addEventListener('input', ()=>{ el.setCustomValidity(''); el.reportValidity(); });
    return {
      ok: ()=> EMAIL_RE.test(el.value),
      async checkServer(){
        if (!EMAIL_RE.test(el.value)) return false;
        try{
          const exists = await checkEmailExists(el.value);
          if (exists) {
            el.setCustomValidity('Email đã tồn tại trong hệ thống');
            el.reportValidity();
            return false;
          }
          el.setCustomValidity('');
          el.reportValidity();
          return true;
        }catch{ return false; }
      }
    };
  }
  function attachPasswordPopup(input){
    let pop=null, arrow=null;
    function build(){
      pop=document.createElement('div');
      pop.className='ll-pass-pop';
      pop.innerHTML=`
        <div class="title">Password must meet:</div>
        <ul>
          <li data-k="lower"><span class="mark">•</span> At least 1 lowercase letter</li>
          <li data-k="upper"><span class="mark">•</span> At least 1 uppercase letter</li>
          <li data-k="digit"><span class="mark">•</span> At least 1 number</li>
          <li data-k="special"><span class="mark">•</span> At least 1 special character</li>
          <li data-k="len"><span class="mark">•</span> Be at least 8 characters</li>
          <li data-k="space"><span class="mark">•</span> No spaces</li>
        </ul>`;
      arrow=document.createElement('div'); arrow.className='ll-pass-arrow';
      document.body.appendChild(pop); document.body.appendChild(arrow);
      position(); update();
    }
    function remove(){
      pop?.remove(); arrow?.remove(); pop=null; arrow=null;
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      input.removeEventListener('input', update);
      input.removeEventListener('blur', onBlur);
    }
    function position(){
      const r=input.getBoundingClientRect();
      const pw=260, ph=180;
      let left=Math.min(window.innerWidth - pw - 8, Math.max(8, r.left));
      let top=r.bottom + 10;
      if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 12);
      if (pop){ pop.style.left=`${Math.round(left)}px`; pop.style.top=`${Math.round(top)}px`; }
      if (arrow){
        arrow.style.left=`${Math.round(r.left + Math.min(40, r.width/2))}px`;
        arrow.style.top =`${Math.round(r.bottom + 2)}px`;
      }
    }
    function update(){
      const v=input.value;
      const map={
        lower:/[a-z]/.test(v), upper:/[A-Z]/.test(v),
        digit:/\d/.test(v), special:/[^A-Za-z0-9]/.test(v),
        len:v.length>=8, space:!/\s/.test(v)
      };
      Object.entries(map).forEach(([k,ok])=>{
        const li=pop?.querySelector(`li[data-k="${k}"]`); if(!li) return;
        li.classList.toggle('ok', ok); li.classList.toggle('ng', !ok);
        li.querySelector('.mark').textContent = ok ? '✓' : '✕';
      });
    }
    function onBlur(){ setTimeout(remove,120); }
    input.addEventListener('focus', ()=>{ if (!pop) { build(); window.addEventListener('resize', position); window.addEventListener('scroll', position, true); input.addEventListener('input', update); input.addEventListener('blur', onBlur); }});
  }

  // ========= CRUD Modals =========
  function openCreateModal(){
    const html=`
      <form class="form">
        ${inputRow('Username','f-username','text','NguyenVanA')}
        ${inputRow('Email','f-email','email','email@gmail.com')}
        ${selectRow('Role','f-role','Librarian')}
        ${inputRow('Password','f-pass','password','••••••')}
        <div class="note muted">Tối thiểu 8 ký tự, có hoa, thường, số, ký tự đặc biệt và không khoảng trắng.</div>
      </form>`;
    openModal('Add Librarian', html, async (close)=>{
      const Username=getVal('f-username'), Email=getVal('f-email'), Role=getVal('f-role'), Password=getVal('f-pass');
      if (Username.length < 3) return toast('Username tối thiểu 3 ký tự','warn');
      if (!EMAIL_RE.test(Email)) return toast('Email phải là @gmail.com','warn');
      if (!(await emailCtl.checkServer())) return;
      if (!PASS_RE.test(Password)) return toast('Mật khẩu không đạt yêu cầu','warn');

      const res=await fetch(API_CRUD,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({Username,Email,Role,Password})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data.ok===false) return toast('Tạo thất bại: '+(data.error||`HTTP ${res.status}`),'danger');
      toast('Đã tạo thủ thư','ok'); close(); load();
    }, 'Create');

    const emailCtl = attachEmailValidation('f-email');
    attachPasswordPopup(document.getElementById('f-pass'));
  }

  function openEditModal(id,tr){
    const cur={ Username: tr.children[1]?.textContent?.trim()||'', Email: tr.children[2]?.textContent?.trim()||'', Role: tr.querySelector('.tag.role')?.textContent?.trim()||'Librarian' };
    const html=`
      <form class="form">
        ${inputRow('Username','f-username','text','',cur.Username)}
        ${inputRow('Email','f-email','email','',cur.Email)}
        ${selectRow('Role','f-role',cur.Role)}
        ${inputRow('New Password (optional)','f-pass','password','Để trống nếu không đổi')}
        <div class="note muted">Nếu đổi: mật khẩu phải mạnh và không có khoảng trắng.</div>
      </form>`;
    openModal('Edit Librarian', html, async (close)=>{
      const Username=getVal('f-username'), Email=getVal('f-email'), Role=getVal('f-role'), Password=getVal('f-pass');
      if (Username.length < 3) return toast('Username tối thiểu 3 ký tự','warn');
      if (!EMAIL_RE.test(Email)) return toast('Email phải là @gmail.com','warn');
      const exists = await checkEmailExists(Email).catch(()=>false);
      if (exists && Email !== cur.Email) return toast('Email đã tồn tại','warn');
      if (Password && !PASS_RE.test(Password)) return toast('Mật khẩu không đạt yêu cầu','warn');

      const body={Username,Email,Role}; if(Password) body.Password=Password;
      const res=await fetch(`${API_CRUD}?id=${id}`,{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data.ok===false) return toast('Cập nhật thất bại: '+(data.error||`HTTP ${res.status}`),'danger');
      toast('Đã cập nhật','ok'); close(); load();
    }, 'Save');

    attachPasswordPopup(document.getElementById('f-pass'));
    attachEmailValidation('f-email');
  }

  function openResetModal(id,tr){
    const name=tr.children[1]?.textContent?.trim()||`#${id}`;
    const html=`
      <form class="form">
        <div class="note">Đặt mật khẩu mới cho: <b>${esc(name)}</b></div>
        ${inputRow('New Password','f-pass','password','••••••')}
        <div class="note muted">Tối thiểu 8 ký tự, có hoa, thường, số, ký tự đặc biệt và không khoảng trắng.</div>
      </form>`;
    openModal('Reset Password', html, async (close)=>{
      const Password=getVal('f-pass');
      if (!PASS_RE.test(Password)) return toast('Mật khẩu không đạt yêu cầu','warn');
      const res=await fetch(`${API_CRUD}?action=reset_password&id=${id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({Password})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data.ok===false) return toast('Reset thất bại: '+(data.error||`HTTP ${res.status}`),'danger');
      toast('Đã đặt lại mật khẩu','ok'); close();
    }, 'Reset');

    attachPasswordPopup(document.getElementById('f-pass'));
  }

  function openDeleteModal(id,tr){
    const name=tr.children[1]?.textContent?.trim()||`#${id}`;
    const html=`<div class="confirm">
      <p>Bạn chắc chắn muốn xóa thủ thư <b>${esc(name)}</b> (ID ${id})?</p>
      <p class="muted">Hành động không thể hoàn tác.</p>
    </div>`;
    openModal('Delete Librarian', html, async (close)=>{
      const res=await fetch(`${API_CRUD}?id=${id}`,{method:'DELETE',credentials:'include'});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data.ok===false) return toast('Xoá thất bại: '+(data.error||`HTTP ${res.status}`),'danger');
      toast('Đã xóa','ok'); close(); load();
    }, 'Delete');
  }

  // Toast
  function toast(msg,type='ok'){
    let box=document.getElementById('lib-toast');
    if(!box){ box=document.createElement('div'); box.id='lib-toast'; box.className='toast'; document.body.appendChild(box); }
    box.className=`toast ${type}`; box.textContent=msg; box.style.display='block';
    setTimeout(()=>box.style.display='none',1800);
  }

  // Load/init
  async function load(){
    try{
      $('#tbody').innerHTML=skeletonRows(state.limit);
      const j=await fetchList();
      renderRows(j.items||[]);
      $('#showing').textContent=fmtShowing(j.page,j.limit,j.total);
      $('#btnPrev').disabled=j.page<=1; $('#btnNext').disabled=j.page>=j.total_pages;
      renderPager(j.page,j.total_pages);
      bindRowActions();
    }catch(e){
      $('#tbody').innerHTML=`<tr><td colspan="5" class="empty" style="color:#b91c1c">Lỗi: ${esc(e.message)}</td></tr>`;
      $('#showing').textContent='Lỗi tải dữ liệu';
      $('#btnPrev').disabled=true; $('#btnNext').disabled=true; $('#pages').innerHTML='';
      if(String(e.message).includes('401')) setTimeout(()=>window.location.href=`${BASE}/public/html/accounts/sign_in.html?noauto=1`,1200);
    }
  }
  function init(container){
    container.innerHTML=template();
    bindSort(); bindTopBar(); load();
  }

  return { init };
})();
