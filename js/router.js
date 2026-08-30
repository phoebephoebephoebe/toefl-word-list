// ============================================================
// 單頁路由 — 切換頁面不重新載入
// ============================================================

const PAGES = ['home', 'learn', 'pool', 'practice', 'settings'];
let currentPage = 'home';
let pendingPracticeScope = null;

function navigateTo(page, opts) {
  if (!PAGES.includes(page)) return;
  currentPage = page;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  if (page === 'practice' && opts && opts.scope) {
    pendingPracticeScope = opts.scope;
  }

  renderPage(page);
}

function initRouter() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  navigateTo('home');
}
