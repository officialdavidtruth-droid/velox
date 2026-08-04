(function () {
  var s = document.currentScript;
  var site = s && s.getAttribute('data-site');
  if (!site) return;

  var vid;
  try {
    vid = localStorage.getItem('_vx_vid');
    if (!vid) {
      vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('_vx_vid', vid);
    }
  } catch (e) { vid = ''; }

  var endpoint = (s.src || '').replace(/\/tracker\.js.*$/, '') + '/api/track/pv';

  function send() {
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: site,
          path: location.pathname,
          referrer: document.referrer || '',
          visitorId: vid
        }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  send();
})();
