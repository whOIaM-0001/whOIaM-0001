// Redirect về trang đăng nhập nếu chưa có session
(function(){
  const ROOT = '/' + location.pathname.split('/')[1];
  const BASE = location.origin + ROOT;
  const SIGNIN = `${BASE}/public/html/accounts/sign_in.html`;
  const ME = `${BASE}/library_api/functions/function_books/command/accounts/sign_in.php?action=me`;
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch(ME, { cache: 'no-store', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || !data.user) window.location.replace(SIGNIN);
    } catch {
      window.location.replace(SIGNIN);
    }
  });
})();