(() => {
  'use strict';
  const triggerNewsCenter = () => {
    if (location.hash === '#news' || /^#news\//.test(location.hash)) {
      setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 450);
    }
  };

  document.addEventListener('click', (event) => {
    const newsButton = event.target.closest('[data-route="news"]');
    if (!newsButton) return;
    setTimeout(() => {
      if (location.hash !== '#news') location.hash = '#news';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 500);
  }, true);

  window.addEventListener('load', triggerNewsCenter);
  window.addEventListener('hashchange', () => {
    if (location.hash === '#news' || /^#news\//.test(location.hash)) {
      setTimeout(() => {
        document.querySelectorAll('.news-center-page img[src="assets/tournament.jpg"], .news-article-page img[src="assets/tournament.jpg"]').forEach(img => {
          const wrap = img.closest('.media-wrap');
          if (wrap) wrap.classList.add('news-no-photo');
          img.remove();
        });
      }, 650);
    }
  });

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.news-center-page img[src="assets/tournament.jpg"], .news-article-page img[src="assets/tournament.jpg"]').forEach(img => {
      const wrap = img.closest('.media-wrap');
      if (wrap) wrap.classList.add('news-no-photo');
      img.remove();
    });
  });
  const main = document.getElementById('appMain');
  if (main) observer.observe(main, {childList:true, subtree:true});
})();