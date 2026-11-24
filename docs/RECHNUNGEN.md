# Rechnungen bei BuyMe

## Testplattform

- **Anbieter → Budget & Abrechnung**: Bei einem abgeschlossenen, gedeckten Deal mit positiver Gebühr „Servicegebühr im Test bezahlen“ wählen. Die Buchung speichert eine gesonderte Musterrechnung mit Dealbezug. Sie belastet das Demo-Budget nicht erneut.
- **Mitglied → Bestellungen**: Nach der erfolgreichen Testzahlung gibt es je Verkäufer eine Musterrechnung. Eine fehlgeschlagene Zahlung erzeugt keinen Beleg. Für im Test erstattete Positionen erscheint ein eigener negativer Korrekturbeleg mit Bezug zur ursprünglichen Rechnung.
- PDF-Download und Druckansicht verwenden dieselben Belegdaten. In der Druckansicht öffnet „Drucken“ den Druckdialog des Browsers. Alle Demo-Belege tragen den sichtbaren Hinweis „Muster – keine Steuerrechnung“. Sie weisen keine Umsatzsteuer aus. Die Daten bleiben im Browser. Für den Test ausschließlich fiktive Daten verwenden.

## Rollen in der Buchhaltung

| Vorgang | Rechnungsaussteller | Empfänger | Bezug |
| --- | --- | --- | --- |
| BuyMe-Servicegebühr | Tatsächlicher BuyMe-Betreiber laut Vertrag | Anbieter | Deal, Abrechnungsperiode oder Gebührenvorgang |
| Waren- oder Dienstleistungskauf im Vermittlungsmodell | Jeweiliger Verkäufer | Käufer | Bestellung, Verkäuferpositionen, Liefer- oder Leistungsdaten |
| Cashback oder reine Zahlungsbestätigung | Nachweis aus dem Zahlungs- oder Buchhaltungssystem | Berechtigte Partei | Zahlungsreferenz, Deal und ggf. Rechnung als getrennte Referenz |

Falls BuyMe Verkäuferrechnungen selbst erstellt, vorab die Beauftragung und den Prozess für die Ausstellung im Namen und für Rechnung des jeweiligen Verkäufers festlegen. Verkäufer und BuyMe führen eigene Rechnungsnummernkreise. Bei mehreren Verkäufern werden die abzurechnenden Positionen den jeweiligen Ausstellern zugeordnet. Eine Zahlungsbestätigung, Reservierung oder Cashback-Auszahlung wird nicht als Kauf- oder Servicegebührenrechnung importiert.

## Rechnung ausstellen und bereitstellen

1. Den richtigen Vorgang anhand von Vertrag, Leistungszeitpunkt, Bestellung und bestätigten Ereignissen aus der Zahlungs- und Auftragsverarbeitung ermitteln. Der Zeitpunkt der Rechnung folgt dem Geschäftsvorfall. Eine bereits ausgestellte Rechnung wird bei Zahlung abgeglichen. Anzahlungen, Teilzahlungen und Erstattungen nach den mit der Steuerberatung festgelegten Regeln behandeln. Keine Rechnungsstellung aus einem Browserstatus oder einem ungeprüften Webhook.
2. BuyMe und Verkäufer stellen im verantwortlichen Buchhaltungssystem aus. Dort werden die Pflichtangaben gepflegt, etwa Name und Anschrift beider Parteien, USt-IdNr. oder Steuernummer des Ausstellers, Rechnungsnummer, Ausstellungsdatum, Leistungsbeschreibung, Leistungsdatum, Beträge und Steuerangaben. Format und steuerliche Behandlung pro Aussteller und Vorgang prüfen, einschließlich grenzüberschreitender Fälle.
3. Für deutsche B2B-Rechnungen im Anwendungsbereich strukturiertes Format einrichten, etwa geeignete ZUGFeRD-Profile oder XRechnung. Bloße PDFs sind sonstige Rechnungen. Bei einer zulässigen PDF-Rechnung die erforderliche Zustimmung des Empfängers dokumentieren. Bei XRechnung zusätzlich eine PDF-Ansicht aus genau diesem XML erzeugen. Bei ZUGFeRD das vollständige Original-PDF mit eingebettetem XML übernehmen.
4. Original und Korrekturen in der Buchhaltung archivieren. Originale bleiben nachvollziehbar. Korrekturen erhalten ihre eigene Dokumentidentität und referenzieren das Ursprungsdokument. Aufbewahrung (für Rechnungen im Regelfall acht Jahre ab Ende des Ausstellungsjahres), steuerliche Sonderfälle, Datenzugriff, Löschfristen nach Fristende und Wiederherstellung in der Verfahrensdokumentation beschreiben.
5. Shopboostr und die Steuerberatung legen die Buchhaltungssoftware, Kontierung und den Austausch fest. Im Buchhaltungssystem Bestellung/Deal → Rechnung → Zahlung/Erstattung abgleichen. Für die Steuerkanzlei Belegdatei, Rechnungsnummer, Buchungsstapel und Zahlungsreferenz gemeinsam exportieren. DATEV nur anbinden, wenn die tatsächlich eingesetzte Buchhaltung und die Steuerkanzlei den Austausch unterstützen.

## Technische Bereitstellung

Die getrennte Kontoseite erhält „Meine Rechnungen“, sobald der geschützte Dokumentabruf aktiviert ist. Die Datenbank weist jede Rechnung einer geprüften Supabase-Benutzer-ID zu. Ein angegebenes Firmenprofil oder eine vom Browser behauptete Rolle schaltet keine Dokumente frei. Der private Storage-Bucket prüft die gleiche Zuweisung auch beim Download. Ein Buchhaltungskonto für mehrere Benutzer benötigt in der Produktionsplattform eine gesondert geprüfte Organisationszuordnung.

1. Die Migration `20261124163000_invoice_delivery.sql` im getrennten Staging-Projekt prüfen. Das bestehende Kontoprofil bleibt eigenständig. Erst nach Prüfung `BUYME_INVOICE_DOCUMENTS_ENABLED=true` im passenden Build setzen. Die aktuelle Kontoseite ist auf das BuyMe-Testprojekt begrenzt. Für Produktion den Abruf in die echte Shopboostr-Anmeldung übernehmen und mit dem richtigen Projekt verbinden. Keine Produktionsrechnungen in das Testprojekt übernehmen.
2. Aus der Buchhaltung exportierte Dateien über einen vertrauenswürdigen Hintergrundprozess bereitstellen. `scripts/publish-invoice.mjs` ist der Import für bereits ausgestellte Belege. Es lädt Dateien in einen privaten Bucket und macht sie erst nach vollständigem Upload durch den Datenbankeintrag sichtbar. Bei Wiederholung dieselbe Dokument-ID und exakt dieselben Originaldateien verwenden.

   ```bash
   node scripts/publish-invoice.mjs metadaten.json Rechnung.pdf
   node scripts/publish-invoice.mjs metadaten.json Druckansicht.pdf Original.xml
   ```

   Die Importumgebung erwartet `BUYME_INVOICE_IMPORT_SUPABASE_URL` und `BUYME_INVOICE_IMPORT_SECRET_KEY`. Diese Werte bleiben im geschützten Hintergrundprozess. Die Metadaten enthalten `id` (persistente Dokument-UUID aus dem Export), `recipient_id` (durch das Backend bestätigte Supabase-UUID), `issuer_key` (stabiler Ausstellerschlüssel), `issuer_name`, `number`, `reference`, `issued_on` (YYYY-MM-DD), `kind` (`fee` oder `purchase`), `format` (`pdf`, `zugferd` oder `xrechnung`) und optional `corrects_id`. Vor dem Import Inhalt, Format, Schadsoftware und Zuordnung zum Empfängerkonto im Quellsystem prüfen. Der Import prüft Dateityp und Zuordnung zum bestätigten Konto. Er validiert keine Steuerdaten, XML-Schemata oder Verkäuferbevollmächtigungen. Fehlgeschlagene, unvollständige Importe mit derselben ID erneut versuchen oder als verwaiste Dateien durch befugte Betreiber bereinigen.
3. Freigabe mit zwei getrennten Benutzerkonten prüfen. Fremde Metadaten, fremde Objektpfade, anonymer Abruf und Schreibversuche müssen unzulässig sein. PDF und XML müssen zum exportierten Original passen. Testfälle für Mehranbieterbestellung, getrennte Gebühr, Wiederholung, Teilrückerstattung, Korrektur und Wiederherstellung im Archiv dokumentieren.
4. Rechnungszustellung mit der Steuerberatung abstimmen und im Hintergrundprozess protokollieren. Falls ein Hinweis per E-Mail verwendet wird, einen Link zum geschützten Bereich senden und keine öffentlich zugänglichen Dateilinks verwenden. Der Beispielimport versendet keine E-Mails.

Die Supabase-Kopie dient der Bereitstellung. Das Buchhaltungssystem und dessen Archiv bleiben führend. Datenbankregeln allein ersetzen weder Verfahrensdokumentation noch Buchhaltungs-, Steuer- und Prozessprüfung.

## Rechtsgrundlagen

- [§ 14 UStG](https://www.gesetze-im-internet.de/ustg_1980/__14.html)
- [§ 14b UStG](https://www.gesetze-im-internet.de/ustg_1980/__14b.html)
- [§ 146 AO](https://www.gesetze-im-internet.de/ao_1977/__146.html)
- [BMF-FAQ zur E-Rechnung](https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html)
- [BMF-Schreiben zur GoBD-Änderung vom 14. Juli 2025](https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Weitere_Steuerthemen/Abgabenordnung/2025-07-14-GoBD-2-aenderung.html)
