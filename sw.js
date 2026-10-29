/* BuyMe PWA v1 · online-only private test application.
 * Never cache pages, login redirects, API responses or participant data.
 * Every online navigation still goes through the hosting access check.
 */
const OFFLINE_PAGE = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#123563">
<title>BuyMe · Keine Verbindung</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f5f8fc;color:#123563;font:17px/1.6 system-ui,sans-serif}
main{max-width:440px;background:white;padding:32px;border:1px solid #dce5f2;border-radius:24px}h1{font-size:28px;line-height:1.2}a{display:inline-block;background:#123563;color:white;padding:12px 20px;border-radius:12px;text-decoration:none}small{display:block;margin-top:24px;color:#52657d}
</style></head><body><main><strong>BuyMe</strong><h1>Du bist gerade offline.</h1>
<p>Verbinde dein Gerät mit dem Internet und öffne BuyMe erneut. Die private Testplattform benötigt eine Verbindung für die Zugangskontrolle.</p>
<a href="./">Erneut versuchen</a><small>Deine vorhandenen lokalen Testdaten werden durch diese Meldung nicht gelöscht. / Internet connection required.</small>
</main></body></html>`;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const {request} = event;
  // Leave assets, all third-party requests, auth callbacks and mutations alone.
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  const url = new URL(request.url), base = new URL(self.registration.scope);
  if (url.origin !== base.origin || url.search) return;
  const path = url.pathname.slice(base.pathname.length);
  if (!url.pathname.startsWith(base.pathname) || !['', 'index.html', 'admin.html'].includes(path)) return;
  event.respondWith(fetch(request, {cache: 'no-store'}).catch(() => new Response(OFFLINE_PAGE, {
    status: 503,
    headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}
  })));
});
