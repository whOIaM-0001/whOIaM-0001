// public/js/categories/category_api.js — SPA-safe
if (!window.CategoryAPI) window.CategoryAPI = (function(){
  const CANDIDATES = [
    // CRUD endpoint (bản bạn gửi có đủ GET/POST/PUT/DELETE)
    location.origin + '/kma_library/library_api/functions/function_books/command/books/books_database/categories.php',
    location.origin + '/kma_library/library_api/functions/function_categories/categories.php',
    './categories.php'
  ];
  async function call(method='GET', path='', body=null) {
    let lastErr;
    for (const base of CANDIDATES) {
      try {
        const url = path ? `${base}${path}` : base;
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type':'application/json' },
          credentials: 'include',
          body: body ? JSON.stringify(body) : null
        });
        const payload = await res.json().catch(()=>({ ok:false, error: 'invalid json' }));
        if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);
        return payload;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('No endpoint reachable');
  }
  return {
    list: async (q='') => call('GET', q ? `?q=${encodeURIComponent(q)}` : ''),
    get: async (id) => call('GET', `?id=${encodeURIComponent(id)}`),
    create: async (data) => call('POST', '', data),
    update: async (id, data) => call('PUT', `?id=${encodeURIComponent(id)}`, data),
    remove: async (id) => call('DELETE', `?id=${encodeURIComponent(id)}`)
  };
})();