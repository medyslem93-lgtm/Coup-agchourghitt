(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const TOURNAMENT_ID = '4b420e85-19b3-479c-bd79-e0fef79a105f';
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: { headers: { 'x-client-info': 'aghchorguit-fan-account-v1' } },
  });

  const state = {
    user: null,
    session: null,
    myVote: null,
    voteLoadedFor: '',
    pendingCandidateId: '',
    recovery: false,
    busy: false,
    syncTimer: 0,
  };

  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

  const routeRoot = () => decodeURIComponent(location.hash || '')
    .replace(/^#\/?/, '')
    .split(/[/?]/)[0]
    .trim();

  const accountName = (user) => {
    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
    if (metaName) return String(metaName).trim();
    const email = String(user?.email || '');
    return email ? email.split('@')[0] : 'مشجع أغشوركيت';
  };

  const providerLabel = (user) => {
    const p = String(user?.app_metadata?.provider || '').toLowerCase();
    if (p === 'google') return 'Google';
    if (p === 'apple') return 'Apple';
    return 'البريد الإلكتروني';
  };

  function installStyles() {
    if (document.getElementById('aghFanAccountStyles')) return;
    const style = document.createElement('style');
    style.id = 'aghFanAccountStyles';
    style.textContent = `
      .agh-account-trigger{border:1px solid rgba(199,255,55,.24);background:linear-gradient(145deg,rgba(16,24,19,.96),rgba(6,9,7,.96));color:#fff;min-height:42px;padding:6px 10px;border-radius:14px;display:inline-flex;align-items:center;gap:7px;font-family:inherit;cursor:pointer;box-shadow:0 7px 24px rgba(0,0,0,.14)}
      .agh-account-trigger:hover{border-color:rgba(199,255,55,.48)}
      .agh-account-avatar{width:29px;height:29px;border-radius:10px;display:grid;place-items:center;background:#c7ff37;color:#0a0d0b;font-weight:1000;font-size:12px;flex:0 0 29px}
      .agh-account-trigger-copy{display:grid;text-align:right;line-height:1.15}
      .agh-account-trigger-copy small{font-size:9px;color:#aeb8b0}.agh-account-trigger-copy b{font-size:11px;max-width:92px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .agh-account-layer{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.76);backdrop-filter:blur(11px);display:grid;place-items:center;padding:16px}
      .agh-account-layer[hidden]{display:none!important}
      .agh-account-panel{width:min(470px,100%);max-height:min(720px,92dvh);overflow:auto;background:linear-gradient(165deg,#111713,#070a08 54%,#050706);border:1px solid rgba(199,255,55,.24);border-radius:24px;color:#fff;box-shadow:0 28px 80px rgba(0,0,0,.52);padding:18px;direction:rtl;font-family:Cairo,system-ui,sans-serif}
      .agh-account-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.agh-account-head-copy{display:grid;gap:3px}.agh-account-head small{color:#c7ff37;font-weight:900;font-size:10px;letter-spacing:.4px}.agh-account-head h2{margin:0;font-size:21px}.agh-account-head p{margin:0;color:#aeb8b0;font-size:11px;line-height:1.7}.agh-account-close{width:36px;height:36px;border:0;border-radius:12px;background:#1b211d;color:#fff;font-size:22px;cursor:pointer}
      .agh-account-user{display:grid;grid-template-columns:48px minmax(0,1fr);gap:11px;align-items:center;padding:12px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:17px;margin:8px 0 14px}.agh-account-user .agh-account-avatar{width:48px;height:48px;border-radius:15px;font-size:17px}.agh-account-user-copy{min-width:0;display:grid;gap:2px}.agh-account-user-copy b,.agh-account-user-copy span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agh-account-user-copy b{font-size:14px}.agh-account-user-copy span{font-size:11px;color:#aeb8b0}
      .agh-account-form{display:grid;gap:10px}.agh-account-label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#d9dfda}.agh-account-input{width:100%;min-height:48px;border-radius:13px;border:1px solid rgba(255,255,255,.13);background:#0c100e;color:#fff;padding:0 13px;font:700 13px Cairo,system-ui,sans-serif;outline:none}.agh-account-input:focus{border-color:#c7ff37;box-shadow:0 0 0 3px rgba(199,255,55,.08)}
      .agh-account-primary,.agh-account-secondary,.agh-account-social,.agh-account-linkbtn{border:0;font-family:inherit;cursor:pointer}.agh-account-primary{min-height:49px;border-radius:14px;background:#c7ff37;color:#0a0d0b;font-weight:1000;font-size:13px}.agh-account-primary:disabled{opacity:.52;cursor:not-allowed}.agh-account-secondary{min-height:45px;border-radius:13px;background:#1b231e;color:#fff;border:1px solid rgba(255,255,255,.1);font-weight:900}.agh-account-social{min-height:45px;border-radius:13px;background:#fff;color:#111;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px}.agh-account-social span{font-size:16px}.agh-account-linkbtn{background:transparent;color:#c7ff37;padding:7px 5px;font-size:11px;font-weight:900}.agh-account-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.agh-account-sep{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:9px;color:#7f8a82;font-size:10px;margin:2px 0}.agh-account-sep:before,.agh-account-sep:after{content:"";height:1px;background:rgba(255,255,255,.09)}
      .agh-account-msg{min-height:18px;padding:0 2px;color:#b8c1bb;font-size:10.5px;line-height:1.65}.agh-account-msg.is-error{color:#ff8e8e}.agh-account-msg.is-success{color:#c7ff37}
      .agh-account-actions{display:grid;gap:8px}.agh-account-logout{background:#221313!important;border-color:rgba(255,92,92,.18)!important;color:#ffb0b0!important}
      .agh-account-vote-locked{margin-top:10px;padding:11px 13px;border-radius:14px;background:rgba(199,255,55,.08);border:1px solid rgba(199,255,55,.2);color:#eaffbd;font-size:11px;font-weight:900;text-align:center}
      .agh-account-profile-card{margin:0 auto 16px;max-width:1180px;border:1px solid rgba(199,255,55,.18);background:linear-gradient(135deg,rgba(18,27,21,.95),rgba(7,11,8,.96));border-radius:20px;padding:14px;color:#fff;display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:12px;align-items:center}.agh-account-profile-card .agh-account-avatar{width:52px;height:52px;border-radius:16px;font-size:18px}.agh-account-profile-info{min-width:0;display:grid;gap:3px}.agh-account-profile-info b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agh-account-profile-info span{color:#aab5ad;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agh-account-profile-open{border:1px solid rgba(199,255,55,.26);background:rgba(199,255,55,.1);color:#dfff93;border-radius:12px;padding:9px 11px;font:900 11px Cairo,system-ui;cursor:pointer}
      .agh-account-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100100;background:#111713;color:#fff;border:1px solid rgba(199,255,55,.25);border-radius:14px;padding:10px 14px;font:800 11px Cairo,system-ui;box-shadow:0 15px 44px rgba(0,0,0,.42);max-width:min(92vw,460px);text-align:center;animation:aghAccountToast .2s ease both}@keyframes aghAccountToast{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
      @media(max-width:640px){.agh-account-trigger{min-height:38px;padding:5px 7px;border-radius:12px}.agh-account-trigger-copy small{display:none}.agh-account-trigger-copy b{font-size:9px;max-width:62px}.agh-account-avatar{width:27px;height:27px;flex-basis:27px}.agh-account-layer{padding:9px;align-items:end}.agh-account-panel{border-radius:22px 22px 14px 14px;max-height:90dvh;padding:15px}.agh-account-row{grid-template-columns:1fr}.agh-account-profile-card{grid-template-columns:46px minmax(0,1fr);border-radius:17px}.agh-account-profile-card .agh-account-avatar{width:46px;height:46px}.agh-account-profile-open{grid-column:1/-1;width:100%}}
      @media(max-width:390px){.agh-account-trigger-copy{display:none}.agh-account-trigger{padding:5px}.agh-account-panel{padding:13px}}
    `;
    document.head.appendChild(style);
  }

  function toast(message) {
    document.querySelectorAll('.agh-account-toast').forEach((el) => el.remove());
    const el = document.createElement('div');
    el.className = 'agh-account-toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function ensureTrigger() {
    const actions = document.querySelector('.header-actions');
    if (!actions) return null;
    let button = document.getElementById('aghAccountTrigger');
    if (!button) {
      button = document.createElement('button');
      button.id = 'aghAccountTrigger';
      button.type = 'button';
      button.className = 'agh-account-trigger';
      button.addEventListener('click', () => openAccount());
      actions.prepend(button);
    }
    renderTrigger(button);
    return button;
  }

  function renderTrigger(button = document.getElementById('aghAccountTrigger')) {
    if (!button) return;
    const name = state.user ? accountName(state.user) : 'دخول';
    const initial = state.user ? name.trim().charAt(0) || 'م' : '👤';
    button.innerHTML = `<span class="agh-account-avatar">${esc(initial)}</span><span class="agh-account-trigger-copy"><small>${state.user ? 'حساب المشجع' : 'صوّت بحسابك'}</small><b>${esc(name)}</b></span>`;
    button.setAttribute('aria-label', state.user ? `حساب ${name}` : 'تسجيل الدخول');
  }

  function ensureLayer() {
    let layer = document.getElementById('aghAccountLayer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'aghAccountLayer';
    layer.className = 'agh-account-layer';
    layer.hidden = true;
    layer.innerHTML = '<section class="agh-account-panel" role="dialog" aria-modal="true" aria-label="حساب المشجع"><div id="aghAccountBody"></div></section>';
    layer.addEventListener('click', (event) => {
      if (event.target === layer || event.target.closest('[data-account-close]')) closeAccount();
    });
    document.body.appendChild(layer);
    return layer;
  }

  function setMessage(body, message, type = '') {
    const box = body.querySelector('[data-account-msg]');
    if (!box) return;
    box.className = `agh-account-msg${type ? ` is-${type}` : ''}`;
    box.textContent = message || '';
  }

  function authErrorMessage(error) {
    const text = String(error?.message || error || '');
    if (/invalid login credentials/i.test(text)) return 'البريد أو كلمة المرور غير صحيحة.';
    if (/email not confirmed/i.test(text)) return 'افتح بريدك وأكّد الحساب أولًا.';
    if (/user already registered/i.test(text)) return 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول.';
    if (/password/i.test(text) && /characters|short|least/i.test(text)) return 'كلمة المرور قصيرة. استخدم 6 أحرف على الأقل.';
    if (/rate limit|security purposes/i.test(text)) return 'تمت محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.';
    if (/provider.*not.*enabled|unsupported provider/i.test(text)) return 'تسجيل Google غير مفعّل بعد لهذا المشروع.';
    return text || 'تعذر إكمال العملية. حاول مرة أخرى.';
  }

  function renderSignedOut(body, note = '') {
    body.innerHTML = `
      <div class="agh-account-head"><div class="agh-account-head-copy"><small>AGCHOURGHIT FAN ACCOUNT</small><h2>حساب المشجع</h2><p>${esc(note || 'ادخل بحسابك للتصويت وحماية صوتك من التكرار.')}</p></div><button class="agh-account-close" type="button" data-account-close>×</button></div>
      <form class="agh-account-form" data-account-form>
        <label class="agh-account-label">البريد الإلكتروني<input class="agh-account-input" type="email" name="email" autocomplete="email" required placeholder="name@example.com"></label>
        <label class="agh-account-label">كلمة المرور<input class="agh-account-input" type="password" name="password" autocomplete="current-password" minlength="6" placeholder="••••••••"></label>
        <button class="agh-account-primary" type="submit" data-account-login>تسجيل الدخول</button>
        <div class="agh-account-row"><button class="agh-account-secondary" type="button" data-account-signup>إنشاء حساب جديد</button><button class="agh-account-secondary" type="button" data-account-magic>أرسل رابط دخول للبريد</button></div>
        <button class="agh-account-linkbtn" type="button" data-account-reset>نسيت كلمة المرور؟</button>
        <div class="agh-account-sep">أو</div>
        <button class="agh-account-social" type="button" data-account-google><span>G</span> المتابعة بحساب Google</button>
        <div class="agh-account-msg" data-account-msg></div>
      </form>`;

    const form = body.querySelector('[data-account-form]');
    const emailInput = form.elements.email;
    const passwordInput = form.elements.password;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.busy) return;
      state.busy = true;
      const button = body.querySelector('[data-account-login]');
      button.disabled = true;
      button.textContent = 'جارٍ الدخول…';
      setMessage(body, '');
      try {
        const { error } = await db.auth.signInWithPassword({ email: emailInput.value.trim(), password: passwordInput.value });
        if (error) throw error;
      } catch (error) {
        setMessage(body, authErrorMessage(error), 'error');
      } finally {
        state.busy = false;
        button.disabled = false;
        button.textContent = 'تسجيل الدخول';
      }
    });

    body.querySelector('[data-account-signup]').addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || password.length < 6) {
        setMessage(body, 'اكتب بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل.', 'error');
        return;
      }
      if (state.busy) return;
      state.busy = true;
      setMessage(body, 'جارٍ إنشاء الحساب…');
      try {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}${location.pathname}`,
            data: { display_name: email.split('@')[0] },
          },
        });
        if (error) throw error;
        if (data?.session) setMessage(body, 'تم إنشاء الحساب وتسجيل الدخول.', 'success');
        else setMessage(body, 'تم إنشاء الحساب. افتح بريدك واضغط رابط التأكيد ثم ارجع للموقع.', 'success');
      } catch (error) {
        setMessage(body, authErrorMessage(error), 'error');
      } finally {
        state.busy = false;
      }
    });

    body.querySelector('[data-account-magic]').addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        setMessage(body, 'اكتب بريدك الإلكتروني أولًا.', 'error');
        return;
      }
      if (state.busy) return;
      state.busy = true;
      setMessage(body, 'جارٍ إرسال رابط الدخول…');
      try {
        const { error } = await db.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${location.origin}${location.pathname}` },
        });
        if (error) throw error;
        setMessage(body, 'تم إرسال رابط الدخول إلى بريدك.', 'success');
      } catch (error) {
        setMessage(body, authErrorMessage(error), 'error');
      } finally {
        state.busy = false;
      }
    });

    body.querySelector('[data-account-reset]').addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        setMessage(body, 'اكتب بريدك الإلكتروني أولًا.', 'error');
        return;
      }
      try {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
        if (error) throw error;
        setMessage(body, 'أرسلنا لك رابط تغيير كلمة المرور.', 'success');
      } catch (error) {
        setMessage(body, authErrorMessage(error), 'error');
      }
    });

    body.querySelector('[data-account-google]').addEventListener('click', async () => {
      try {
        const { error } = await db.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${location.origin}${location.pathname}` },
        });
        if (error) throw error;
      } catch (error) {
        setMessage(body, authErrorMessage(error), 'error');
      }
    });
  }

  function renderSignedIn(body) {
    const name = accountName(state.user);
    const initial = name.charAt(0) || 'م';
    const email = state.user?.email || '';
    const verified = state.user?.email_confirmed_at ? 'البريد موثّق' : 'الحساب نشط';
    body.innerHTML = `
      <div class="agh-account-head"><div class="agh-account-head-copy"><small>حسابك</small><h2>أهلًا ${esc(name)}</h2><p>يُستخدم هذا الحساب للتصويت مرة واحدة بصورة آمنة.</p></div><button class="agh-account-close" type="button" data-account-close>×</button></div>
      <div class="agh-account-user"><span class="agh-account-avatar">${esc(initial)}</span><span class="agh-account-user-copy"><b>${esc(name)}</b><span>${esc(email)}</span><span>${esc(providerLabel(state.user))} · ${verified}</span></span></div>
      ${state.recovery ? '<form class="agh-account-form" data-account-password><label class="agh-account-label">كلمة المرور الجديدة<input class="agh-account-input" type="password" name="password" minlength="6" required></label><button class="agh-account-primary" type="submit">حفظ كلمة المرور الجديدة</button><div class="agh-account-msg" data-account-msg></div></form><div class="agh-account-sep">الحساب</div>' : ''}
      <div class="agh-account-actions"><button class="agh-account-secondary" type="button" data-account-profile>فتح ملفي</button><button class="agh-account-secondary agh-account-logout" type="button" data-account-logout>تسجيل الخروج</button></div>`;

    body.querySelector('[data-account-profile]').addEventListener('click', () => {
      closeAccount();
      location.hash = '#/profile';
    });
    body.querySelector('[data-account-logout]').addEventListener('click', async () => {
      await db.auth.signOut();
      closeAccount();
      toast('تم تسجيل الخروج');
    });

    const recoveryForm = body.querySelector('[data-account-password]');
    if (recoveryForm) {
      recoveryForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = recoveryForm.elements.password.value;
        try {
          const { error } = await db.auth.updateUser({ password });
          if (error) throw error;
          state.recovery = false;
          setMessage(body, 'تم تغيير كلمة المرور.', 'success');
          setTimeout(() => renderAccount(), 500);
        } catch (error) {
          setMessage(body, authErrorMessage(error), 'error');
        }
      });
    }
  }

  function renderAccount(note = '') {
    installStyles();
    const layer = ensureLayer();
    const body = layer.querySelector('#aghAccountBody');
    if (state.user) renderSignedIn(body);
    else renderSignedOut(body, note);
  }

  function openAccount(note = '') {
    const layer = ensureLayer();
    renderAccount(note);
    layer.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeAccount() {
    const layer = document.getElementById('aghAccountLayer');
    if (layer) layer.hidden = true;
    document.body.style.overflow = '';
  }

  async function refreshVoteState(force = false) {
    if (!state.user) {
      state.myVote = null;
      state.voteLoadedFor = '';
      syncVotingMode();
      return;
    }
    if (!force && state.voteLoadedFor === state.user.id) {
      syncVotingMode();
      return;
    }
    state.voteLoadedFor = state.user.id;
    try {
      const { data, error } = await db.rpc('get_player_tournament_account_my_vote', { p_tournament_id: TOURNAMENT_ID });
      if (error) throw error;
      state.myVote = data || null;
    } catch {
      state.myVote = null;
    }
    syncVotingMode();
  }

  function syncVotingMode() {
    const root = document.getElementById('aghPlayerTournamentVote');
    if (!root) return;

    const meta = root.querySelector('.agh-pot-meta');
    if (meta) {
      const spans = meta.querySelectorAll('span');
      if (spans.length) spans[spans.length - 1].innerHTML = '🔐 <b>حساب واحد = صوت واحد</b>';
    }

    const cta = root.querySelector('[data-pot-open]');
    root.querySelectorAll('.agh-account-vote-locked').forEach((el) => el.remove());

    if (state.user && state.myVote) {
      if (cta) cta.style.display = 'none';
      const votedCandidate = root.querySelector(`[data-pot-profile-card="${CSS.escape(state.myVote)}"]`);
      const name = votedCandidate?.querySelector('.agh-pot-player b')?.textContent?.trim() || 'مرشحك';
      const note = document.createElement('div');
      note.className = 'agh-account-vote-locked';
      note.textContent = `✓ تم تسجيل صوت هذا الحساب لـ ${name}`;
      (cta?.parentNode || root).appendChild(note);
    } else if (cta) {
      cta.style.display = '';
      const first = cta.querySelector('span');
      const last = cta.querySelector('b');
      if (first) first.textContent = state.user ? 'اختر مرشحك' : 'سجّل الدخول ثم اختر مرشحك';
      if (last) last.textContent = 'صوّت بحسابك ←';
    }
  }

  async function sendAccountVote(candidateId) {
    if (!candidateId || state.busy) return;
    if (!state.user) {
      state.pendingCandidateId = candidateId;
      openAccount('سجّل الدخول أو أنشئ حسابًا لإرسال صوتك.');
      return;
    }
    if (state.myVote) {
      toast('سبق أن صوّت هذا الحساب.');
      return;
    }

    state.busy = true;
    const confirm = document.querySelector('#aghPotSheet [data-pot-confirm]');
    const oldText = confirm?.textContent;
    if (confirm) {
      confirm.disabled = true;
      confirm.textContent = 'جارٍ تسجيل صوتك…';
    }
    try {
      const { error } = await db.rpc('save_player_tournament_account_vote', {
        p_tournament_id: TOURNAMENT_ID,
        p_candidate_id: candidateId,
      });
      if (error) throw error;
      state.myVote = candidateId;
      state.pendingCandidateId = '';
      const sheet = document.getElementById('aghPotSheet');
      if (sheet) sheet.hidden = true;
      syncVotingMode();
      toast('تم تسجيل صوتك بنجاح ✓');
      setTimeout(() => location.reload(), 900);
    } catch (error) {
      const text = String(error?.message || error || '');
      if (/ALREADY_VOTED/i.test(text)) {
        await refreshVoteState(true);
        toast('سبق أن صوّت هذا الحساب.');
      } else if (/VOTING_CLOSED/i.test(text)) toast('انتهى التصويت.');
      else if (/AUTH_REQUIRED/i.test(text)) openAccount('انتهت جلسة الدخول. سجّل الدخول مرة أخرى.');
      else toast('تعذر إرسال التصويت. حاول مرة أخرى.');
    } finally {
      state.busy = false;
      if (confirm && confirm.isConnected) {
        confirm.disabled = false;
        confirm.textContent = oldText || 'إرسال صوتي';
      }
    }
  }

  function interceptVoting() {
    document.addEventListener('click', (event) => {
      const confirm = event.target.closest?.('#aghPotSheet [data-pot-confirm]');
      if (confirm) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const selected = document.querySelector('#aghPotSheet [data-pot-candidate].selected');
        const candidateId = selected?.dataset?.potCandidate || '';
        if (!candidateId) {
          toast('اختر لاعبًا أولًا.');
          return;
        }
        state.pendingCandidateId = candidateId;
        sendAccountVote(candidateId);
        return;
      }

      const open = event.target.closest?.('#aghPlayerTournamentVote [data-pot-open]');
      if (open && state.user && state.myVote) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toast('سبق أن صوّت هذا الحساب.');
      }
    }, true);

    document.addEventListener('submit', (event) => {
      if (!event.target.matches?.('#aghPotSheet [data-pot-form]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openAccount('التصويت أصبح الآن بالحساب بدل الاسم ورقم الهاتف.');
    }, true);
  }

  function syncProfileCard() {
    const main = document.getElementById('appMain');
    if (!main) return;
    const existing = document.getElementById('aghAccountProfileCard');
    if (routeRoot() !== 'profile') {
      existing?.remove();
      return;
    }

    if (!state.user) {
      if (existing) existing.remove();
      const card = document.createElement('section');
      card.id = 'aghAccountProfileCard';
      card.className = 'agh-account-profile-card';
      card.innerHTML = '<span class="agh-account-avatar">👤</span><span class="agh-account-profile-info"><b>اربط ملفك بحساب</b><span>سجّل الدخول للتصويت بحساب واحد وحفظ هويتك كمشجع.</span></span><button class="agh-account-profile-open" type="button">تسجيل الدخول</button>';
      card.querySelector('button').addEventListener('click', () => openAccount());
      main.prepend(card);
      return;
    }

    const name = accountName(state.user);
    const initial = name.charAt(0) || 'م';
    const card = existing || document.createElement('section');
    card.id = 'aghAccountProfileCard';
    card.className = 'agh-account-profile-card';
    card.innerHTML = `<span class="agh-account-avatar">${esc(initial)}</span><span class="agh-account-profile-info"><b>${esc(name)}</b><span>${esc(state.user.email || '')} · ${esc(providerLabel(state.user))}</span></span><button class="agh-account-profile-open" type="button">إدارة الحساب</button>`;
    card.querySelector('button').addEventListener('click', () => openAccount());
    if (!existing) main.prepend(card);
  }

  function scheduleSync() {
    clearTimeout(state.syncTimer);
    state.syncTimer = setTimeout(() => {
      ensureTrigger();
      syncVotingMode();
      syncProfileCard();
    }, 35);
  }

  async function applySession(session, event = '') {
    state.session = session || null;
    state.user = session?.user || null;
    state.voteLoadedFor = '';
    state.myVote = null;
    renderTrigger();
    renderAccount();
    await refreshVoteState(true);
    syncProfileCard();

    if (state.user && state.pendingCandidateId && !state.myVote) {
      const pending = state.pendingCandidateId;
      closeAccount();
      setTimeout(() => sendAccountVote(pending), 120);
    } else if (event === 'SIGNED_IN') {
      closeAccount();
      toast('تم تسجيل الدخول بنجاح');
    }
  }

  async function init() {
    installStyles();
    ensureTrigger();
    ensureLayer();
    interceptVoting();

    const { data } = await db.auth.getSession();
    await applySession(data?.session || null);

    db.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') state.recovery = true;
      setTimeout(() => applySession(session, event), 0);
    });

    window.addEventListener('hashchange', scheduleSync);
    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleSync();
  }

  init();
})();