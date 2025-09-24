// KMA Library - Logout handler (v2)
(function () {
  const ROOT = '/' + location.pathname.split('/')[1]; // "/kma_library"
  const BASE = location.origin + ROOT;
  const API_SIGNIN = `${BASE}/library_api/functions/function_books/command/accounts/sign_in.php`;
  const API_SIGNOUT = `${BASE}/library_api/functions/function_books/command/accounts/sign_out.php`;
  const SIGNIN = `${BASE}/public/html/accounts/sign_in.html`;

  function goSignin(opts = { noauto: false }) {
    const url = opts.noauto ? `${SIGNIN}?noauto=1` : SIGNIN;
    window.location.replace(url);
  }

  async function doLogout() {
    try {
      const res = await fetch(API_SIGNOUT, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      // Dù thành công hay không, cứ quay về trang đăng nhập
      if (!res.ok) {
        console.debug('[logout] API non-200 -> go signin with noauto');
        return goSignin({ noauto: true });
      }
      console.debug('[logout] success -> go signin');
      goSignin();
    } catch (e) {
      console.debug('[logout] fetch error ->', e);
      goSignin({ noauto: true });
    }
  }

  function onLogoutClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const el = ev.currentTarget || ev.target;
    el?.setAttribute?.('aria-busy', 'true');
    doLogout();
  }

  function bindLogout() {
    // 1) Gắn trực tiếp vào id cố định
    const btn = document.getElementById('btnLogout');
    if (btn) {
      // Bắt cả capture để “đi trước” các handler khác
      btn.addEventListener('click', onLogoutClick, { capture: true });
      btn.addEventListener('pointerup', onLogoutClick, { capture: true });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') onLogoutClick(e);
      }, { capture: true });
    }

    // 2) Dự phòng: uỷ quyền để bắt các phần tử có class/attr logout khác
    document.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-action="logout"], a.logout, button.logout');
      if (!el) return;
      onLogoutClick(ev);
    }, { capture: true });

    console.debug('[logout] bound');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLogout);
  } else {
    bindLogout();
  }
})();