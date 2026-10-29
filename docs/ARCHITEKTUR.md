# Architektur der BuyMe-Testplattform

## Technischer Aufbau

Die Anwendung ist eine statische Web-App aus zwei HTML-Einstiegsseiten, CSS und nativen JavaScript-Modulen. Der Browser lädt die Module direkt; es gibt keine zur Laufzeit benötigten CDN-Dateien und keine Framework-Abhängigkeiten. Der Entwicklungsserver und die Prüfwerkzeuge verwenden ausschließlich Node.js-Standardmodule.

`index.html` startet `js/platform.js` für Marktplatz, Anmeldung, Mitglieder- und Anbieterbereich. `admin.html` startet `js/app.js`. Beide Oberflächen verwenden dieselbe browserlokale Datenhaltung über `js/store.js`. Die Darstellung verwendet Hash-Routen wie `#market`, `#deals`, `#wallet`, `#cart` oder `#privacy`.

## Module

| Datei | Verantwortung |
|---|---|
| `js/platform.js` | Routen, Rendering und Ereignisse des Marktplatzes und der Teilnehmerbereiche |
| `js/app.js` | Adminnavigation, Tabellen, Kontodetails, Deal-/Zahlungsbearbeitung |
| `js/model.js` | Seed-Erstellung, Dealstatus, Zahlungsfreigaben, Suche und Admin-Support |
| `js/platform-model.js` | Angebote, Budgets, Mitglieder/Anbieter, Dealannahme, Wallet und Nachrichten |
| `js/deal-workflow.js` | Anbieterannahme, Nachforderung, geprüfte Bestätigung und gegenseitige Bewertungen |
| `js/deal-workflow-ui.js` | Dealbearbeitung und Bewertungskarten |
| `js/auth.js` | Lokale Testkonten, Passwort-Hashes, Sitzungsdaten und Routenzulassung |
| `js/auth-ui.js` | Anmeldung, Registrierung, Profil-/Passwortinformationen und Testzugänge |
| `js/store.js` | Laden, additive Datenaktualisierung und browserlokales Speichern |
| `js/seed.js`, `js/commerce-seed.js` | Fiktive Profile, Angebote und Kaufbeispiele |
| `js/categories.js` | Kanonische Kategorien, Unterkategorien und Klassifikationsprüfung |
| `js/category-browser.js` | Responsive Haupt-/Unterkategorieauswahl |
| `js/commerce.js` | Varianten, Warenkörbe, Centbeträge, Checkout und Bestell-/Dealzuordnung |
| `js/commerce-ui.js`, `js/commerce-controller.js` | Kaufansichten, Formulare und Ereignisverarbeitung |
| `js/review-entry.js` | Bewertbare Deals und direkte Bewertungseingabe |
| `js/admin-reviews.js`, `js/admin-reviews-ui.js` | Beide Bewertungsperspektiven, Streitfälle und interne Prüfnotizen |
| `js/accounts.js` | Kontoprofile mit ihren jeweiligen Vorgängen verknüpfen |
| `js/i18n.js`, `js/i18n-data.js` | Sprachauswahl, gespeicherte Sprache und erzeugte Übersetzungsdaten |
| `js/legal-content.js` | Versionierte Rechtstext-Entwürfe, Quellen und offene Umsetzungspunkte |
| `js/legal-model.js` | Lokale Rechte-Testvorgänge, Testfassungsnachweise und begrenzter Datenexport |
| `js/legal-ui.js` | Rechtsseiten, Testformulare und Adminprüfbericht |
| `js/ui.js` | Gemeinsame HTML-, Symbol-, Escape- und Auswahlhelfer |

## Darstellung und Responsivität

- `css/platform.css` und `css/style.css` bilden Teilnehmer- bzw. Adminlayout.
- `css/brand.css` und `css/site-theme.css` enthalten das BuyMe-Markenbild.
- Zusätzliche CSS-Dateien kapseln Kategorien, Kaufansichten, Bewertungen, Anmeldung und Rechtstexte.
- CSS-Media-Queries ändern Raster, Navigation, Formularspalten und Abstände für schmale Bildschirme.
- Angebotsübersichten zeigen auf großen Bildschirmen vier Kacheln pro Reihe; die Spaltenzahl passt sich der Breite an.
- Sprache und gespeicherte Daten verwenden stabile fachliche Kennungen. Benutzertexte werden nicht automatisch übersetzt. Die deutschen Rechtsentwürfe behalten ihre eigene Sprachkennzeichnung.

## Datenabläufe

1. Ein freigegebenes Angebot wird im Marktplatz angezeigt.
2. Die Dealannahme speichert die damals geltenden Konditionen und reserviert das nötige Prämienbudget.
3. Bei Kaufangeboten wird stattdessen der Warenkorb geprüft. Eine erfolgreiche Testzahlung legt eine Bestellung und einen verknüpften Deal je Position an.
4. Der Anbieter prüft Annahme und Nachweise. Offene Nachforderungen blockieren seine Abschlussbestätigung.
5. Adminabschluss, Cashbackfreigabe, Auszahlungsanforderung und Zahlungsresultat sind getrennte Schritte.
6. Die Beteiligten können einen abgeschlossenen Deal jeweils einmal bewerten.
7. Support, Nachrichten und Streitfälle sind über feste Kennungen mit dem jeweiligen Deal verbunden.

Die lokale JSON-Speicherung ist kein Ersatz für Datenbanktransaktionen oder Zugriffsschutz. Die Tests prüfen fachliche Regeln; sie machen aus dem Browsermodell kein sicheres Mehrbenutzersystem.

## Entwicklungswerkzeuge

Der Server in `scripts/server.mjs` liefert nur die beiden HTML-Seiten und Dateien in `css/`, `js/` und `assets/`. Repositorymetadaten, `.env`, Tests und Werkzeuge werden nicht bereitgestellt. Der statische Build kopiert dieselben Browserdateien nach `dist/`.

`npm run verify` prüft Syntax, verknüpfte Dateien, Katalogkonsistenz, die bestehenden Geschäftsregeln und den Entwicklungsserver. Es werden keine echten Händler, Nachrichten- oder Zahlungsdienste angesprochen.
