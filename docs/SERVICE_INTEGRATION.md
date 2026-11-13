# BuyMe: Supabase, Cookiebot, Netlify und Brevo

Stand: 12.11.2026. Dies ist die Vorbereitung der Anbindung, keine bereits aktivierte Mehrbenutzerplattform. Die neue Kontoregistrierung und die tatsächlich eingerichtete Supabase-Profiltabelle sind in [TEST_ACCOUNT_REGISTRATION.md](TEST_ACCOUNT_REGISTRATION.md) dokumentiert.

## Tatsächlicher Stand

Die bestehende Anwendung auf main ist weiterhin ein browserlokaler Prototyp. Anmeldung, Rollen, Deals und Wallet werden noch nicht durch Supabase verarbeitet. Anhänge liegen in IndexedDB. Eine Netlify-Veröffentlichung allein ändert dieses Verhalten nicht.

| Dienst | Vorbereitet | Für die tatsächliche Anbindung offen |
| --- | --- | --- |
| Supabase | Verbindung zu BuyMe Test bestätigt; private Profiltabelle und RLS-Zugriff geprüft; Kontobereich vorbereitet | Auth-/SMTP-Konfiguration, Freischaltung und anschließende Migration der Marktplatzdaten und Dateien |
| Netlify | Build-/Publish-Konfiguration für die vorhandenen HTML-/JS-Dateien | Anmeldung, Zuordnung der richtigen Site und sichere Umgebungsvariablen |
| Cookiebot | Domain-Group-ID im Konfigurationsvertrag | ID, tatsächlich genutzte Domains, Scan und Prüfung des Einwilligungsverhaltens |
| Brevo | Trennung von geheimem API-Key und Absenderkonfiguration | Kontozugang, verifizierter Absender, SMTP/Auth- und Transaktionsintegration |

Im getrennten Supabase-Projekt BuyMe Test wurde eine Profiltabellen-Migration angewendet. Das bestehende Shopboostr-Projekt wurde nicht verändert. Die Netlify-Anmeldung ist noch nicht abgeschlossen; die Registrierung wurde noch nicht öffentlich freigeschaltet und es wurden keine Testmails verschickt.

## Vorhandene Projekte eindeutig zuordnen

Vor Änderungen die Dashboard-Links von Supabase und Netlify sowie die gewünschte BuyMe-Testdomain bestätigen. Das vorhandene Shopboostr-System und dessen Tabellen dürfen nicht ungeprüft durch ein neues Schema ersetzt werden. Für die zusätzliche BuyMe-Version zunächst eine getrennte Testumgebung bzw. einen bestätigten Entwicklungszweig verwenden. Cookiebot muss genau die tatsächlich verwendete Domain erfassen; Brevo benötigt den zugeordneten verifizierten Absender.

Passwörter und geheime API-Keys ausschließlich über die geschützte Anmeldung oder die Secret-/Environment-Verwaltung des jeweiligen Dienstes hinterlegen.

## Einstellungen

.env.example enthält ausschließlich leere Platzhalter. Eine ausgefüllte .env bleibt lokal und ist durch die vorhandene .gitignore ausgeschlossen.

| Einstellung | Sichtbarkeit / Ort |
| --- | --- |
| BUYME_ENVIRONMENT | staging oder production; eindeutige Zielumgebung |
| BUYME_APP_ORIGIN | bestätigte HTTPS-Adresse der neuen App |
| SUPABASE_URL | öffentliche Standard-Projektadresse |
| SUPABASE_PUBLISHABLE_KEY | öffentlicher Publishable Key; kein Secret-/service_role-Key |
| COOKIEBOT_DOMAIN_GROUP_ID | öffentliche Cookiebot-Domain-Group-ID |
| BREVO_API_KEY | ausschließlich serverseitig, in Netlify mit Functions-Scope |
| BREVO_SENDER_EMAIL / BREVO_SENDER_NAME | in Brevo verifizierter Absender |

Formatprüfung lokal, nachdem die eigenen Werte sicher eingetragen wurden:

```bash
node --env-file=.env scripts/check-services.mjs
node --test tests/service-config.test.mjs
npm run verify
npm run build
```

Die Formatprüfung führt keine Netzwerkanfragen aus und bestätigt keine tatsächliche Kontoverbindung, Datenbankberechtigung oder erfolgreiche Zustellung. Sie gibt keine eingegebenen Schlüssel aus. Das Netlify-Buildkommando liest keine serverseitigen Brevo-Schlüssel ein. Laufzeitgeheimnisse werden über Netlify UI/CLI/API mit dem richtigen Scope hinterlegt, nicht in netlify.toml.

## Backend-Umstellung für den echten Betrieb

1. Die Bestandsdaten und das vorhandene Supabase-Schema prüfen. Konten, Anbieterprofile, Angebote, Deal-Snapshots, Nachrichten, Nachweise, Bewertungen, Zahlungsstatus und Audit-Ereignisse normalisiert abbilden; den gesamten Demo-JSON-Stand nicht als frei beschreibbaren gemeinsamen Datensatz übernehmen.
2. Lokale Testanmeldung durch Supabase Auth mit bestätigter E-Mail ersetzen. Mitglieder- und Anbieterrollen serverseitig zuordnen; Administrationsrechte nur durch einen privilegierten Betreiberprozess vergeben. Ein vom Browser gesendetes role=admin darf keine Berechtigung erzeugen.
3. Row Level Security für alle betroffenen Tabellen und private Storage-Buckets einrichten. Mindestens Mitglied, eigener Anbieter, fremder Anbieter, fremdes Mitglied und Administration getrennt testen. Öffentliche Angebotsbilder und vertrauliche Dealunterlagen benötigen unterschiedliche Leserechte.
4. Budgetreservierung, Dealannahme, Statuswechsel, Cashbackansprüche und Duplikatschutz in Datenbanktransaktionen bzw. geprüfte Serverfunktionen verlagern. Listen seitenweise laden und relevante Such-/Zeit-/Zuordnungsfelder indizieren.
5. Datei-Uploads in Supabase Storage übernehmen: serverseitige Typ-/Größenprüfung, private Zuordnung, kurzlebige Downloadfreigaben, Schadsoftwareprüfung und nachvollziehbare Aufbewahrung. Bestehende lokale Testdateien nicht ohne gezielte Auswahl automatisch hochladen.
6. Cookiebot anhand der Domain konfigurieren und den Scan abschließen. Notwendige Sitzungsfunktionen von optionalen Analyse-/Marketingdiensten unterscheiden; Widerruf und erneute Auswahl prüfen. Ein eingebauter Banner allein belegt keine rechtskonforme Konfiguration.
7. Brevo für notwendige Systemnachrichten und gegebenenfalls Supabase-Auth-E-Mails einrichten. Transaktionsmails von Newsletter-Einwilligungen trennen. Für Nachrichten eine serverseitige Outbox mit eindeutigen Ereignissen, Wiederholungen und Zustellstatus verwenden. Keine offenen API-Endpunkte zum Versand beliebiger Empfänger/Nachrichten anlegen.
8. Die spätere Zahlungsdienstanbindung als eigene Serverintegration umsetzen. Datenbank-/Walletstatus allein löst keine echte Auszahlung aus.
9. Erst mit einer durchgängigen Prüfung auf getrennten Geräten einschließlich Rollen-/Dateizugriff, Wiederholungen, Fehlerfällen und Wiederherstellung kann die neue Umgebung als Mehrbenutzertest freigegeben werden.

## Abnahme vor der Umschaltung

- Ein Angebot eines Anbieters erscheint nach Freigabe bei einem anderen Mitglied auf einem anderen Gerät.
- Ein Deal reserviert sein Budget atomar; wiederholte Annahmen und parallele Aufrufe erzeugen keine doppelte Prämie.
- Dealunterlagen sind beim zugehörigen Anbieter/Admin verfügbar und bei fremden Konten gesperrt.
- Abmeldung, Passwortzurücksetzung und abgelaufene Sitzung werden serverseitig berücksichtigt.
- Eine gezielt autorisierte Testmail erreicht den festgelegten Empfänger; Wiederholung erzeugt keinen unkontrollierten Doppelversand.
- Optionale Dienste starten erst mit passender Cookiebot-Einwilligung; ein Widerruf wird beachtet.
- Bestehende Projekte und der bisherige Testbetrieb bleiben bis zur gezielten Umschaltung getrennt.

## Offizielle Grundlagen

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/security/production-checklist
- https://supabase.com/docs/guides/storage/security/access-control
- https://docs.netlify.com/build/functions/environment-variables/
- https://www.cookiebot.com/de/developer/
- https://developers.brevo.com/docs/send-a-transactional-email
