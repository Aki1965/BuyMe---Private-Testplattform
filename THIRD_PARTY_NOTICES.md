# Drittanbieter und Lizenzhinweise

Die Anwendung verwendet keinen extern nachzuladenden JavaScript- oder CSS-Frameworkcode. Die Logos und die BuyMe-Gestaltung sind Projektassets; ihre Veröffentlichung in diesem Repository ist keine gesonderte Marken- oder Assetlizenz.

Für den portablen Passwort-Hash-Testpfad ist ein bereits gebündelter Teil von **hash.js** mit seinen Hilfsmodulen enthalten:

- `js/vendor/hash-sha256.js`
- `js/vendor/NOTICE.txt`

Die mitgelieferten ursprünglichen MIT-Lizenz- und Urheberhinweise sind unverändert erhalten. Der Baustein ist ausschließlich für den lokalen Prototyp enthalten; seine Verwendung ersetzt keine serverseitige Authentifizierung für reale Kundendaten.

Für das übrige BuyMe-Projekt wird mit dieser Datei keine zusätzliche Open-Source-Lizenz eingeräumt. Für eine weitergehende Nutzung sind die Rechte der jeweils Berechtigten zu beachten.
# Supabase-Kontobereich

Die Abhängigkeit `@supabase/supabase-js` und ihre Komponenten werden mit `package-lock.json` festgelegt und für `account.html` gebündelt. Der Build kopiert die LICENSE- und CopyrightNotice-Dateien aller Produktionsabhängigkeiten nach `dist/assets/licenses/`; `index.txt` ordnet die Dateien den jeweiligen Paketen und Versionen zu. Supabase JS ist unter MIT lizenziert; die einzelnen mitgelieferten Abhängigkeitslizenzen gelten zusätzlich. esbuild und die Supabase CLI sind Entwicklungswerkzeuge; ihre Versionen sind ebenfalls fest gepinnt.
