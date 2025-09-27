// admin_ui.js — Quản lý dashboard admin: fetch số liệu, điều hướng
(function(){
  // --- DASHBOARD LOGIC ---
  const API_BASE = location.origin + '/kma_library/library_api/functions/function_books/command/books';
  const DB_PATH = API_BASE + '/books_database';

  function getEls() {
    return {
      dashboard: document.getElementById('dashboard-admin'),
      countBooks: document.getElementById('count-books'),
      countCategories: document.getElementById('count-categories'),
      countPublishers: document.getElementById('count-publishers')
    };
  }

  async function fetchDashboardCounts() {
    // Sách
    let books = 0, cats = 0, pubs = 0;
    try {
      const resBooks = await fetch(`${DB_PATH}/books_read.php`, { credentials: 'include' });
      const dataBooks = await resBooks.json();
      books = Array.isArray(dataBooks.data) ? dataBooks.data.length : 0;
    } catch(e){}
    try {
      const resCats = await fetch(`${DB_PATH}/categories.php`, { credentials: 'include' });
      const dataCats = await resCats.json();
      cats = Array.isArray(dataCats.data) ? dataCats.data.length : 0;
    } catch(e){}
    try {
      const resPubs = await fetch(`${DB_PATH}/publishers.php`, { credentials: 'include' });
      const dataPubs = await resPubs.json();
      pubs = Array.isArray(dataPubs.data) ? dataPubs.data.length : 0;
    } catch(e){}
    const { countBooks, countCategories, countPublishers } = getEls();
    if (countBooks) countBooks.textContent = books;
    if (countCategories) countCategories.textContent = cats;
    if (countPublishers) countPublishers.textContent = pubs;
  }
  // Initialize immediately when this script is loaded (SPA injection)
  // Only run if dashboard elements exist in DOM
  if (document.getElementById('dashboard-admin')) {
    fetchDashboardCounts();
  }
})();
