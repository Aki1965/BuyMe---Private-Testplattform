import {getLanguage} from './i18n.js';

// Separate from the app render loop: opening/closing this help never changes a deal.
const COPY = {
  de: {strap:'BuyMe auf deinem Startbildschirm',button:'App installieren',title:'BuyMe als App speichern',intro:'Direkt über das BuyMe-Symbol öffnen – ohne App Store.',ios:'iPhone / iPad · Safari',iosSteps:['Diesen Link in Safari öffnen und bei Bedarf mit deinem ChatGPT-Konto anmelden.','„Teilen“ öffnen (je nach Safari-Ansicht zuerst „Mehr“).','„Zum Home-Bildschirm“ bzw. „Zu Home-Bildschirm hinzufügen“ wählen.','Falls angeboten: „Als Web-App öffnen“ aktivieren. Dann „Hinzufügen“ tippen.'],android:'Android · Chrome',androidSteps:['Diesen Link in Chrome öffnen und bei Bedarf anmelden.','„App installieren“ antippen. Falls kein Dialog erscheint: Chrome-Menü ⋮ → „Zum Startbildschirm hinzufügen“ → „Installieren“.'],note:'Internet erforderlich. Der Teststand bleibt auf diesem Gerät; Browser und installierte App können getrennte Teststände haben. Die Installation synchronisiert keine Daten und aktiviert keine echten Zahlungen.',close:'Schließen',native:'Jetzt installieren',busy:'Installation öffnen …',failed:'Bitte verwende das Browser-Menü oder die Anleitung unten.'},
  en: {strap:'BuyMe on your home screen',button:'Install app',title:'Save BuyMe as an app',intro:'Open directly from the BuyMe icon — no app store needed.',ios:'iPhone / iPad · Safari',iosSteps:['Open this link in Safari and sign in with your ChatGPT account if requested.','Open Share (in some layouts, tap More first).','Select Add to Home Screen.','If available, enable Open as Web App. Then tap Add.'],android:'Android · Chrome',androidSteps:['Open this link in Chrome and sign in if requested.','Tap Install app. If no prompt appears: Chrome menu ⋮ → Add to Home screen → Install.'],note:'Internet required. Test data stays on this device; the browser and installed app may have separate data. Installing does not sync data or enable real payments.',close:'Close',native:'Install now',busy:'Opening installation …',failed:'Please use the browser menu or the instructions below.'},
  fr: {strap:'BuyMe sur votre écran d’accueil',button:'Installer l’application',title:'Enregistrer BuyMe comme application',intro:'Ouvrez BuyMe depuis son icône, sans boutique d’applications.',ios:'iPhone / iPad · Safari',iosSteps:['Ouvrez ce lien dans Safari et connectez-vous à votre compte ChatGPT si nécessaire.','Ouvrez Partager (selon la présentation, touchez d’abord Plus).','Choisissez Sur l’écran d’accueil.','Si proposé, activez Ouvrir comme app web, puis touchez Ajouter.'],android:'Android · Chrome',androidSteps:['Ouvrez ce lien dans Chrome et connectez-vous si nécessaire.','Touchez Installer l’application. Sinon : menu Chrome ⋮ → Ajouter à l’écran d’accueil → Installer.'],note:'Connexion Internet requise. Les données de test restent sur cet appareil ; le navigateur et l’application peuvent avoir des données séparées. Aucune synchronisation ni aucun paiement réel.',close:'Fermer',native:'Installer maintenant',busy:'Ouverture de l’installation…',failed:'Utilisez le menu du navigateur ou les instructions ci-dessous.'},
  sv: {strap:'BuyMe på din hemskärm',button:'Installera appen',title:'Spara BuyMe som en app',intro:'Öppna direkt via BuyMe-ikonen, utan appbutik.',ios:'iPhone / iPad · Safari',iosSteps:['Öppna länken i Safari och logga in med ditt ChatGPT-konto om det behövs.','Öppna Dela (i vissa vyer väljer du först Mer).','Välj Lägg till på hemskärmen.','Aktivera Öppna som webbapp om alternativet visas. Tryck sedan på Lägg till.'],android:'Android · Chrome',androidSteps:['Öppna länken i Chrome och logga in om det behövs.','Tryck på Installera appen. Annars: Chrome-menyn ⋮ → Lägg till på startskärmen → Installera.'],note:'Internet krävs. Testdata stannar på enheten; webbläsaren och appen kan ha separata data. Installationen synkroniserar inga data och aktiverar inga riktiga betalningar.',close:'Stäng',native:'Installera nu',busy:'Öppnar installationen …',failed:'Använd webbläsarmenyn eller anvisningarna nedan.'},
  it: {strap:'BuyMe sulla schermata Home',button:'Installa l’app',title:'Salva BuyMe come app',intro:'Apri BuyMe dalla sua icona, senza app store.',ios:'iPhone / iPad · Safari',iosSteps:['Apri il link in Safari e accedi con il tuo account ChatGPT, se richiesto.','Apri Condividi (in alcune viste, prima tocca Altro).','Scegli Aggiungi alla schermata Home.','Se disponibile, attiva Apri come app web. Poi tocca Aggiungi.'],android:'Android · Chrome',androidSteps:['Apri il link in Chrome e accedi, se richiesto.','Tocca Installa l’app. Altrimenti: menu Chrome ⋮ → Aggiungi a schermata Home → Installa.'],note:'È necessaria una connessione Internet. I dati di prova restano sul dispositivo; browser e app possono avere dati separati. L’installazione non sincronizza i dati e non attiva pagamenti reali.',close:'Chiudi',native:'Installa ora',busy:'Apertura dell’installazione…',failed:'Usa il menu del browser o le istruzioni qui sotto.'},
  tr: {strap:'BuyMe ana ekranınızda',button:'Uygulamayı yükle',title:'BuyMe’yi uygulama olarak kaydet',intro:'Uygulama mağazası olmadan BuyMe simgesinden doğrudan açın.',ios:'iPhone / iPad · Safari',iosSteps:['Bu bağlantıyı Safari’de açın ve gerekirse ChatGPT hesabınızla giriş yapın.','Paylaş menüsünü açın (bazı görünümlerde önce Daha Fazla’ya dokunun).','Ana Ekrana Ekle’yi seçin.','Sunulursa Web Uygulaması Olarak Aç’ı etkinleştirin. Ardından Ekle’ye dokunun.'],android:'Android · Chrome',androidSteps:['Bu bağlantıyı Chrome’da açın ve gerekirse giriş yapın.','Uygulamayı yükle’ye dokunun. İstem görünmezse: Chrome menüsü ⋮ → Ana ekrana ekle → Yükle.'],note:'İnternet bağlantısı gereklidir. Test verileri bu cihazda kalır; tarayıcı ve uygulamanın verileri ayrı olabilir. Yükleme verileri eşitlemez ve gerçek ödemeleri etkinleştirmez.',close:'Kapat',native:'Şimdi yükle',busy:'Yükleme açılıyor …',failed:'Tarayıcı menüsünü veya aşağıdaki talimatları kullanın.'}
};
let installPrompt = null, installed = false, busy = false;
const display = window.matchMedia('(display-mode: standalone)');
const isStandalone = () => installed || display.matches || navigator.standalone === true;
const bar = document.createElement('aside');
bar.className = 'pwa-install'; bar.hidden = true; bar.setAttribute('translate','no');
const help = document.createElement('dialog');
help.className = 'pwa-dialog'; help.setAttribute('translate','no'); help.setAttribute('aria-labelledby','pwa-title');
document.body.prepend(bar); document.body.append(help);
const text = () => COPY[getLanguage()] || COPY.de;
const esc = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const steps = values => '<ol>'+values.map(value=>'<li>'+esc(value)+'</li>').join('')+'</ol>';
function render(){
  const c = text(); bar.lang = help.lang = getLanguage();
  bar.hidden = isStandalone();
  bar.innerHTML = `<div class="pwa-bar-inner"><span><img src="./assets/icons/buyme-192.png" width="28" height="28" alt="">${esc(c.strap)}</span><button type="button" data-pwa="open">${esc(c.button)}</button></div>`;
  help.innerHTML = `<div class="pwa-dialog-body"><img src="./assets/icons/buyme-192.png" width="64" height="64" alt="BuyMe"><h2 id="pwa-title" tabindex="-1" autofocus>${esc(c.title)}</h2><p>${esc(c.intro)}</p><button type="button" class="pwa-native" data-pwa="native" ${!installPrompt?'hidden':''} ${busy?'disabled':''}>${esc(busy?c.busy:c.native)}</button><p class="pwa-status" role="status" aria-live="polite"></p><section><h3>${esc(c.ios)}</h3>${steps(c.iosSteps)}</section><section><h3>${esc(c.android)}</h3>${steps(c.androidSteps)}</section><p class="pwa-note">${esc(c.note)}</p><button type="button" class="pwa-close" data-pwa="close">${esc(c.close)}</button></div>`;
}
async function promptInstall(){
  if (!installPrompt || busy) return;
  const prompt = installPrompt; installPrompt = null; busy = true; render();
  try {
    // Must be called immediately within the user's click gesture, once per event.
    await prompt.prompt(); const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') { if (help.open) help.close(); }
  } catch { help.querySelector('.pwa-status').textContent = text().failed; }
  finally { busy = false; const button=help.querySelector('[data-pwa="native"]');button.hidden=true;button.disabled=false; }
}
bar.addEventListener('click', e => {if(!e.target.closest('[data-pwa="open"]'))return;render();help.showModal();});
help.addEventListener('click', e => {
  const action=e.target.closest('[data-pwa]')?.dataset.pwa;
  if(action==='close')help.close();
  if(action==='native')void promptInstall();
});
window.addEventListener('beforeinstallprompt', e => {e.preventDefault();installPrompt=e;render();});
window.addEventListener('appinstalled', () => {installed=true;installPrompt=null;help.close();render();});
display.addEventListener?.('change', () => {if(isStandalone())help.close();render();});
document.addEventListener('buyme:languagechange', render);
render();
if ('serviceWorker' in navigator && window.isSecureContext && ['http:','https:'].includes(location.protocol)) {
  const register = () => navigator.serviceWorker.register(new URL('./sw.js',document.baseURI), {scope:new URL('./',document.baseURI).pathname,updateViaCache:'none'}).catch(() => {
    // Installation instructions and the online app also work without a worker.
    console.info('BuyMe: Service Worker nicht verfügbar. Die Online-App bleibt nutzbar.');
  });
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load',register,{once:true});
}
