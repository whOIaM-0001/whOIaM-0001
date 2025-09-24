// Loader - bump version để chắc chắn tải bản mới
(function(){
  const MODULE_JS  = 'public/js/admin/Librarians_list.js?v=20250923-99';
  const MODULE_CSS = 'public/css/admin/Librarians_list.css?v=20250920-01';
  const MODULE_TARGET = 'librarians-list';
  const CONTAINER_ID = 'module-root';

  function ensureCss(href){
    const id = 'css-' + href.replace(/[^\w-]/g,'_');
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = href;
    document.head.appendChild(link);
  }
  function loadScriptOnce(src){
    return new Promise((resolve, reject) => {
      const id = 'js-' + src.replace(/[^\w-]/g,'_');
      if (document.getElementById(id)) return resolve();
      const s = document.createElement('script');
      s.id = id; s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.body.appendChild(s);
    });
  }
  async function showLibrariansModule(){
    try{
      ensureCss(MODULE_CSS);
      await loadScriptOnce(MODULE_JS);
      const root = document.getElementById(CONTAINER_ID);
      if (!root) return;
      root.innerHTML = '';
      if (window.LibrariansListModule?.init) {
        window.LibrariansListModule.init(root);
      } else {
        root.innerHTML = '<div style="padding:16px">Module Librarians_list đã nạp nhưng chưa sẵn sàng.</div>';
      }
      document.querySelectorAll('li.bullet[data-target]').forEach(li=>li.classList.remove('active'));
      document.querySelector(`li.bullet[data-target="${MODULE_TARGET}"]`)?.classList.add('active');
      if (location.hash !== '#/librarians') history.replaceState(null, '', '#/librarians');
    }catch(e){
      console.error(e);
      const root = document.getElementById(CONTAINER_ID);
      if (root) root.innerHTML = `<div style="padding:16px;color:#b91c1c">Lỗi nạp module: ${e.message}</div>`;
    }
  }
  function bind(){
    document.addEventListener('click', (ev) => {
      const li = ev.target.closest(`li.bullet[data-target="librarians-list"]`);
      if (!li) return;
      ev.preventDefault(); ev.stopPropagation();
      showLibrariansModule();
    }, { capture: true });
    if (location.hash === '#/librarians') showLibrariansModule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();