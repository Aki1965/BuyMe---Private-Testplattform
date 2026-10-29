# BuyMe – Private Testplattform

Vollständige responsive Web-App in **HTML, CSS und JavaScript**, übernommen aus dem aktuellen BuyMe-Projektstand mit den Rechtstext-Ergänzungen vom 28.10.2026. Marktplatz, Mitgliedsbereich, Anbieterbereich und Admin Cockpit verwenden denselben lokalen Testdatenbestand.

## Sofort starten

Voraussetzung: **Node.js ab Version 20**. Es gibt keine zu installierenden npm-Abhängigkeiten.

```bash
git clone https://github.com/Aki1965/BuyMe---Private-Testplattform.git
cd BuyMe---Private-Testplattform
npm run dev
```

Danach **http://127.0.0.1:4173/** öffnen. Der Adminbereich liegt unter **http://127.0.0.1:4173/admin.html** und leitet ohne passende Anmeldung zum Login weiter. Beenden mit `Strg+C`.

Für eine Cloud-Entwicklungsumgebung oder einen Container:

```bash
npm run dev -- --host 0.0.0.0 --port 4173
```

Nur wenn du den Server im Netzwerk erreichen möchtest, den Host entsprechend freigeben. Standardmäßig lauscht er ausschließlich lokal. Ein bereits belegter Port kann mit `--port 4174` ersetzt werden. `HOST` und `PORT` lassen sich alternativ als Umgebungsvariablen setzen.

**Die App über HTTP/HTTPS starten.** Die separaten JavaScript-Module sind für einen Webserver ausgelegt; ein Doppelklick auf `index.html` ist nicht der vorgesehene Startweg.

## Auf dem Smartphone installieren

BuyMe unterstützt die Installation als PWA mit eigenem App-Symbol. In Safari **Teilen → Zum Home-Bildschirm → Hinzufügen**, in Chrome **App installieren** bzw. **⋮ → Zum Startbildschirm hinzufügen → Installieren** wählen. Die App benötigt weiterhin Internet. [Anleitung und technische Hinweise](docs/PWA.md).

## Testzugänge

Alle vorbereiteten Konten verwenden anfangs **`BuyMeTest!2026`**. Eine lokale Passwortänderung ersetzt das Passwort nur im betreffenden Browser.

| Rolle | E-Mail | Beispiel |
|---|---|---|
| Mitglied | `lena.berger@example.test` | Lena Berger |
| Anbieter | `partner@example.test` | Nordlicht Mobil / Tablet |
| Anbieter Reisen | `reisen@example.test` | Reisezeit Plus |
| Anbieter Mobilität | `mobilitaet@example.test` | AutoQuartier |
| Anbieter Mode | `mode@example.test` | Stadtmode |
| Anbieter Gastronomie | `gastro@example.test` | Tischzeit |
| Administration | `admin@buyme.test` | Admin Cockpit |

Weitere Informationen stehen direkt in der App unter **Testzugänge**. Neue fiktive Mitglieder und Anbieter können über die Registrierung angelegt werden. Zum Rollenwechsel abmelden und mit dem anderen Konto anmelden.

## Enthaltene Funktionen

- Responsive Darstellung für Desktop, Tablet und Smartphone; BuyMe-Logo und Blau-/Violett-Gestaltung.
- Marktplatz mit 19 Hauptkategorien, den übernommenen 108 Unterkategorien in zehn Gruppen, Suche, regionalen Filtern und Sortierung.
- Deutsch, Englisch, Französisch, Schwedisch, Italienisch und Türkisch. Die Rechtstexte bleiben ausdrücklich eine deutsche Arbeitsfassung.
- Anmeldung, Registrierung, Profilbearbeitung, Passwortänderung und Abmeldung als lokale Testabläufe.
- Anbieterprofile, Angebotserstellung, Bearbeitung, Pausieren, Budgetverwaltung und Adminmoderation.
- Dealannahme, unveränderliche Angebotskopie, Nachweisreferenzen, Annahmeprüfung, Rückfragen, begründete Ablehnung und Anbieterfreigabe.
- Getrennte Cashbackprüfung, administrative Freigabe, Walletstatus und simulierte Auszahlung einschließlich Fehler und erneutem Versuch.
- Kaufbeispiele für Tablet, E-Bike, Pauschalreise, Schuhe und Restaurantmenü; Varianten, Mengen, Warenkorb, Testzahlung und Bestellungen.
- Nachrichten und Support je Deal, Antworten und interne Adminnotizen.
- Gegenseitige Bewertungen nach Abschluss; öffentliche Anbieterwerte zusammengefasst und Einzelbewertungen für die Beteiligten/Admin.
- Adminübersichten für Konten, Angebote, Deals, Bestellungen, Zahlungen, Bewertungen und Streitfälle.
- AGB für Mitglieder und Anbieter, Impressums-/Datenschutzentwurf, Rankinginformationen, Barrierefreiheitshinweise, Widerrufs-/Kündigungstest und lokale Inhaltemeldung.
- **Admin → Recht & Freigabe** mit offenen Betreiberangaben und rechtlichen Umsetzungspunkten.

## Projektstruktur

```text
index.html                 Marktplatz sowie Mitglieder-/Anbieteroberfläche
admin.html                 Admin Cockpit
manifest.webmanifest       App-Name, Startpfad und Installationssymbole
sw.js                      Netzwerkzugriff und allgemeiner Offline-Hinweis
css/                       Layout, Markenfarben und responsive Komponenten
js/                        JavaScript-Module und Geschäftslogik
js/vendor/                 Enthaltener Hash-Baustein mit Lizenzhinweisen
assets/                    Original-Logo und helles SVG-Logo
translations/              Übersetzungskataloge mit sechs Sprachen
scripts/                   Entwicklungsserver, Prüfung und statischer Export
tests/                     Tests für Geschäftsregeln und Entwicklungsserver
docs/                      Architektur und Übergabe an Shopboostr
package.json               Start-, Build- und Testbefehle
```

Die Dateien unter `js/` und `css/` sind die direkt verwendeten Quelldateien. Es wird kein Framework und kein Bundler benötigt.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Lokalen Entwicklungsserver starten |
| `npm start` | Derselbe Startbefehl |
| `npm run check` | JavaScript-Syntax, Assetpfade, Modulimporte und Übersetzungskataloge prüfen |
| `npm test` | Sämtliche automatischen Tests ausführen |
| `npm run verify` | Quellprüfung und Tests nacheinander ausführen |
| `npm run build` | Vollständige statische App nach `dist/` kopieren |
| `npm run preview` | Den zuvor erzeugten Ordner `dist/` lokal bereitstellen |
| `npm run translations:build` | `js/i18n-data.js` aus den Katalogen neu erzeugen |
| `npm run translations:check` | Prüfen, ob Kataloge und erzeugte Datei übereinstimmen |

Für eine statische Bereitstellung **den Inhalt von `dist/`** verwenden. `index.html`, `admin.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/` und `assets/` müssen gemeinsam erhalten bleiben. Die Anwendung nutzt Hash-Routen; besondere SPA-Rewrite-Regeln sind dafür nicht nötig. Ein passender externer Zugangsschutz muss vom Hosting eingerichtet werden, wenn die Testplattform privat zugänglich sein soll.

## Einen Ablauf ausprobieren

1. Als Mitglied anmelden, ein Vertragsangebot öffnen und einen Deal anlegen. Eine fiktive Abschlussreferenz hinterlegen.
2. Abmelden und als zugehöriger Anbieter anmelden. Den Deal unter **Meine Deals** annehmen, prüfen und den Abschluss freigeben.
3. Als Admin den Abschluss prüfen und die Cashbackfreigabe simulieren.
4. Als Mitglied die Wallet öffnen und die Auszahlung anfordern. Im Admin kann Erfolg oder Fehler simuliert werden.
5. Nach Abschluss können Mitglied und Anbieter gegenseitig bewerten. Der Admin kann beide Perspektiven beim Streitfall einsehen.

Für Käufe ein Produkt in den Warenkorb legen und eine **erfolgreiche oder fehlgeschlagene Testzahlung** wählen. Kaufpreis und späteres Cashback bleiben getrennt. Es wird kein echtes Geld bewegt.

## Lokale Daten und Grenzen

Alle Geschäftsdaten bleiben im LocalStorage des jeweiligen Browsers. Die Sitzung wird in SessionStorage oder bei ausdrücklich gewähltem „Angemeldet bleiben“ zeitlich begrenzt in LocalStorage geführt. Unterschiedliche Geräte, Browser, Ports oder Hostingadressen können unterschiedliche Teststände haben. Abmelden entfernt die Sitzung, aber nicht sämtliche Testdaten.

**Diese Version ist eine ausführbare Funktionsvorlage, noch kein Produktivbackend.** Es gibt keine gemeinsame Datenbank, serverseitige Berechtigungsprüfung, echten E-Mail-Versand, tatsächliche Händlerverifizierung, Zahlungsdienstanbindung oder Kartenemission. Rollenprüfungen in JavaScript schützen keine vertraulichen Daten vor dem Besitzer des Browsers. Ausschließlich fiktive Angaben und eigene Testpasswörter verwenden.

„Private Testplattform“ ist der Projektname und richtet allein keinen privaten Zugriff ein. Dieses GitHub-Repository ist öffentlich; der lokal gestartete Entwicklungsserver besitzt keine zusätzliche Hosting-Anmeldeschranke. Der Quellstand enthält öffentliche Demozugänge und fiktive Beispieldaten. Private Freigaben und Konfigurationen der zuvor gehosteten Site wurden nicht in dieses Repository übernommen.

Rechtstexte sind als **Entwürfe** markiert. Betreiberangaben und tatsächliche Dienstleisterverträge müssen vervollständigt werden. Die Formulare für Widerruf, Kündigung und Meldungen speichern nur eine lokale Simulation und stellen keine Erklärung an echte Empfänger zu. Die fachliche Prüfung für den Echtgeldbetrieb bleibt erforderlich.

## Weiterentwicklung

- [Architektur und Dateizuordnung](docs/ARCHITEKTUR.md)
- [Umsetzung und Übergabe an Shopboostr](docs/SHOPBOOSTR_UEBERGABE.md)
- [Drittanbieter und Lizenzhinweise](THIRD_PARTY_NOTICES.md)

Die Geschäftsregeln sind in separaten Modulen mit Node-Tests hinterlegt. Sie dienen als Referenz für die spätere serverseitige Umsetzung. Eine Veröffentlichung des Quellcodes aktiviert keine echten Zahlungs- oder Backenddienste.
