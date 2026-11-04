# Bilder und Unterlagen im privaten Test

## Anbieter

Unter **Angebot erstellen / bearbeiten → Bilder und Dateien hochladen** mehrere Bilder oder Unterlagen auswählen. Vor dem Speichern lassen sich ausgewählte Dateien entfernen. Beim Bearbeiten können vorhandene Dateien aus dem Angebot entfernt werden. **Zur Freigabe einreichen** speichert das Angebot einschließlich Dateizuordnungen und legt es der Administration vor.

Das erste Angebotsbild erscheint auch in der Angebotskachel. Alle Bilder und Dateien sind in der Angebotsdetailseite und in der Admin-Angebotsprüfung verfügbar. Bei einer Bearbeitung wird das Angebot wie bisher erneut geprüft. Ein bereits angenommener Deal behält seine ursprünglichen Angebotsbedingungen und Dateizuordnungen.

## Mitglied

Bei Vertragsangeboten unter **Deal starten → Prämienbedingungen → Unterlagen und Dateien hochladen** optional passende Nachweise wählen und die Annahme bestätigen. Mit Dateien wird der Nachweis unmittelbar zur Prüfung hinterlegt. Ohne Dateien kann der Deal zunächst angelegt und später ergänzt werden.

In **Meine Deals → Deal öffnen → Unterlagen zum Deal** können weitere Dateien ergänzt werden. Im Dialog **Nachweis hinterlegen / ergänzen** genügt eine Datei oder eine Bestell-/Vertragsreferenz. Bei einer offenen Nachforderung reicht das Mitglied hier die Ergänzung ein.

Auch die Testbestellung im Warenkorb hat ein Uploadfeld. Dateien werden nur nach erfolgreicher Testzahlung zugeordnet. Bei mehreren Anbietern werden dieselben ausgewählten Dateien allen beteiligten Anbietern zugeordnet; der Hinweis steht direkt am Feld. Anbieterbezogene Unterlagen lassen sich stattdessen nach dem Kauf ausschließlich im betreffenden Deal ergänzen.

## Drei Rollen

- Öffentliche Angebotsdateien: am freigegebenen Angebot, beim zugehörigen Anbieter und in der Administration.
- Private Dealunterlagen: nur in der Oberfläche des beteiligten Mitglieds, des zugehörigen Anbieters und registrierter Administratoren.
- Alle drei beteiligten Rollen können im laufenden Deal eigene Unterlagen ergänzen und vorhandene Anhänge herunterladen. Nach Abschluss/Stornierung darf nur die Administration weitere Dateien ergänzen. Vorherige Unterlagen und der Verlauf bleiben erhalten.
- Mitgliederdateien werden niemals am öffentlichen Angebot angezeigt. Ein Deal zeigt zusätzlich die bei Annahme übernommenen Angebotsdateien.

## Umfang dieser Testfassung

Dateien liegen als tatsächliche Blobs in **IndexedDB `buyme-attachments-v1`**, Zuordnungen im bestehenden lokalen Plattformstand. Neuladen und Rollenwechsel im gleichen Browser behalten die Dateien. Andere Geräte, Browser, die installierte PWA oder eine andere Hostingadresse können getrennte Teststände besitzen. Es gibt weiterhin keinen gemeinsamen Uploadserver oder geräteübergreifenden Austausch. Ein JSON-Testdatenexport enthält nur die Metadaten; Dateiinhalte müssen separat heruntergeladen werden.

Erlaubt sind **JPG, PNG, WEBP, GIF, PDF, TXT, CSV, DOCX, XLSX und PPTX**: höchstens **5 MB je Datei**, **10 Dateien und insgesamt 25 MB pro Uploadsammlung eines Angebots oder Deals**. Dateiendung, MIME-Typ und grundlegende Dateisignatur werden geprüft. Bilder erhalten eine Vorschau; andere Dokumente werden heruntergeladen, nicht als aktive Inhalte eingebettet. Ein leerer oder fehlerhafter Dateispeicher erzeugt keine Deal-/Budgetänderung und keine scheinbar gespeicherten Anhänge.

Neue Blobs werden vor dem Speichern des lokalen Plattformstands geschrieben. Scheitert dessen Speicherung oder wechselt das Konto während des Vorgangs, werden die neu geschriebenen Blobs zurückgerollt. Angebotsdateien werden bei der Annahme unveränderlich referenziert. Das spätere Entfernen aus dem Angebot vernichtet keine historischen Dealunterlagen. Vollständige Entfernung aller lokalen Dateien erfolgt über die Website-Daten des Browsers; das Zurücksetzen der Beispieldaten allein ist keine vollständige Dateilöschung.

Die Rollen sind wie bisher lokal simuliert. Ausschließlich fiktive Unterlagen verwenden. Für den späteren echten Betrieb werden gemeinsame Datenbank- und Objektspeicherung, serverseitige Authentifizierung und Berechtigungsprüfung je Datei, Malwareprüfung, Lösch-/Aufbewahrungskonzept und geeignete Übertragungs-/Zugriffsprotokolle benötigt. Dafür dürfen lokale Rollenangaben und Dateikennungen nicht als serverseitiger Zugangsbeleg verwendet werden.
