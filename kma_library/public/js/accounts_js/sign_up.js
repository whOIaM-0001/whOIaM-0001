// Sign Up logic — validate fields, live password rules, check email + roles, submit to PHP

// API endpoint tuyệt đối theo XAMPP của bạn
// C:\xampp\htdocs\kma_library\library_api\functions\function_books\command\accounts\sign_up.php
const BASE = `${location.origin}/kma_library`;
const API_SIGNUP = `${BASE}/library_api/functions/function_books/command/accounts/sign_up.php`;

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch (e) { throw new Error(`Invalid JSON from ${url}: ${text.slice(0,120)}...`); }
  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

class KmaSignUp {
  constructor(){
    this.form = document.getElementById('signupForm');
    this.fullname = document.getElementById('fullname');
    this.email = document.getElementById('email');
    this.password = document.getElementById('password');
    this.confirm = document.getElementById('confirmPassword');
    this.role = document.getElementById('role');
    this.btn = document.getElementById('btnSignUp');
    this.toggle = document.getElementById('togglePassword');
    this.success = document.getElementById('successMessage');
    this.pwPopover = document.getElementById('pwPopover');

    this.bind();
    this.setupFloatingLabels();
    this.initRoles(); // load roles, ẩn Admin nếu đã có
  }

  // ---------- UI helpers ----------
  bind(){
    this.form.addEventListener('submit', (e)=> this.onSubmit(e));
    // label errors clear
    this.fullname.addEventListener('input', ()=> this.clearError('fullname'));
    this.email.addEventListener('input', ()=> this.clearError('email'));
    this.password.addEventListener('input', ()=> { this.clearError('password'); this.updatePasswordRules(); });
    this.confirm.addEventListener('input', ()=> this.clearError('confirm'));

    // focus popover
    this.password.addEventListener('focus', ()=> this.showPwPopover(true));
    this.password.addEventListener('blur', ()=> this.showPwPopover(false));
    // toggle show/hide
    this.toggle.addEventListener('click', ()=>{
      const show = this.password.type === 'password';
      this.password.type = show ? 'text' : 'password';
      this.toggle.classList.toggle('show', show);
      this.password.focus();
    });

    // blur triggers server checks
    this.email.addEventListener('blur', ()=> this.checkEmailExists());
  }

  setupFloatingLabels(){
    const inputs = Array.from(document.querySelectorAll('.input input, .input select'));
    const sync = (el)=>{
      const box = el.closest('.input'); if(!box) return;
      if (document.activeElement === el) box.classList.add('focused'); else box.classList.remove('focused');
      const hasVal = String(el.value || '').trim().length > 0;
      box.classList.toggle('has-value', hasVal);
    };
    inputs.forEach(el=>{
      ['focus','blur','input','change'].forEach(ev => el.addEventListener(ev, ()=> sync(el)));
      sync(el);
    });
  }

  showPwPopover(show){
    if (!this.pwPopover) return;
    this.pwPopover.classList.toggle('show', !!show);
    if (show) this.updatePasswordRules();
  }

  // ---------- Validations ----------
  validateFullname(){
    const v = (this.fullname.value || '').trim();
    // Cho phép chỉ chữ cái (Unicode) và khoảng trắng
    const re = /^[\p{L}\s]+$/u;
    if (!v) return this.showError('fullname', 'Vui lòng nhập họ tên'), false;
    if (!re.test(v)) return this.showError('fullname', 'Họ tên chỉ gồm chữ cái và khoảng trắng'), false;
    this.clearError('fullname'); return true;
  }

  validateEmail(){
    const v = (this.email.value || '').trim();
    const re = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!v) return this.showError('email','Vui lòng nhập email'), false;
    if (!re.test(v)) return this.showError('email','Email phải kết thúc bằng @gmail.com'), false;
    this.clearError('email'); return true;
  }

  validatePassword(){
    const v = this.password.value || '';
    const okLen = v.length >= 8;
    const okLower = /[a-z]/.test(v);
    const okUpper = /[A-Z]/.test(v);
    const okDigit = /\d/.test(v);
    const okSpecial = /[^A-Za-z0-9]/.test(v);
    const okSpace = !/\s/.test(v);
    const ok = okLen && okLower && okUpper && okDigit && okSpecial && okSpace;
    if (!ok) return this.showError('password','Mật khẩu chưa đạt yêu cầu'), false;
    this.clearError('password'); return true;
  }

  validateConfirm(){
    if ((this.confirm.value || '') !== (this.password.value || '')) {
      return this.showError('confirm','Mật khẩu và Xác nhận mật khẩu không khớp'), false;
    }
    this.clearError('confirm'); return true;
  }

  async checkEmailExists(){
    if (!this.validateEmail()) return false;
    try{
      const j = await fetchJson(`${API_SIGNUP}?action=checkEmail&email=${encodeURIComponent(this.email.value.trim())}`);
      if (j && j.exists) {
        this.showError('email','Email đã tồn tại');
        return true;
      } else {
        if (this.email.value.trim().toLowerCase().endsWith('@gmail.com')) this.clearError('email');
        return false;
      }
    }catch(e){
      console.warn('checkEmail failed', e.message || e);
      // không chặn người dùng chỉ vì lỗi mạng
      return false;
    }
  }

  async initRoles(){
    try{
      const j = await fetchJson(`${API_SIGNUP}?action=roles`);
      const adminExists = !!j.admin_exists;
      if (adminExists){
        // ẩn Admin
        Array.from(this.role.options).forEach(o=>{
          if (o.value === 'Admin'|| o.value === 'Librarian') o.remove();
        });
        this.role.value = 'Reader';
      }
    }catch(e){
      console.warn('roles load failed', e.message || e);
      // fallback: nếu lỗi API, vẫn giữ Reader mặc định
      try { this.role.value = 'Reader'; } catch(_) {}
    }
  }

  updatePasswordRules(){
    const v = this.password.value || '';
    const rules = {
      lower: /[a-z]/.test(v),
      upper: /[A-Z]/.test(v),
      number: /\d/.test(v),
      special: /[^A-Za-z0-9]/.test(v),
      len: v.length >= 8,
      space: !/\s/.test(v)
    };
    Object.entries(rules).forEach(([k, ok])=>{
      const li = this.pwPopover?.querySelector(`li[data-k="${k}"]`);
      if (!li) return;
      li.classList.remove('ok','bad');
      li.classList.add(ok ? 'ok' : 'bad');
    });
  }

  setLoading(on){
    this.btn.classList.toggle('loading', on);
    this.btn.disabled = on;
  }

  showError(field,msg){
    const input = document.getElementById(field === 'confirm' ? 'confirmPassword' : field);
    const idErr = field === 'confirm' ? 'confirmError' : field+'Error';
    const grpId = field === 'confirm' ? 'grp-confirm'
               : field === 'fullname' ? 'grp-fullname'
               : field === 'password' ? 'grp-password'
               : 'grp-email';
    document.getElementById(grpId)?.classList.add('invalid');
    const el = document.getElementById(idErr);
    if (el) el.textContent = msg;
    if (input){
      input.animate(
        [{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],
        {duration:280, easing:'ease-in-out'}
      );
    }
  }
  clearError(field){
    const input = document.getElementById(field === 'confirm' ? 'confirmPassword' : field);
    const idErr = field === 'confirm' ? 'confirmError' : field+'Error';
    const grpId = field === 'confirm' ? 'grp-confirm'
               : field === 'fullname' ? 'grp-fullname'
               : field === 'password' ? 'grp-password'
               : 'grp-email';
    document.getElementById(grpId)?.classList.remove('invalid');
    const el = document.getElementById(idErr);
    if (el) el.textContent = '';
  }

  // ---------- Submit ----------
  async onSubmit(e){
    e.preventDefault();
    const ok1 = this.validateFullname();
    const ok2 = this.validateEmail();
    const existed = await this.checkEmailExists(); // if true => exists
    const ok3 = this.validatePassword();
    const ok4 = this.validateConfirm();

    if (!ok1 || !ok2 || existed || !ok3 || !ok4) return;

    this.setLoading(true);
    try{
      const payload = {
        fullname: this.fullname.value.trim(),
        email: this.email.value.trim(),
        password: this.password.value,
        role: this.role.value
      };
      const j = await fetchJson(API_SIGNUP, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });

      // Success UI
      this.form.style.opacity='0';
      this.form.style.pointerEvents='none';
      setTimeout(()=>{
        this.form.style.display='none';
        this.success.classList.add('show');
      }, 200);
      setTimeout(()=> { window.location.href = `${BASE}/public/html/accounts/sign_in.html`; }, 2200);
    }catch(err){
      console.error(err);
      const msg = String(err?.message || 'Đăng ký thất bại');
      if (/email/i.test(msg)) this.showError('email', msg);
      else if (/name|username|họ tên/i.test(msg)) this.showError('fullname', msg);
      else if (/password|mật khẩu/i.test(msg)) this.showError('password', msg);
      else this.showError('confirm', msg);
    }finally{
      this.setLoading(false);
    }
  }
}

document.addEventListener('DOMContentLoaded', ()=> new KmaSignUp());