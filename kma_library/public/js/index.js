// index.js — Xử lý sidebar, submenu, profile cho toàn bộ app
(function () {
  const $ = s => document.querySelector(s);
  const sidebar = $('#sidebar');
  const btnHamburger = $('#btn-hamburger');
  const profile = $('#profile') || document.querySelector('.profile');
  const profileMenuOrig = document.getElementById('profile-menu') || document.querySelector('.profile-menu');

  // ========== Sidebar hamburger + hover-expand ==========
  if (btnHamburger && sidebar) {
    let openTimer = null;
    let closeTimer = null;

    function setDocSidebarState() {
      const isCollapsed = sidebar.classList.contains('collapsed');
      const isTemp = sidebar.classList.contains('expand-temp');
      // aria-expanded true khi thực sự đang mở (không collapsed) hoặc đang mở tạm
      const expanded = (!isCollapsed) || isTemp;
      sidebar.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      // Cho phép CSS ngoài cùng biết trạng thái
      document.documentElement.classList.toggle('sidebar-collapsed', isCollapsed && !isTemp);
      document.documentElement.classList.toggle('sidebar-expanded', expanded);
    }

    function openTemp() {
      const isCollapsed = sidebar.classList.contains('collapsed');
      const isLocked = sidebar.classList.contains('locked'); // locked-collapsed
      if (isCollapsed && !isLocked) {
        sidebar.classList.add('expand-temp');
        setDocSidebarState();
      }
    }
    function closeTemp() {
      sidebar.classList.remove('expand-temp');
      setDocSidebarState();
    }

    // Hover expand (tạm)
    sidebar.addEventListener('pointerenter', () => {
      clearTimeout(closeTimer);
      openTimer = setTimeout(openTemp, 80);
    });
    sidebar.addEventListener('pointerleave', () => {
      clearTimeout(openTimer);
      closeTimer = setTimeout(closeTemp, 120);
    });

    // Hamburger toggle
    btnHamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(openTimer); clearTimeout(closeTimer);

      const isCollapsed = sidebar.classList.contains('collapsed');
      const isHoverExpand = sidebar.classList.contains('expand-temp');

      if (isCollapsed) {
        // Đang thu gọn → mở
        // Nếu đang mở tạm do hover, bấm hamburger sẽ mở cố định (bỏ collapsed + expand-temp)
        sidebar.classList.remove('collapsed', 'locked', 'expand-temp');
      } else {
        // Đang mở → thu gọn và khóa (không mở tạm khi hover)
        sidebar.classList.add('collapsed', 'locked');
        sidebar.classList.remove('expand-temp');
      }
      setDocSidebarState();
    });

    // Khởi tạo state ban đầu
    setDocSidebarState();
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
              'dashboard': '/kma_library/public/html/dashboard/dashboard_admin.html',
              'cardregister': '/kma_library/public/html/cardregister/cardregister.html',
              'bookloan': '/kma_library/public/html/bookloan/bookloan.html',
              'statistical': '/kma_library/public/html/statistical/statistical_books.html',
              'readers': '/kma_library/public/html/readers/readers.html',
              'statisticalbookloan': '/kma_library/public/html/statistical/statistical_bookloan.html'

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
        window._injectedModals.forEach(m => {
          try {
            if (m && m.parentElement === document.body) document.body.removeChild(m);
          } catch(e){}
        });
      }
      window._injectedModals = [];
      if (window._injectedScripts && Array.isArray(window._injectedScripts)) {
        window._injectedScripts.forEach(s => { try { if (s && s.parentElement) s.parentElement.removeChild(s); } catch(e){} });
      }
      window._injectedScripts = [];

      const txt = await fetchText(url);
      const doc = new DOMParser().parseFromString(txt, 'text/html');
      const moduleContent = doc.querySelector('main.content') || doc.querySelector('.module') || doc.body;

      root.innerHTML = '';

      // Import tất cả modal (kể cả modal ngoài <main>)
      const docModals = Array.from(doc.querySelectorAll('.modal'));
      docModals.forEach(m => {
        const clone = m.cloneNode(true);
        document.body.appendChild(clone);
        window._injectedModals.push(clone);
      });
      // Xóa modal còn lại trong moduleContent để tránh duplicate
      Array.from(moduleContent.querySelectorAll('.modal')).forEach(m => m.remove());
      // Bỏ stylesheet nội bộ
      Array.from(moduleContent.querySelectorAll('link[rel="stylesheet"]')).forEach(l => { try { l.parentElement?.removeChild(l); } catch(e){} });

      root.appendChild(moduleContent.cloneNode(true));

      // Nạp scripts của module
      const scriptEls = Array.from(doc.querySelectorAll('script[src]'));
      for (const sEl of scriptEls) {
        try {
          const relSrc = sEl.getAttribute('src');
          if (!relSrc) continue;
          const absSrc = new URL(relSrc, url).href;
          if (absSrc.includes('/js/index.js')) continue;
          try {
            const pathname = new URL(absSrc, location.href).pathname;
            if (pathname.endsWith('/books_js/book_api.js') && window.BookAPI) continue;
            if (pathname.endsWith('/categories_js/categories_api.js') && window.CategoryAPI) continue;
          } catch(e){}
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
    'dashboard': location.origin + '/kma_library/public/html/dashboard/dashboard_admin.html',
    'cardregister': location.origin + '/kma_library/public/html/cardregister/cardregister.html',
    'bookloan': location.origin + '/kma_library/public/html/bookloan/bookloan.html',
    'statistical': location.origin + '/kma_library/public/html/statistical/statistical_books.html',
    'readers': location.origin + '/kma_library/public/html/readers/readers.html',
    'statisticalbookloan': location.origin + '/kma_library/public/html/statistical/statistical_bookloan.html'
  };

  async function navigateTo(target) {
    target = String(target || '').toLowerCase();
    const url = MODULE_MAP[target];
    if (!url) { console.warn('No module mapping for', target); return; }
    try { window.closeAllActionMenus && window.closeAllActionMenus(); } catch(e){}
    await loadModuleFromUrl(url);
    document.querySelectorAll('nav.menu .bullet').forEach(b => b.classList.toggle('active', (b.dataset.target||'').toLowerCase()===target));
  }

  // Expose navigateTo globally
  window.navigateTo = navigateTo;

  // Load default module (dashboard) reliably
  function loadDefault() { try { navigateTo('dashboard'); } catch(e){ console.error(e); } }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', loadDefault); else setTimeout(loadDefault, 10);
})();