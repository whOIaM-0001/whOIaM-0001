// notifications_publishers.js
// Reuse toast + confirm + result UI (đồng nhất với Books). Không override nếu đã có.
(function () {
  if (window.showToast && window.showConfirm && window.showResult) return;

  const rootId = 'ui-notify-root';
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement('div');
    root.id = rootId;
    document.body.appendChild(root);
  }

  let toastContainer = root.querySelector('.ui-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'ui-toast-container';
    root.appendChild(toastContainer);
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function makeToast(type='info', title='', text='', duration = 3500) {
    const t = (type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'info');
    const box = document.createElement('div');
    box.className = `ui-toast ${t}`;
    box.innerHTML = `
      <div class="icon">${t === 'success' ? '✓' : t === 'error' ? '✕' : t === 'warn' ? '!' : 'i'}</div>
      <div class="body"><div class="title">${escapeHtml(title)}</div><div class="text">${escapeHtml(text)}</div></div>
    `;
    box.style.opacity = '0';
    toastContainer.appendChild(box);
    requestAnimationFrame(()=> box.style.opacity = '1');
    const timer = setTimeout(() => removeToast(box), duration);
    box.addEventListener('click', () => { clearTimeout(timer); removeToast(box); });
  }
  function removeToast(el) {
    if (!el) return;
    el.style.transition = 'opacity .18s, transform .18s';
    el.style.opacity = '0';
    setTimeout(()=> el.remove(), 220);
  }

  function showResult(kind='success', title='Success', message='', btnText='OK') {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'ui-result-backdrop';
      backdrop.innerHTML = `
        <div class="ui-result-card ${kind}">
          <div class="big-icon">${kind === 'success' ? '✔' : '✕'}</div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(message)}</p>
          <div class="btns"><button class="btn-ghost">Close</button><button class="btn-primary">${escapeHtml(btnText)}</button></div>
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

  function showConfirm(title='Xác nhận', message='Bạn có chắc không?', okText='OK', cancelText='Hủy') {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'ui-result-backdrop';
      backdrop.innerHTML = `
        <div class="ui-result-card error">
          <div class="big-icon">?</div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(message)}</p>
          <div class="btns">
            <button class="btn-ghost">${escapeHtml(cancelText)}</button>
            <button class="btn-primary">${escapeHtml(okText)}</button>
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

  window.showToast = function(type='success', title='OK', message='', duration=3500) {
    try { makeToast(type, title, message, duration); } catch(e){ console.warn(e); }
  };
  window.showResult = showResult;
  window.showConfirm = showConfirm;
})();