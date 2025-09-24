// KMA Library - Sign In (neumorphism) with real login via PHP session

// Lấy ROOT động: "/kma_library"
const ROOT = '/' + location.pathname.split('/')[1];
const BASE = location.origin + ROOT;

// API đăng nhập
const API_SIGNIN = `${BASE}/library_api/functions/function_books/command/accounts/sign_in.php`;

// Trang chủ thật của bạn (điều chỉnh nếu khác)
const HOME_PATH = '/public/html/index.html';

// Helper: parse JSON an toàn
function parseJsonSafe(text) {
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

// Helper: fetch JSON nghiêm ngặt (dùng cho đăng nhập)
async function fetchJsonStrict(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    cache: options.cache || 'no-store',
    ...options
  });
  const text = await res.text();
  const data = parseJsonSafe(text);
  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Helper: fetch JSON “mềm” cho /me (không throw nếu 401)
async function fetchJsonAllow401(url) {
  const res = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });
  const text = await res.text();
  const data = parseJsonSafe(text);
  return { status: res.status, ok: res.ok, data };
}

class KmaSignIn {
  constructor() {
    this.form = document.getElementById('signinForm');
    this.email = document.getElementById('email');
    this.password = document.getElementById('password');
    this.btn = document.getElementById('btnSignIn');
    this.toggle = document.getElementById('togglePassword');
    this.success = document.getElementById('successMessage');
    this.socialButtons = Array.from(document.querySelectorAll('.social-btn'));
    this.remember = document.getElementById('remember');

    this.bind();
    this.setupFloatingLabels();
    this.checkAlreadyLoggedIn(); // nếu đã có phiên -> chuyển về HOME
  }

  isValidUser(u) {
    // Chỉ coi là đã đăng nhập nếu có định danh rõ ràng
    return u && typeof u === 'object' && (u.id || u.user_id || u.email);
  }

  async checkAlreadyLoggedIn() {
    // Cho phép tắt auto-check bằng ?noauto=1 khi cần debug
    const qs = new URLSearchParams(location.search);
    if (qs.get('noauto') === '1') return;

    try {
      const r = await fetchJsonAllow401(`${API_SIGNIN}?action=me`);
      console.debug('[signin] /me =>', r.status, r.data);
      if (r.status === 200 && this.isValidUser(r.data?.user)) {
        window.location.href = `${BASE}${HOME_PATH}`;
      }
      // status 401: chưa đăng nhập -> ở lại trang, KHÔNG redirect
    } catch (e) {
      // Lý thuyết sẽ không vào đây, nhưng cứ log nếu có sự cố khác
      console.debug('[signin] /me unexpected error:', e.message);
    }
  }

  bind() {
    this.form.addEventListener('submit', (e) => this.onSubmit(e));
    this.email.addEventListener('blur', () => this.validateEmail());
    this.password.addEventListener('blur', () => this.validatePassword());
    this.email.addEventListener('input', () => this.clearError('email'));
    this.password.addEventListener('input', () => this.clearError('password'));

    this.toggle?.addEventListener('click', () => {
      const show = this.password.type === 'password';
      this.password.type = show ? 'text' : 'password';
      this.toggle.classList.toggle('show', show);
      this.password.focus();
    });
  }

  setupFloatingLabels() {
    const inputs = Array.from(document.querySelectorAll('.input input'));
    const sync = (el) => {
      const box = el.closest('.input'); if (!box) return;
      box.classList.toggle('focused', document.activeElement === el);
      box.classList.toggle('has-value', String(el.value || '').trim().length > 0);
    };
    inputs.forEach(el => {
      ['focus', 'blur', 'input', 'change'].forEach(ev => el.addEventListener(ev, () => sync(el)));
      setTimeout(() => sync(el), 0); // autofill
    });
  }

  validateEmail() {
    const v = (this.email.value || '').trim();
    const re = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!v) { this.showError('email', 'Email is required'); return false; }
    if (!re.test(v)) { this.showError('email', 'Email must end with @gmail.com'); return false; }
    this.clearError('email'); return true;
  }

  validatePassword() {
    const v = this.password.value || '';
    if (!v) { this.showError('password', 'Password is required'); return false; }
    if (/\s/.test(v)) { this.showError('password', 'Password cannot contain spaces'); return false; }
    this.clearError('password'); return true;
  }

  showError(field, msg) {
    const inputEl = document.getElementById(field);
    const formGroup = inputEl.closest('.form-group');
    const errorElement = document.getElementById(`${field}Error`);
    formGroup.classList.add('invalid');
    if (errorElement) errorElement.textContent = msg;
    inputEl.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
      { duration: 300, easing: 'ease-in-out' }
    );
  }

  clearError(field) {
    const inputEl = document.getElementById(field);
    const formGroup = inputEl.closest('.form-group');
    const errorElement = document.getElementById(`${field}Error`);
    formGroup.classList.remove('invalid');
    if (errorElement) errorElement.textContent = '';
  }

  setLoading(loading) {
    this.btn.classList.toggle('loading', loading);
    this.btn.disabled = loading;
    this.socialButtons.forEach(b => { b.style.pointerEvents = loading ? 'none' : 'auto'; b.style.opacity = loading ? '0.6' : '1'; });
  }

  async onSubmit(e) {
    e.preventDefault();
    const ok1 = this.validateEmail();
    const ok2 = this.validatePassword();
    if (!ok1 || !ok2) { this.btn.focus(); return; }

    this.setLoading(true);
    try {
      await fetchJsonStrict(API_SIGNIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email.value.trim(),
          password: this.password.value,
          remember: !!this.remember?.checked
        })
      });
      setTimeout(() => window.location.href = `${BASE}${HOME_PATH}`, 500);
    } catch (err) {
      const msg = String(err?.message || 'Login failed');
      this.showError('password', msg);
    } finally {
      this.setLoading(false);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new KmaSignIn());