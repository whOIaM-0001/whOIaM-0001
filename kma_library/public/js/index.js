// index.js — Xử lý sidebar, submenu, profile cho toàn bộ app
(function () {
  const $ = s => document.querySelector(s);
  const sidebar = $('#sidebar');
  const btnHamburger = $('#btn-hamburger');
  const profile = $('#profile') || document.querySelector('.profile');
  const profileMenuOrig = document.getElementById('profile-menu') || document.querySelector('.profile-menu');

  // Sidebar hamburger toggle
  if (btnHamburger && sidebar) {
    btnHamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = sidebar.classList.contains('collapsed');
      const isHoverExpand = sidebar.classList.contains('expand-temp');
      if (isCollapsed && isHoverExpand) { sidebar.classList.remove('collapsed','locked','expand-temp'); return; }
      if (sidebar.classList.contains('collapsed')) sidebar.classList.remove('collapsed','locked'); else sidebar.classList.add('collapsed','locked');
    });
    sidebar.addEventListener('mouseenter', ()=> { if (sidebar.classList.contains('collapsed') && !sidebar.classList.contains('locked')) sidebar.classList.add('expand-temp'); });
    sidebar.addEventListener('mouseleave', ()=> sidebar.classList.remove('expand-temp'));
  }

  // Sidebar menu/submenu logic
  (function initSidebarMenu() {
    const menuNav = document.querySelector('nav.menu');
    if (!menuNav) return;
    menuNav.addEventListener('click', (e) => {
      const link = e.target.closest('.menu-link');
      if (link && menuNav.contains(link)) {
        e.preventDefault();
        const li = link.parentElement;
        const willOpen = !li.classList.contains('open');
        Array.from(menuNav.querySelectorAll('.has-children.open')).forEach(sib => { if (sib !== li) sib.classList.remove('open'); });
        li.classList.toggle('open', willOpen);
        return;
      }
      const bullet = e.target.closest('.bullet');
      if (bullet && menuNav.contains(bullet)) {
        const target = bullet.dataset.target;
        if (target) {
          // prefer app-level navigateTo if provided, otherwise use built-in mapping
          if (typeof navigateTo === 'function') {
            try { navigateTo(target); } catch(e) { console.error('navigateTo handler failed', e); }
          } else {
            // fallback mapping
            const map = {
              'books': '/kma_library/public/html/books/books.html',
              'category': '/kma_library/public/html/categories/categories.html',
              'publisher': '/kma_library/public/html/publishers/publishers.html',
              'dashboard': '/kma_library/public/html/dashboard/dashboard_admin.html'
            };
            const href = map[target] || map[target.toLowerCase()];
            if (href) {
              try { location.href = location.origin + href; } catch(e) { location.href = href; }
            } else {
              console.warn('Unknown navigation target', target);
            }
          }
        }
      }
    });
    menuNav.addEventListener('keydown', (e) => {
      const link = e.target.closest('.menu-link'); if (!link) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); link.click(); }
    });
  })();

  // Profile menu logic
  (function initProfileMenu(){
    const profileEl = profile;
    let menu = profileMenuOrig;
    if (!profileEl || !menu) return;
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    menu.id = menu.id || 'profile-menu-root';
    menu.classList.add('profile-menu');
    Object.assign(menu.style, { position:'fixed', display:'none', pointerEvents:'auto', zIndex:'100000', minWidth: menu.style.minWidth || '160px', boxSizing:'border-box' });
    menu.setAttribute('aria-hidden','true');

    function positionMenu(){ try {
      const pRect = profileEl.getBoundingClientRect();
      menu.style.left='0px'; menu.style.top='0px'; menu.style.visibility='hidden'; menu.style.display='block';
      const mRect = menu.getBoundingClientRect(); const menuW = mRect.width, menuH = mRect.height;
      let left = Math.round(pRect.right - menuW); if (left < 8) left = 8;
      if (left + menuW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - menuW);
      let top = Math.round(pRect.bottom + 8);
      if (top + menuH > window.innerHeight - 8) { top = pRect.top - menuH - 8; if (top < 8) top = 8; }
      menu.style.left = left + 'px'; menu.style.top = top + 'px'; menu.style.visibility = 'visible'; menu.setAttribute('aria-hidden','false');
    } catch(e){ menu.style.left = (window.innerWidth - menu.offsetWidth - 8) + 'px'; menu.style.top = '48px'; } }

    function debounce(fn, t) { let timer; return (...a) => { clearTimeout(timer); timer = setTimeout(() => fn(...a), t); }; }
    const reposition = debounce(()=> { if (menu.style.display === 'block') positionMenu(); }, 60);
    function showMenu(){ menu.style.display='block'; menu.setAttribute('aria-hidden','false'); positionMenu(); setTimeout(()=> menu.querySelector('a,button')?.focus(), 10); }
    function hideMenu(){ try { if (menu.contains(document.activeElement)) document.activeElement.blur(); } catch(e){} menu.style.display='none'; menu.setAttribute('aria-hidden','true'); }

    profileEl.addEventListener('click', (ev)=> { ev.stopPropagation(); if (menu.style.display === 'block') hideMenu(); else showMenu(); });
    menu.addEventListener('click', (ev)=> ev.stopPropagation());

    if (!menu.__profileBound) {
      Array.from(menu.querySelectorAll('a,button')).forEach(item => {
        item.style.cursor='pointer';
        item.addEventListener('click', (e)=> {
          e.preventDefault(); e.stopPropagation();
          hideMenu();
          try { if (document.activeElement) document.activeElement.blur(); } catch(e){}
          const id = (item.id || item.dataset.action || (item.textContent||'')).toLowerCase();
          if (id.includes('setting')) { if (typeof openSettings === 'function') openSettings(); else console.log('Open setting'); return; }
          if (id.includes('my-profile') || id.includes('profile')) { if (typeof openProfile === 'function') openProfile(); else console.log('Open my profile'); return; }
          if (id.includes('logout')) { if (typeof doLogout === 'function') doLogout(); else console.log('Logout'); return; }
          console.log('Profile action:', id);
        }, { passive:false });
      });
      menu.__profileBound = true;
    }

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
  })();

  // Module loader: load module HTML into #module-root without leaving index.html
  // navigateTo(target) — target values: 'books', 'category', 'publisher', 'dashboard'
  async function fetchText(url) { const res = await fetch(url); if (!res.ok) throw new Error('Fetch failed ' + res.status); return await res.text(); }

  async function loadModuleFromUrl(url) {
    const root = document.getElementById('module-root');
    if (!root) throw new Error('#module-root not found');
    try {
      // Teardown previously injected module artifacts
      if (window._injectedModals && Array.isArray(window._injectedModals)) {
        window._injectedModals.forEach(m => { try { if (m && m.parentElement) m.parentElement.removeChild(m); } catch(e){} });
      }
      window._injectedModals = [];
      if (window._injectedScripts && Array.isArray(window._injectedScripts)) {
        window._injectedScripts.forEach(s => { try { if (s && s.parentElement) s.parentElement.removeChild(s); } catch(e){} });
      }
      window._injectedScripts = [];

      const txt = await fetchText(url);
      // parse the returned HTML and extract the main content (inside <body>) and scripts
      const doc = new DOMParser().parseFromString(txt, 'text/html');
      // NOTE: We intentionally do NOT inject module-specific CSS here.
      // The shell index.html already includes the shared styles.
      // Skipping CSS injection prevents 404s from mis-resolved relative paths and duplicates.
      // prefer the first <main> or .content or whole body
      const moduleContent = doc.querySelector('main.content') || doc.querySelector('.module') || doc.body;
      // clear module root and inject
      root.innerHTML = '';
      // import modal elements to body (so modals behave correctly)
  const modals = moduleContent.querySelectorAll('.modal');
  modals.forEach(m => { document.body.appendChild(m); window._injectedModals.push(m); });
  // append the rest of content into module root (remove modals and stray link tags first)
  modals.forEach(m => { if (m.parentElement) m.parentElement.removeChild(m); });
  // remove any stylesheet links inside module content to avoid 404s; shell already includes CSS
  Array.from(moduleContent.querySelectorAll('link[rel="stylesheet"]')).forEach(l => { try { l.parentElement?.removeChild(l); } catch(e){} });
      root.appendChild(moduleContent.cloneNode(true));

      // load module scripts referenced at end of document (script[src])
      const scriptEls = Array.from(doc.querySelectorAll('script[src]'));
      for (const sEl of scriptEls) {
        try {
          const relSrc = sEl.getAttribute('src');
          if (!relSrc) continue;
          const absSrc = new URL(relSrc, url).href;
          // avoid loading the global index.js again
          if (absSrc.includes('/js/index.js')) continue;
          // avoid reloading API modules if already available
          try {
            const pathname = new URL(absSrc, location.href).pathname;
            if (pathname.endsWith('/books_js/book_api.js') && window.BookAPI) continue;
            if (pathname.endsWith('/categories_js/categories_api.js') && window.CategoryAPI) continue;
          } catch(e){}
          // Always load module scripts fresh (we removed previous ones above)
          const el = document.createElement('script');
          const cacheBuster = (absSrc.includes('?') ? '&' : '?') + 'v=' + Date.now();
          el.src = absSrc + cacheBuster;
          el.defer = false;
          document.body.appendChild(el);
          window._injectedScripts.push(el);
          await new Promise((res, rej)=> { el.onload = res; el.onerror = () => rej(new Error('Script load error ' + absSrc)); });
        } catch(e) { throw e; }
      }
      return true;
    } catch (err) {
      console.error('loadModuleFromUrl failed', err);
      const root = document.getElementById('module-root'); if (root) root.innerHTML = '<div class="card"><div class="card-body">Không thể tải module.</div></div>';
      return false;
    }
  }

  // mapping to module HTML files (absolute paths under public/html)
  const MODULE_MAP = {
    'books': location.origin + '/kma_library/public/html/books/books.html',
    'category': location.origin + '/kma_library/public/html/categories/categories.html',
    'publisher': location.origin + '/kma_library/public/html/publishers/publishers.html',
    'dashboard': location.origin + '/kma_library/public/html/dashboard/dashboard_admin.html'
  };

  async function navigateTo(target) {
    target = String(target || '').toLowerCase();
    const url = MODULE_MAP[target];
    if (!url) { console.warn('No module mapping for', target); return; }
    // visually collapse any open action menus
    try { window.closeAllActionMenus && window.closeAllActionMenus(); } catch(e){}
    await loadModuleFromUrl(url);
    // update active state in sidebar (simple)
    document.querySelectorAll('nav.menu .bullet').forEach(b => b.classList.toggle('active', (b.dataset.target||'').toLowerCase()===target));
  }

  // Expose navigateTo globally
  window.navigateTo = navigateTo;

  // Load default module (dashboard) reliably
  function loadDefault() { try { navigateTo('dashboard'); } catch(e){ console.error(e); } }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', loadDefault); else setTimeout(loadDefault, 10);
})();
