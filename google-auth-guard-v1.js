(() => {
  'use strict';
  if (window.__aghGoogleAuthGuardV1) return;
  window.__aghGoogleAuthGuardV1 = true;

  const cfg = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = window.AGCH_SUPABASE_CLIENT || window.aghDb || window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseKey,
    {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'x-client-info': 'agh-google-auth-guard-v1' } },
    }
  );

  let cache = { value: null, at: 0 };

  function message(text, type = 'err') {
    const body = document.getElementById('aghAccountBody');
    const box = body?.querySelector('[data-ac-msg]');
    if (box) {
      box.className = `agh-account-msg ${type}`;
      box.textContent = text;
      return;
    }
    const old = document.querySelector('.agh-google-guard-toast');
    old?.remove();
    const el = document.createElement('div');
    el.className = 'agh-google-guard-toast';
    el.textContent = text;
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '90px', transform: 'translateX(-50%)',
      zIndex: '100200', background: '#151a16', color: '#fff', border: '1px solid #455325',
      borderRadius: '13px', padding: '10px 14px', maxWidth: '92vw', textAlign: 'center',
      fontFamily: 'Cairo, system-ui, sans-serif', fontSize: '11px', fontWeight: '800'
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  async function googleEnabled(force = false) {
    if (!force && cache.value !== null && Date.now() - cache.at < 60000) return cache.value;
    try {
      const res = await fetch(`${cfg.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: cfg.supabaseKey },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('settings');
      const data = await res.json();
      const enabled = data?.external?.google === true;
      cache = { value: enabled, at: Date.now() };
      return enabled;
    } catch (_) {
      return null;
    }
  }

  async function handleGoogle(button) {
    if (button.dataset.aghBusy === '1') return;
    button.dataset.aghBusy = '1';
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'جارٍ التحقق من Google…';
    try {
      const enabled = await googleEnabled(true);
      if (enabled === false) {
        message('تسجيل الدخول بحساب Google غير مفعّل بعد من إعدادات Supabase. استخدم إنشاء حساب أو الدخول بالبريد مؤقتًا.');
        return;
      }
      if (enabled === null) {
        message('تعذر التحقق من إعداد Google الآن. حاول مرة أخرى بعد قليل.');
        return;
      }
      const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}${location.pathname}` },
      });
      if (error) throw error;
    } catch (e) {
      const t = String(e?.message || e || '');
      if (/provider.*not.*enabled|unsupported provider/i.test(t)) {
        cache = { value: false, at: Date.now() };
        message('تسجيل الدخول بحساب Google غير مفعّل بعد من إعدادات Supabase.');
      } else {
        message('تعذر تسجيل الدخول بحساب Google. حاول مرة أخرى.');
      }
    } finally {
      button.dataset.aghBusy = '0';
      button.disabled = false;
      button.textContent = original || 'G المتابعة بحساب Google';
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-ac-google]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleGoogle(button);
  }, true);

  const observer = new MutationObserver(() => {
    const button = document.querySelector('[data-ac-google]');
    if (!button || button.dataset.aghChecked === '1') return;
    button.dataset.aghChecked = '1';
    googleEnabled().then((enabled) => {
      if (enabled === false) {
        button.title = 'يحتاج تفعيل Google في إعدادات Supabase';
        button.setAttribute('aria-label', 'Google غير مفعّل حاليًا');
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
