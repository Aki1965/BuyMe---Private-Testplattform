# BuyMe auf dem Smartphone installieren

Die gehostete private Testplattform bleibt unter ihrer bisherigen HTTPS-Adresse erreichbar. Eine Anmeldung mit dem freigegebenen ChatGPT-Konto kann erforderlich sein.

## iPhone und iPad

1. BuyMe in **Safari** öffnen und gegebenenfalls anmelden.
2. **Teilen** öffnen; je nach Safari-Ansicht zuerst **Mehr** antippen.
3. **Zum Home-Bildschirm** bzw. **Zu Home-Bildschirm hinzufügen** wählen.
4. Falls angeboten, **Als Web-App öffnen** aktivieren und **Hinzufügen** tippen.
5. BuyMe über das neue Symbol öffnen. Eine erneute Anmeldung kann nötig sein.

Fehlt die Option, unten in der Teilen-Liste **Aktionen bearbeiten** öffnen und den Home-Bildschirm-Eintrag ergänzen. Ein In-App-Browser in einer Mail- oder Messenger-App sollte zuerst durch Safari ersetzt werden.

## Android

1. BuyMe in **Chrome** öffnen und gegebenenfalls anmelden.
2. In BuyMe **App installieren** und, wenn angeboten, **Jetzt installieren** antippen.
3. Alternativ im Chrome-Menü **⋮ → Zum Startbildschirm hinzufügen → Installieren** wählen. Bezeichnungen können je nach Browser variieren.

Die Installationshilfe in BuyMe unterstützt alle sechs Oberflächensprachen. Ein nativer Installationsdialog wird nur angeboten, wenn der Browser `beforeinstallprompt` bereitstellt; auf iOS erfolgt die Installation über Safari.

## Technische Umsetzung und Grenzen

- Gemeinsames Manifest auf Marktplatz und Adminseite; stabiler App-Identifier, `standalone`, relativer Scope/Startpfad auch für Unterverzeichnisse.
- PNG-Symbole in 192/512 Pixeln, ein separates maskierbares 512-Pixel-Symbol und ein Apple-Touch-Symbol mit 180 Pixeln. Sie verwenden das vorhandene BuyMe-Bildzeichen. Für das maskierbare Symbol liegt das Bildzeichen innerhalb des sicheren Bereichs.
- Manifest wird mit `crossorigin="use-credentials"` eingebunden, damit ein geschützter Host die normale Anmeldung verwenden kann.
- Service Worker unter `sw.js`, ohne Seiten-/Daten-Cache. Dokumente gehen stets an das Hosting, Fehler und Anmelde-Weiterleitungen bleiben unverändert. Auth-Routen, Query-Callbacks, externe Ziele und Schreibanfragen werden nicht abgefangen.
- Nur bei echtem Netzwerkfehler einer normalen App-Navigation erscheint ein allgemeiner Offline-Hinweis. **Für den Testbetrieb ist Internet nötig.** Es gibt keinen Offline-Checkout, Hintergrundversand oder Pushdienst.
- Keine automatische Seitenaktualisierung bei Service-Worker-Updates und kein Löschen von Testdaten. Aktualisierungen erscheinen beim nächsten normalen Öffnen/Neuladen.
- Browser und installierte App können je nach Betriebssystem getrennte lokale Daten und Sitzungen haben. Es gibt keine geräteübergreifende Synchronisierung. Nur fiktive Testdaten verwenden.
- Installation und Entfernen des Symbols ändern den Hosting-Zugang nicht. Zum vollständigen Löschen lokaler Daten auch die Website-/App-Daten im Browser bzw. Gerät löschen.
- Für eigenes Hosting alle Build-Dateien einschließlich `manifest.webmanifest`, `sw.js` und `assets/icons/` über HTTPS ausliefern. Manifest-MIME: `application/manifest+json`; Worker-MIME: JavaScript, ohne langfristiges Caching. Der Worker-Scope ergibt sich aus seinem Verzeichnis; besondere `Service-Worker-Allowed`-Header sind dafür nicht nötig.

Die automatischen Tests prüfen Manifest/Icon-Abmessungen, unveränderte Zugangsantworten, Netzwerkfehler sowie das Auslassen von Authentifizierung und Schreibanfragen. Die tatsächliche Installation muss zusätzlich auf dem jeweiligen Smartphone bestätigt werden.
