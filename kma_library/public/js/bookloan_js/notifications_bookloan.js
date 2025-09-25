// notifications_bookloan.js — dùng chung toast/confirm/result; không override nếu đã có.
(function () {
  if (window.showToast && window.showConfirm && window.showResult) return;

  const rootId = 'ui-notify-root';
  let root = document.getElementById(rootId);
  if (!root) { root = document.createElement('div'); root.id = rootId; document.body.appendChild(root); }

  let toastContainer = root.querySelector('.ui-toast-container');
  if (!toastContainer) { toastContainer = document.createElement('div'); toastContainer.className = 'ui-toast-container'; root.appendChild(toastContainer); }

  function esc(s){ return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function makeToast(type='info', title='', text='', duration=3500){
    const t = type==='success'?'success': type==='error'?'error': type==='warn'?'warn':'info';
    const el = document.createElement('div');
    el.className = `ui-toast ${t}`;
    el.innerHTML = `<div class="icon">${t==='success'?'✓':t==='error'?'✕':t==='warn'?'!':'i'}</div><div class="body"><div class="title">${esc(title)}</div><div class="text">${esc(text)}</div></div>`;
    el.style.opacity='0'; toastContainer.appendChild(el); requestAnimationFrame(()=> el.style.opacity='1');
    const timer = setTimeout(()=> removeToast(el), duration); el.addEventListener('click', ()=> { clearTimeout(timer); removeToast(el); });
  }
  function removeToast(el){ if(!el) return; el.style.transition='opacity .18s, transform .18s'; el.style.opacity='0'; setTimeout(()=> el.remove(), 220); }

  function showResult(kind='success', title='Success', message='', btnText='OK'){
    return new Promise((resolve)=>{
      const backdrop = document.createElement('div');
      backdrop.className='ui-result-backdrop';
      backdrop.innerHTML = `
        <div class="ui-result-card ${kind}">
          <div class="big-icon">${kind==='success'?'✔':'✕'}</div>
          <h3>${esc(title)}</h3>
          <p>${esc(message)}</p>
          <div class="btns"><button class="btn-ghost">Close</button><button class="btn-primary">${esc(btnText)}</button></div>
        </div>`;
      document.body.appendChild(backdrop);
      const yes = ()=> { backdrop.remove(); resolve(true); };
      const no  = ()=> { backdrop.remove(); resolve(false); };
      backdrop.querySelector('.btn-primary').addEventListener('click', yes);
      backdrop.querySelector('.btn-ghost').addEventListener('click', no);
      backdrop.addEventListener('click', (e)=> { if (e.target===backdrop) no(); });
    });
  }
  function showConfirm(title='Xác nhận', message='Bạn có chắc không?', okText='OK', cancelText='Hủy'){
    return new Promise((resolve)=>{
      const backdrop = document.createElement('div');
      backdrop.className='ui-result-backdrop';
      backdrop.innerHTML = `
        <div class="ui-result-card error">
          <div class="big-icon">?</div>
          <h3>${esc(title)}</h3>
          <p>${esc(message)}</p>
          <div class="btns"><button class="btn-ghost">${esc(cancelText)}</button><button class="btn-primary">${esc(okText)}</button></div>
        </div>`;
      document.body.appendChild(backdrop);
      const yes = ()=> { backdrop.remove(); resolve(true); };
      const no  = ()=> { backdrop.remove(); resolve(false); };
      backdrop.querySelector('.btn-primary').addEventListener('click', yes);
      backdrop.querySelector('.btn-ghost').addEventListener('click', no);
      backdrop.addEventListener('click', (e)=> { if (e.target===backdrop) no(); });
    });
  }

  window.showToast = function(type='success', title='OK', message='', duration=3500){ try { makeToast(type,title,message,duration); } catch(e){} };
  window.showResult = showResult;
  window.showConfirm = showConfirm;
})();