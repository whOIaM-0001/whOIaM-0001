// bookloan_api.js — Guard tránh redeclare + API trả sách
(function(){
  if (window.LoanAPI) return;

  const API_BASE = location.origin + '/kma_library/library_api/functions/function_books/command/book_loan_manage/bookloan_create/bookloan.php';

  async function jsonOrError(res){
    let data; try { data = await res.json(); } catch(e){ data = { ok:false, error:'Invalid JSON' }; }
    if (!res.ok) return { ok:false, error: data?.error || res.statusText || ('HTTP '+res.status), status: res.status };
    return data;
  }

  window.LoanAPI = {
    async list(q=''){
      const url = new URL(API_BASE);
      if (q) url.searchParams.set('q', q);
  const res = await fetch(url.toString(), { method:'GET', credentials:'include' });
      return jsonOrError(res);
    },
    async get(id){
      const url = new URL(API_BASE);
      url.searchParams.set('id', id);
  const res = await fetch(url.toString(), { method:'GET', credentials:'include' });
      return jsonOrError(res);
    },
    async create(payload){
      const res = await fetch(API_BASE, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify(payload || {})
      });
      return jsonOrError(res);
    },
    async update(id, payload){
      const url = new URL(API_BASE);
      url.searchParams.set('id', id);
      const res = await fetch(url.toString(), {
        method:'PUT',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify(payload || {})
      });
      return jsonOrError(res);
    },
    async remove(id){
      const url = new URL(API_BASE);
      url.searchParams.set('id', id);
  const res = await fetch(url.toString(), { method:'DELETE', credentials:'include' });
      return jsonOrError(res);
    },
    async markReturned(id){
      const url = new URL(API_BASE);
      url.searchParams.set('id', id);
      url.searchParams.set('action', 'return');
  const res = await fetch(url.toString(), { method:'PUT', credentials:'include' });
      return jsonOrError(res);
    }
  };
})();