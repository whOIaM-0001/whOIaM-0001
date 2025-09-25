// notifications_category.js
// Lightweight toast + confirm + result UI cho module Thể loại (đồng nhất với Books)

(function () {
  // Nếu đã có API giống Books rồi thì không đăng ký lại
  if (window.showToast && window.showConfirm && window.showResult) return;

  const rootId = 'ui-notify-root';
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement('div');
    root.id = rootId;
    document.body.appendChild(root);
  }

  // build containers
  let toastContainer = root.querySelector('.ui-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'ui-toast-container';
    root.appendChild(toastContainer);
  }

  function makeToast(type, title, text, duration = 3500) {
    const box = document.createElement('div');
    const t = (type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'info');
    box.className = `ui-toast ${t}`;
    box.innerHTML = `
      <div class="icon">${t === 'success' ? '✓' : t === 'error' ? '✕' : t === 'warn' ? '!' : 'i'}</div>
      <div class="body"><div class="title">${escape(title)}</div><div class="text">${escape(text)}</div></div>
    `;
    box.style.opacity = '0';
    toastContainer.appendChild(box);
    requestAnimationFrame(()=> box.style.opacity = '1');
    const timer = setTimeout(() => removeToast(box), duration);
    box.addEventListener('click', () => { clearTimeout(timer); removeToast(box); });
    return box;
  }
  function removeToast(el) {
    if (!el) return;
    el.style.transition = 'opacity .18s, transform .18s';
    el.style.opacity = '0';
    setTimeout(()=> el.remove(), 220);
  }
  function escape(s) { return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // result modal (center card)
  function showResult(kind='success', title='Success', message='', btnText='OK') {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'ui-result-backdrop';
      backdrop.innerHTML = `
        <div class="ui-result-card ${kind}">
          <div class="big-icon">${kind === 'success' ? '✔' : '✕'}</div>
          <h3>${escape(title)}</h3>
          <p>${escape(message)}</p>
          <div class="btns"><button class="btn-ghost">Close</button><button class="btn-primary">${escape(btnText)}</button></div>
        </div>
      `;
      document.body.appendChild(backdrop);

      const onYes = () => { backdrop.remove(); resolve(true); };
      const onNo  = () => { backdrop.remove(); resolve(false); };

      backdrop.querySelector('.btn-primary').addEventListener('click', onYes);
      backdrop.querySelector('.btn-ghost').addEventListener('click', onNo);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) onNo(); });
    });
  }

  // confirm modal -> Promise<boolean>
  function showConfirm(title='Xác nhận', message='Bạn có chắc không?', okText='OK', cancelText='Hủy') {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'ui-result-backdrop';
      backdrop.innerHTML = `
        <div class="ui-result-card error">
          <div class="big-icon">?</div>
          <h3>${escape(title)}</h3>
          <p>${escape(message)}</p>
          <div class="btns">
            <button class="btn-ghost">${escape(cancelText)}</button>
            <button class="btn-primary">${escape(okText)}</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      const onYes = () => { backdrop.remove(); resolve(true); };
      const onNo  = () => { backdrop.remove(); resolve(false); };

      backdrop.querySelector('.btn-primary').addEventListener('click', onYes);
      backdrop.querySelector('.btn-ghost').addEventListener('click', onNo);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) onNo(); });
    });
  }

  // Public API như Books
  window.showToast = function(type='success', title='OK', message='', duration=3500) {
    try { makeToast(type, title, message, duration); } catch(e){ console.warn(e) }
  };
  window.showResult = showResult;
  window.showConfirm = showConfirm;
})();