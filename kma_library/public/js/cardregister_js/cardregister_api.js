// cardregister_api.js — API wrapper cho cardregister.php (idempotent)
if (!window.CardAPI) window.CardAPI = (function(){
  const API_BASE = location.origin + '/kma_library/library_api/functions/function_books/command/card/card_manage/cardregister.php';

  async function jsonOrError(res){
    let data;
    try { data = await res.json(); } catch(e){ data = { ok:false, error: 'Invalid JSON' }; }
    if (!res.ok) return { ok:false, error: data?.error || res.statusText || 'HTTP '+res.status };
    return data;
  }

  return {
    async list(q=''){
      const url = new URL(API_BASE);
      if (q) url.searchParams.set('q', q);
  const res = await fetch(url.toString(), { method: 'GET', credentials: 'include' });
      return jsonOrError(res);
    },
    async get(id){
      const url = new URL(API_BASE);
      url.searchParams.set('id', id);
  const res = await fetch(url.toString(), { method: 'GET', credentials: 'include' });
      return jsonOrError(res);
    },
    async create(payload){
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload || {})
      });
      return jsonOrError(res);
    },
    async update(id, payload){
      const url = new URL(API_BASE);
      url.searchParams.set('id', id);
      const res = await fetch(url.toString(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload || {})
      });
      return jsonOrError(res);
    },
    async remove(id){
      const url = new URL(API_BASE);
      url.searchParams.set('id', id);
      const res = await fetch(url.toString(), { method: 'DELETE', credentials: 'include' });
      return jsonOrError(res);
    }
  };
})();