import {createClient} from '@supabase/supabase-js';
import {accountConfig as config} from './account-config.js';
import {createAccountService} from './account-service.js';

const root = document.querySelector('#account-main');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const email = '<label>E-Mail-Adresse<input name="email" type="email" maxlength="254" autocomplete="username" required></label>';
const password = (name, label, current = false) => `<label>${label}<input name="${name}" type="password" minlength="${current ? 1 : 12}" maxlength="128" autocomplete="${current ? 'current-password' : 'new-password'}" required></label>`;
const route = () => location.hash.slice(1) || 'register';
const errorBox = '<div class="error" role="alert" tabindex="-1"></div>';
let client, service, current = null, recovery = false, busy = false, refreshing = false;
let notice = '', confirmedEmail = '';

function layout(content) {
  root.innerHTML = `<div class="layout"><section class="intro"><div class="eyebrow">DEIN BUYME-TESTKONTO</div><h1>Deine Entscheidung.<br>Dein BuyMe.</h1><p>Registriere dich kostenlos mit deiner eigenen E-Mail-Adresse und verwalte dein persönliches Testprofil.</p><ul class="benefits"><li>Bestätigung deiner E-Mail-Adresse</li><li>Dein geschütztes Benutzerprofil</li><li>Mitglied oder Anbieterinteressent</li></ul><div class="notice">Dein Konto wird zentral gespeichert. Der Marktplatz ist eine getrennte Demo mit fiktiven, lokalen Vorgängen und ohne echte Zahlungen.</div><a href="./index.html?demo=1">Testmarktplatz ansehen</a></section><section class="card">${notice ? `<p class="message" role="status">${esc(notice)}</p>` : ''}${content}</section></div>`;
}

function showDocument(kind) {
  const address = config.operatorAddress || 'Die vollständige Betreiberanschrift ist noch nicht hinterlegt. Die Registrierung ist deshalb geschlossen.';
  const identity = `<p><strong>${esc(config.operatorName)}</strong><br>${esc(config.operatorContext || 'BuyMe-Testversion')}<br><span class="address">${esc(address)}</span><br><a href="mailto:${config.senderEmail}">${config.senderEmail}</a></p>`;
  const content = {
    imprint: `<h1>Impressum</h1><p>Betreiber der BuyMe-Testversion:</p>${identity}<p>Diese Testversion ermöglicht keine echten Zahlungen oder kostenpflichtigen Vertragsabschlüsse.</p>`,
    privacy: `<h1>Datenschutz im Kontotest</h1><h2>Verantwortlicher</h2>${identity}<h2>Welche Daten verarbeitet werden</h2><p>Für dein Konto verwenden wir deinen Namen, deine E-Mail-Adresse und den gewünschten Kontotyp. Anbieterinteressenten können einen Firmennamen angeben. Supabase Auth verarbeitet dein Passwort; es wird nicht in der Profiltabelle gespeichert. Bei Anmeldung und Nutzung können technische Verbindungs-, Sicherheits- und Serverprotokolle entstehen.</p><h2>Zweck und Rechtsgrundlage</h2><p>Die Daten dienen der Einrichtung, Absicherung und Verwaltung des von dir angeforderten Testkontos. Grundlage für die notwendige Kontoverwaltung ist Art. 6 Abs. 1 Buchst. b DSGVO. Sicherheitsmaßnahmen und erforderliche Protokollierung werden auf Grundlage berechtigter Interessen nach Art. 6 Abs. 1 Buchst. f DSGVO bewertet und dokumentiert. Eine Einwilligung in Werbung ist keine Voraussetzung für die Registrierung.</p><h2>Eingesetzte Dienste</h2><p>Supabase stellt Authentifizierung und Datenbank für das separate Projekt „BuyMe Test“ in der EU-Region Irland bereit. Netlify ist für die Bereitstellung der Website vorgesehen; Brevo für Bestätigungs- und Passwort-E-Mails mit dem Absender info@buyme.com.tr. Vor der Freigabe müssen die tatsächlich eingerichteten Dienste, Auftragsverarbeitungsverträge, Speicherfristen und gegebenenfalls Übermittlungen außerhalb des EWR abschließend geprüft und diese Hinweise entsprechend vervollständigt sein.</p><h2>Speicherung und Zugriff</h2><p>Dein Profil kann über die öffentliche Datenbankschnittstelle nur von deinem angemeldeten Konto gelesen und geändert werden. Der Betreiber kann im Rahmen der Administration auf Daten zugreifen. Der Browser speichert für diese Anmeldung notwendige Sitzungsinformationen im Sitzungsspeicher. Daten aus diesem Kontobereich werden nicht in den lokalen Datenbestand der bisherigen Demo übernommen. Optionale Analyse- und Werbedienste sind in diesem Kontobereich nicht eingebaut.</p><h2>Löschung und deine Rechte</h2><p>Du kannst Auskunft, Berichtigung, Löschung und gegebenenfalls Einschränkung, Datenübertragbarkeit oder Widerspruch verlangen. Wende dich dafür an ${config.senderEmail}. Testdaten sollen nach Ende des festgelegten Testzeitraums gelöscht werden, soweit keine begründete Aufbewahrung erforderlich ist. Der konkrete Testzeitraum und die Löschfristen müssen vor der Freigabe festgelegt werden. Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren; für Baden-Württemberg ist dies insbesondere der Landesbeauftragte für den Datenschutz und die Informationsfreiheit.</p>`,
    terms: `<h1>Testnutzungsbedingungen</h1><p>Version ${esc(config.termsVersion)}</p><h2>Betreiber und Testzweck</h2>${identity}<p>Die Registrierung ist kostenlos und steht Personen ab 18 Jahren offen. Die Plattform dient der Erprobung von BuyMe. Ein Testkonto begründet keinen Anspruch auf Cashback, eine Auszahlung, eine Debitkarte oder einen Vertrag mit einem Anbieter.</p><h2>Dein Konto</h2><p>Verwende eine E-Mail-Adresse, auf die du Zugriff hast, bestätige sie und schütze dein Passwort. Gib nur eigene Angaben oder Angaben eines Unternehmens ein, für das du handeln darfst. Die Auswahl „Anbieterinteressent“ ist eine Anfrage und erteilt keine Administrations- oder Veröffentlichungsrechte.</p><h2>Umgang mit Testdaten</h2><p>Nutze für simulierte Deals und Nachrichten keine Ausweis-, Bank-, Gesundheitsdaten oder vertraulichen Vertragsunterlagen. Für ein echtes Angebot oder einen echten Vertrag ist dieser Test nicht vorgesehen. Die Verarbeitung deiner Kontodaten wird in den Datenschutzhinweisen beschrieben.</p><h2>Verfügbarkeit und Beendigung</h2><p>Funktionen können sich im Test ändern. Der Betreiber kann den Test beenden und Konten bei Missbrauch sperren. Gesetzliche Ansprüche bleiben unberührt. Eine Kontolöschung kannst du über ${config.senderEmail} anfordern.</p>`
  };
  root.innerHTML = `<article class="card document">${!config.enabled ? '<p class="notice">Arbeitsstand vor der Freigabe. Die Registrierung ist geschlossen.</p>' : ''}${content[kind]}<p><a href="#register">Zur Registrierung</a></p></article>`;
}

function render() {
  const page = route();
  if (['imprint', 'privacy', 'terms'].includes(page)) { showDocument(page); return; }
  if (!config.enabled) {
    layout('<h2>Registrierung wird vorbereitet</h2><p>Die Anmeldung mit eigenen Nutzerdaten ist noch nicht freigeschaltet.</p><p>Vor dem Start werden E-Mail-Versand, Betreiberangaben und Datenschutz geprüft.</p><p>Kontakt: <a href="mailto:info@buyme.com.tr">info@buyme.com.tr</a></p>');
    return;
  }
  if (location.origin !== config.appOrigin) {
    layout(`<h2>Bitte die bestätigte Testadresse verwenden</h2><a class="btn full" href="${esc(new URL('/account.html', config.appOrigin).href)}">Zum BuyMe-Kontobereich</a>`);
    return;
  }
  if (recovery) {
    layout(`<h2>Neues Passwort festlegen</h2><form data-account="password">${password('password', 'Neues Passwort')}${password('passwordConfirm', 'Passwort wiederholen')}${errorBox}<button class="btn full">Passwort speichern und abmelden</button></form>`);
    return;
  }
  if (current) {
    const p = current.profile;
    if (!p) {
      layout(`<h2>Testprofil vervollständigen</h2><p>Deine E-Mail-Adresse ${esc(current.user.email)} ist bestätigt. Für dein Testprofil fehlen noch diese Angaben:</p><form data-account="complete"><label>Kontotyp<select name="role"><option value="member">Mitglied</option><option value="provider">Anbieterinteressent</option></select></label><label>Name<input name="name" minlength="2" maxlength="100" autocomplete="name" required></label><label data-company hidden>Firmenname<input name="company" maxlength="160" autocomplete="organization"></label><label class="check"><input name="terms" type="checkbox" required><span>Ich bin mindestens 18 Jahre alt und akzeptiere die <a href="#terms" target="_blank" rel="noopener">Testnutzungsbedingungen</a>. <a href="#privacy" target="_blank" rel="noopener">Datenschutzhinweise</a></span></label>${errorBox}<button class="btn full">Testprofil anlegen</button></form><p><button class="btn secondary" data-signout>Abmelden</button></p>`);
      return;
    }
    layout(`<h2>Hallo ${esc(p.display_name)}</h2><p>Deine E-Mail-Adresse ist bestätigt.</p><dl class="facts"><div><dt>E-Mail</dt><dd>${esc(current.user.email)}</dd></div><div><dt>Kontotyp</dt><dd>${p.requested_role === 'provider' ? 'Anbieterinteressent · Prüfung ausstehend' : 'Mitglied im Test'}</dd></div></dl><form data-account="profile"><label>Name<input name="name" minlength="2" maxlength="100" autocomplete="name" required value="${esc(p.display_name)}"></label>${p.requested_role === 'provider' ? `<label>Firmenname<input name="company" maxlength="160" autocomplete="organization" value="${esc(p.company_name)}"></label>` : ''}${errorBox}<button class="btn full">Profil speichern</button></form><div class="links"><a href="#forgot">Passwort zurücksetzen</a><button class="btn secondary" data-signout>Abmelden</button></div><p class="small">Kontolöschung oder Auskunft: <a href="mailto:${config.senderEmail}">${config.senderEmail}</a></p>`);
    return;
  }
  if (page === 'forgot') {
    layout(`<h2>Passwort vergessen?</h2><p>Wir senden dir einen Link zum Zurücksetzen, falls für diese Adresse ein Konto besteht.</p><form data-account="forgot">${email}${errorBox}<button class="btn full">Link anfordern</button></form><p><a href="#login">Zur Anmeldung</a></p>`);
    return;
  }
  if (page === 'confirmation') {
    layout(`<h2>Bitte dein E-Mail-Postfach prüfen</h2><p>Falls die Adresse für eine Registrierung verwendet werden kann, erhältst du eine E-Mail mit einem Bestätigungslink. Prüfe auch den Spam-Ordner.</p><form data-account="resend">${email}${errorBox}<button class="btn secondary full">Bestätigung erneut anfordern</button></form><p><a href="#login">Nach der Bestätigung anmelden</a></p>`);
    const field = root.querySelector('input[name=email]'); if (field) field.value = confirmedEmail;
    return;
  }
  const register = !['login', 'profile'].includes(page);
  layout(`<nav class="tabs" aria-label="Konto"><a href="#register" ${register ? 'aria-current="page"' : ''}>Registrieren</a><a href="#login" ${!register ? 'aria-current="page"' : ''}>Anmelden</a></nav><h2>${register ? 'Kostenloses Testkonto erstellen' : 'Bei BuyMe anmelden'}</h2><form data-account="${register ? 'register' : 'login'}">${register ? '<label>Kontotyp<select name="role"><option value="member">Mitglied</option><option value="provider">Anbieterinteressent</option></select></label><label>Vor- und Nachname<input name="name" minlength="2" maxlength="100" autocomplete="name" required></label><label data-company hidden>Firmenname<input name="company" maxlength="160" autocomplete="organization"></label>' : ''}${email}${password('password', 'Passwort', !register)}${register ? `${password('passwordConfirm', 'Passwort wiederholen')}<p class="small">Mindestens 12 Zeichen. Deine E-Mail-Adresse muss anschließend bestätigt werden.</p><label class="check"><input name="terms" type="checkbox" required><span>Ich bin mindestens 18 Jahre alt und akzeptiere die <a href="#terms" target="_blank" rel="noopener">Testnutzungsbedingungen</a>. Hinweise zur Datenverarbeitung stehen im <a href="#privacy" target="_blank" rel="noopener">Datenschutz</a>.</span></label>` : ''}${errorBox}<button class="btn full">${register ? 'Registrieren' : 'Anmelden'}</button></form>${!register ? '<p><a href="#forgot">Passwort vergessen?</a></p>' : ''}`);
  if (register && page === 'register-provider') {
    const role = root.querySelector('select[name=role]');
    if (role) {
      role.value = 'provider';
      const company = root.querySelector('[data-company]');
      company.hidden = false;
      company.querySelector('input').required = true;
    }
  }
}

function friendly(error) {
  const code = error?.code;
  if (code === 'invalid_credentials') return 'E-Mail-Adresse oder Passwort ist nicht korrekt.';
  if (code === 'email_not_confirmed') return 'Bitte zuerst den Link in deiner Bestätigungs-E-Mail öffnen.';
  if (['over_email_send_rate_limit', 'over_request_rate_limit'].includes(code) || error?.status === 429) return 'Zu viele Versuche. Bitte später erneut versuchen.';
  if (error instanceof TypeError) return 'Der Dienst ist gerade nicht erreichbar. Bitte die Internetverbindung prüfen und erneut versuchen.';
  if (code) return 'Die Anfrage konnte nicht abgeschlossen werden. Bitte später erneut versuchen oder den Betreiber kontaktieren.';
  return error?.message || 'Die Anfrage konnte nicht abgeschlossen werden.';
}

async function refresh() {
  if (!service || refreshing) return;
  refreshing = true;
  try {
    const {data, error} = await client.auth.getSession();
    if (error) throw error;
    current = data?.session ? await service.ownProfile() : null;
  } catch (error) { current = null; notice = friendly(error); }
  finally { refreshing = false; render(); }
}

root.addEventListener('change', event => {
  if (event.target.name !== 'role') return;
  const provider = event.target.value === 'provider';
  const label = root.querySelector('[data-company]');
  label.hidden = !provider;
  label.querySelector('input').required = provider;
});
root.addEventListener('click', async event => {
  if (!event.target.closest('[data-signout]') || busy) return;
  busy = true;
  try { await service.signOut(); current = null; recovery = false; notice = 'Du bist abgemeldet.'; location.hash = 'login'; render(); }
  catch (error) { notice = friendly(error); render(); }
  finally { busy = false; }
});
root.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-account]');
  if (!form) return;
  event.preventDefault();
  if (busy || !service || !form.reportValidity()) return;
  const fields = Object.fromEntries(new FormData(form));
  const button = form.querySelector('button');
  const error = form.querySelector('.error');
  busy = true; button.disabled = true; button.setAttribute('aria-busy', 'true'); error.textContent = '';
  try {
    notice = '';
    switch (form.dataset.account) {
      case 'register': await service.register(fields); confirmedEmail = fields.email; form.reset(); location.hash = 'confirmation'; break;
      case 'login': current = await service.signIn(fields.email, fields.password); form.reset(); location.hash = 'profile'; break;
      case 'forgot': await service.requestReset(fields.email); form.reset(); notice = 'Falls ein Konto besteht, erhältst du eine E-Mail zum Zurücksetzen.'; break;
      case 'resend': await service.resendConfirmation(fields.email); notice = 'Falls die Adresse bestätigt werden kann, wurde die E-Mail angefordert.'; break;
      case 'profile': current.profile = await service.saveProfile(fields); notice = 'Dein Profil wurde gespeichert.'; break;
      case 'complete': current.profile = await service.completeProfile(fields); notice = 'Dein Testprofil wurde angelegt.'; break;
      case 'password': await service.setPassword(fields.password, fields.passwordConfirm); form.reset(); current = null; recovery = false; notice = 'Passwort geändert. Bitte melde dich erneut an.'; location.hash = 'login'; break;
    }
    render();
  } catch (failure) {
    if (error.isConnected) { error.textContent = friendly(failure); error.focus(); }
    // Password fields are cleared after every attempt; no credential is cached by the page.
    form.querySelectorAll('input[type=password]').forEach(field => { field.value = ''; });
  } finally {
    busy = false;
    if (button.isConnected) { button.disabled = false; button.removeAttribute('aria-busy'); }
  }
});
window.addEventListener('hashchange', () => { if (!busy) render(); });
window.addEventListener('pageshow', event => { if (event.persisted) void refresh(); });

render();
if (config.enabled && location.origin === config.appOrigin) {
  try {
    client = createClient(config.supabaseUrl, config.publishableKey, {auth: {
      flowType: 'pkce', detectSessionInUrl: true, autoRefreshToken: true,
      persistSession: true, storage: sessionStorage, storageKey: 'buyme-test-account-auth'
    }});
    service = createAccountService(client, config);
    client.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') recovery = true;
      if (event === 'SIGNED_OUT') { current = null; recovery = false; }
      // Never call another Auth method while its event callback holds the Auth lock.
      setTimeout(() => { if (!busy) void refresh(); }, 0);
    });
    await refresh();
  } catch { layout('<h2>Anmeldung vorübergehend nicht verfügbar</h2><p>Bitte versuche es später erneut oder wende dich an info@buyme.com.tr.</p>'); }
}
