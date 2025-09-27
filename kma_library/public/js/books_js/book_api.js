// book_api.js
// Exposes BookAPI object for frontend usage (SPA-safe: no redeclare).
if (!window.BookAPI) window.BookAPI = (function(){
  const API_BASE = location.origin + '/kma_library/library_api/functions/function_books/command/books';
  const DB_PATH = API_BASE + '/books_database';
  const MANAGE_PATH = API_BASE + '/book_manage';
  return {
    list: async function(q='') {
      const url = q ? `${DB_PATH}/books_read.php?q=${encodeURIComponent(q)}` : `${DB_PATH}/books_read.php`;
  const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error || 'API error');
      return payload.data;
    },
    get: async function(id) {
  const res = await fetch(`${DB_PATH}/books_read.php?id=${encodeURIComponent(id)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error || 'API error');
      return payload.data;
    },
    create: async function(data) {
      const res = await fetch(`${MANAGE_PATH}/books_create.php`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Create failed');
      return payload;
    },
    update: async function(id, data) {
      const res = await fetch(`${MANAGE_PATH}/books_update.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const payload = await res.json().catch(()=>({error:'invalid json'}));
      if (!res.ok) throw new Error(payload.error || 'Update failed');
      return payload;
    },
    remove: async function(id) {
      const res = await fetch(`${MANAGE_PATH}/books_delete.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const payload = await res.json().catch(()=>({error:'invalid json'}));
      if (!res.ok) throw new Error(payload.error || 'Delete failed');
      return payload;
    },
    table: async function() {
      const res = await fetch(`${DB_PATH}/books_table.php`, { credentials: 'include' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    }
  };
})();