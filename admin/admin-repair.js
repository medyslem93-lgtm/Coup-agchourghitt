(() => {
  'use strict';

  const q = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function notify(message, ok = true) {
    try {
      if (window.adminControl?.toast) return window.adminControl.toast(message, ok);
      const t = q('toast');
      if (!t) return;
      t.textContent = message;
      t.classList.add('on');
      setTimeout(() => t.classList.remove('on'), 2600);
    } catch (_) {}
  }

  async function waitForAdminControl() {
    for (let i = 0; i < 100; i += 1) {
      if (window.adminControl?.client) return window.adminControl;
      await sleep(80);
    }
    return null;
  }

  function repairNavigation(control) {
    document.querySelectorAll('.tabs [data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        if (tab && control.activateTab) control.activateTab(tab);
        document.body.classList.remove('sidebar-open');
        q('adminSidebar')?.classList.remove('open');
      });
    });

    q('refreshAdmin')?.addEventListener('click', async () => {
      try {
        await control.loadAll(true);
        notify('تم تحديث بيانات لوحة الإدارة');
      } catch (error) {
        notify(`تعذر تحديث البيانات: ${error?.message || 'خطأ غير معروف'}`, false);
      }
    });

    const menu = q('menuToggle');
    if (menu) {
      menu.setAttribute('aria-label', 'فتح قائمة الإدارة');
      menu.setAttribute('type', 'button');
    }

    document.querySelectorAll('button').forEach((button) => {
      if (!button.getAttribute('type')) button.setAttribute('type', 'button');
    });
  }

  async function verifyAdminSession(control) {
    try {
      const { data: { session } } = await control.client.auth.getSession();
      if (!session?.user?.email) return;

      const { data, error } = await control.client
        .from('admin_emails')
        .select('email')
        .eq('email', session.user.email)
        .maybeSingle();

      if (error) {
        console.warn('[admin-repair] admin verification warning', error);
        return;
      }

      if (!data) {
        await control.client.auth.signOut();
        location.replace('/admin/login.html');
      }
    } catch (error) {
      console.warn('[admin-repair] session check failed', error);
    }
  }

  async function healthCheck(control) {
    const tables = [
      'tournaments', 'teams', 'players', 'matches', 'match_events', 'match_stats',
      'news', 'referee_assignments', 'media_assets', 'site_settings', 'awards'
    ];
    const failures = [];

    await Promise.all(tables.map(async (table) => {
      try {
        const { error } = await control.client.from(table).select('id').limit(1);
        if (error) failures.push(`${table}: ${error.message}`);
      } catch (error) {
        failures.push(`${table}: ${error?.message || 'تعذر الاتصال'}`);
      }
    }));

    let box = q('adminRepairStatus');
    if (!box) {
      box = document.createElement('div');
      box.id = 'adminRepairStatus';
      box.style.cssText = 'margin:12px 0;padding:12px 14px;border-radius:14px;background:#fff;border:1px solid #e6ebf1;font:700 13px Cairo,Arial,sans-serif';
      const dashboard = q('dashboard');
      dashboard?.prepend(box);
    }

    if (!box) return;
    if (!failures.length) {
      box.textContent = '✓ النظام الإداري متصل بقاعدة البيانات وجميع الأقسام الأساسية متاحة.';
      box.style.color = '#177a54';
    } else {
      box.textContent = `تنبيه: ${failures.length} قسم/أقسام تحتاج مراجعة اتصال. بقية لوحة الإدارة ستبقى قابلة للاستخدام.`;
      box.style.color = '#9a5a00';
      console.warn('[admin-repair] health failures', failures);
    }
  }

  function installErrorSafety() {
    window.addEventListener('unhandledrejection', (event) => {
      const message = event?.reason?.message || String(event?.reason || 'خطأ غير معروف');
      console.error('[admin] unhandled rejection', event?.reason);
      notify(`حدث خطأ في العملية: ${message}`, false);
    });

    window.addEventListener('error', (event) => {
      if (!event?.error) return;
      console.error('[admin] runtime error', event.error);
    });
  }

  (async () => {
    installErrorSafety();
    const control = await waitForAdminControl();
    if (!control) {
      notify('تعذر تشغيل وحدة الإدارة الرئيسية. أعد تحميل الصفحة.', false);
      return;
    }

    repairNavigation(control);
    await verifyAdminSession(control);
    await healthCheck(control);

    window.addEventListener('admin:data', () => healthCheck(control), { passive: true });
  })();
})();
