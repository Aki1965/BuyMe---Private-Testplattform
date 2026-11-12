# BuyMe: offene Registrierung mit eigenen Kontodaten

Stand: 12.11.2026. Technische Vorbereitung; **noch nicht öffentlich freigeschaltet**.

## Bestätigte Zuordnung

- Betreiber der Testversion: Ejdat Akyol. Die vollständige Betreiberanschrift fehlt noch.
- Gewünschter Zugang: Jeder darf ein kostenloses Testkonto registrieren; keine Einladung erforderlich.
- Vorgesehene App-Adresse: https://buyme.com.tr
- Netlify-Projekt: `luxury-lebkuchen-4e9d94`; der Projektzugriff über `info@buy-me.net` ist noch nicht bestätigt.
- Vom Betreiber als in Brevo verifiziert bestätigter Absender: `info@buyme.com.tr`. Die tatsächliche SMTP-Anbindung an Supabase wurde noch nicht geprüft.
- Supabase: ausschließlich `BuyMe Test`, Projekt `xxbqrrkkndpjsupvhdmc`, EU-Region Irland. Das separate Shopboostr-Projekt wurde nicht verändert.

## Implementierter Umfang

`account.html` ist ein eigenständiger Kontobereich: Registrierung, E-Mail-Bestätigung über Supabase Auth, Anmeldung, Passwort-Link, Passwortänderung mit anschließender Abmeldung, eigenes Profil und Abmeldung. Mitglieder und Anbieterinteressenten können sich anmelden. Die Auswahl eines Anbieterkontos ist nur eine Anfrage; sie erzeugt weder Anbieterfreigabe noch Adminrechte.

Die Tabelle `public.buyme_test_profiles` wurde mit Migration `20261112141827_buyme_test_profiles.sql` in BuyMe Test angelegt. RLS beschränkt den Browserzugriff auf das eigene Profil. Nicht angemeldete Besucher haben keinen Tabellenzugriff. Kontoinhaber dürfen Name und Firmenname ändern, jedoch nicht Eigentümer-ID, Rolle, Bedingungenversion oder Zeitstempel. E-Mail und Passwort werden von Supabase Auth verwaltet. Für Auskunft und Kontolöschung ist im ersten Test der Betreiber über die angegebene Kontaktadresse zuständig.

Die bisherige Plattform bleibt eine Demo mit lokal gespeicherten, fiktiven Vorgängen und öffentlichen Demo-Zugängen. Neue Supabase-Konten werden **nicht** in diesen lokalen Datenbestand importiert. Diese Vorbereitung migriert keine Angebote, Deals, Nachrichten, Dateien oder Wallets. Die bestehenden Registrierungs-/Anmeldebuttons sind noch nicht auf den neuen Kontobereich umgeschaltet. Ein gemeinsamer Marktplatz mit echten Konten benötigt anschließend den passenden Backend-Anschluss und Rollen-/Dateizugriffstests.

## Freischaltung nach Konfiguration und Abnahme

Die folgenden Einstellungen werden in der bestätigten Netlify-Site hinterlegt. Keine Geheimnisse gehören in dieses Repository.

| Variable | Wert / Zweck |
| --- | --- |
| `SUPABASE_URL` | `https://xxbqrrkkndpjsupvhdmc.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Aktiver `sb_publishable_...`-Key aus BuyMe Test; kein Secret-/service_role-Key |
| `BUYME_APP_ORIGIN` | Bestätigte kanonische HTTPS-App-Adresse, vorgesehen `https://buyme.com.tr` |
| `BUYME_OPERATOR_ADDRESS` | Vollständige, tatsächlich verwendbare Betreiberanschrift |
| `BUYME_ACCOUNT_SIGNUP_ENABLED` | Zunächst `false`; erst nach Abnahme `true` |
| `BUYME_ACCOUNT_SETUP_VERIFIED` | Zunächst `false`; erst nach vollständiger Prüfung unten `true` |

Ohne diese Freigaben zeigt die Seite einen Vorbereitungszustand und initialisiert keinen Supabase-Client. Der Build lehnt eine aktive Konfiguration ohne Betreiberanschrift, Bestätigung der Einrichtung, HTTPS-Adressen oder Publishable Key ab. Es werden ausschließlich die aufgeführten öffentlichen Einstellungen in den Browser geschrieben; SMTP-Passwort und Brevo-API-Key werden nicht in den Build übernommen.

In Supabase Auth müssen vor der Abnahme die Registrierung per E-Mail aktiviert, E-Mail-Bestätigung eingeschaltet und anonyme Anmeldungen ausgeschaltet sein. Die Site URL und die erlaubte Rücksprungadresse müssen zur kanonischen Domain passen; vorgesehen ist `https://buyme.com.tr/account.html`. PKCE-Links möglichst im Browser der Registrierung öffnen; nach Bestätigung ist auch eine normale Anmeldung mit dem Passwort möglich.

Brevo wird als **Custom SMTP direkt in Supabase Auth** konfiguriert: SMTP-Host, Port, SMTP-Benutzer und SMTP-Schlüssel über die geschützten Einstellungen hinterlegen; als Absender `info@buyme.com.tr`. Ein Brevo-API-Key im Frontend oder in Netlifys öffentlichen Buildvariablen ersetzt diese Konfiguration nicht. Domain-Authentifizierung, Zustellbarkeit, Bestätigungslink, Passwort-Link und Rate Limits prüfen. Keine automatische Werbeanmeldung.

Der Security Advisor meldet aktuell „Leaked Password Protection Disabled“. Diese Einstellung ist vor der Freigabe zu prüfen; ein gegebenenfalls erforderlicher kostenpflichtiger Tarif wird nicht automatisch gebucht. Anleitung: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Die mitgelieferten Kontotest-Rechtstexte sind Arbeitsstände. Betreiberanschrift, tatsächliche Auftragsverarbeitung, Übermittlungen, Testende und Löschfristen müssen vor Freigabe vervollständigt und geprüft werden. Auch Cookiebot muss zur tatsächlichen Domain und den verwendeten optionalen Diensten passen. Die Kontoseite selbst lädt keine Analyse- oder Marketingdienste.

## Lokale Prüfung

```bash
npm ci
npm run verify
npm run build
npm run preview
```

Danach `http://localhost:4173/account.html` öffnen. Standardmäßig bleibt die Registrierung geschlossen. `npm run dev` baut ebenfalls zuerst und startet anschließend die gebauten Dateien. Die Supabase-Browserbibliothek wird mit fest gepinnter Version über esbuild gebündelt; es gibt keinen SDK-Import über einen fremden CDN.

`supabase/tests/profile_access.sql` wurde im Testprojekt ausgeführt. Es erzeugt ausschließlich temporäre Testpersonen, prüft eigenen Zugriff, fremde Schreibzugriffe, gefälschte Admin-Metadaten, unveränderliche Spalten und anonymen Zugriff und rollt anschließend alles zurück. Es werden keine E-Mails verschickt und keine bestehenden Personen gelöscht.

Für die Endabnahme noch offen: reale Zustellung einer ausdrücklich autorisierten Testmail, Bestätigung und erneute Anmeldung, Passwortzurücksetzung, zwei voneinander getrennte Geräte, endgültige Rechtstexte sowie der tatsächliche Netlify-Deploy. Diese Prüfung wurde noch nicht als erfolgreich behauptet.

## Grundlagen

- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
