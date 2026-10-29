# Übergabe an Shopboostr

## Übernommener Stand

Die Quelldateien entsprechen dem vollständigen BuyMe-Prototyp einschließlich Kaufangeboten, gegenseitigen Bewertungen, Adminstreitfällen und den Rechtstext-Ergänzungen vom 28.10.2026. Für dieses Repository wurden HTML, CSS und JavaScript in eine reguläre Projektstruktur übernommen und eigenständige Node-Start-/Prüfbefehle ergänzt.

Alle bisherigen Module, Logos, Übersetzungskataloge und Geschäftsregeltests sind enthalten. Eine bestehende Hostingidentität, Zugriffsliste, Plattformfreigabe oder ein persönlicher lokaler Teststand wurde nicht exportiert.

## Lokal prüfen

```bash
npm run dev
npm run verify
npm run build
npm run preview
```

Die ersten beiden Serverbefehle `dev` und `preview` laufen bis zum Beenden mit `Strg+C`; sie werden für die jeweilige Prüfung einzeln gestartet. Für die Cloud-Vorschau kann `--host 0.0.0.0` ergänzt werden.

## Integration in die bestehende Anwendung

| Baustein | Übernahme und nötige Anpassung |
|---|---|
| Oberfläche und CSS | Branding, Kategoriennavigation, responsive Raster und Ansichten können direkt als Gestaltungsvorlage dienen. In Komponenten des tatsächlichen Frontends aufteilen. |
| Geschäftsregeln | Statusübergänge, Budgetprüfungen, Preis-/Angebotssnapshots und Idempotenz serverseitig nachbilden. Die vorhandenen Tests als fachliche Abnahmereferenz verwenden. |
| Konten | Browserlokale Testanmeldung durch echte serverseitige Authentifizierung, sichere Sitzungen und Wiederherstellung ersetzen. Die öffentlichen Demozugänge nicht übernehmen. |
| Datenhaltung | Gemeinsame Datenbank mit kontenbezogenen Rechten, Transaktionen, Änderungsprotokollen und Sicherung/Löschung aufbauen. Der Client darf Rolle oder Konto-ID nicht selbst legitimieren. |
| Nachrichten und Nachweise | Echte Zustellung, berechtigte Abrufe, zulässige Dateiformate, Uploadprüfung und Fristen ergänzen. Die bisherigen Referenzen sind keine echten Dateien. |
| Warenkorb und Bestellung | Verkäuferidentitäten und Vertragsschlussmechanismus vervollständigen. Preise, Bestand und Prämienbudget vor dem Abschluss serverseitig prüfen; Mehrfachverarbeitung verhindern. |
| Geldprämien und Gebühren | Volle Mitgliedsprämie und zusätzliche Anbietergebühr getrennt führen. Das endgültige Gebührenblatt muss außerhalb der illustrativen Beispielgebühr festgelegt werden. |
| Zahlung und Karte | Tatsächlich beauftragten lizenzierten PSP/Emittenten anbinden; Zahlungsrollen, Verfügungs-/Auszahlungsmandate, Webhooks und Rückzahlungen prüfen. Kaufzahlung und Cashbackzahlung getrennt abstimmen. |
| Bewertungen und Streitfälle | Berechtigung und Abschlussstatus serverseitig prüfen. Interne Notizen sperren, Moderation begründen und öffentliche Mitgliederdaten begrenzen. |
| Rechte und Rechtstexte | Tatsächliche Betreiber-/Dienstleisterdaten ergänzen. Finale AGB wirksam einbeziehen und fassungsgebunden bestätigen; echte Widerrufs-/Kündigungserklärungen und unverzügliche Bestätigung zustellen. |

## Vor einer Produktivfreigabe

- Kein Echtgeldbetrieb allein durch Kopieren der Frontenddateien aktivieren.
- Zahlungsaufsichtsrecht und Adminmandate im konkreten Modell prüfen.
- Versicherungs-Cashback und regulierte Vermittlung gesondert fachlich prüfen; Reisen benötigen einen eigenen passenden Buchungsablauf.
- Händler-, Produkt-, Preis-, Gewährleistungs- und Sicherheitsinformationen vollständig vorhalten.
- Datenschutzrollen, Empfänger, Einwilligungen, Datenstandorte, Zugriffsrechte und Löschfristen anhand der tatsächlichen Verträge und Infrastruktur festlegen.
- Öffentliche Inhaltemeldungen, Beschwerdeverfahren, Barrierefreiheit und gegebenenfalls Anbietermeldepflichten prüfen und umsetzen.

Die konkrete Liste mit Gesetzesverweisen steht in der Anwendung unter **Admin → Recht & Freigabe** und in `js/legal-content.js`. Sie ist eine Arbeitsgrundlage und keine juristische Freigabe.

## Fachliche Abnahmebeispiele

1. Eine Prämie wird nie um die separate Plattformgebühr gekürzt.
2. Ein unzureichendes Budget oder ein geändertes Kaufangebot verhindert den Abschluss atomar.
3. Eine Checkout-Kennung kann nur einmal eine erfolgreiche Bestellung erzeugen.
4. Ein Beteiligter kann keine fremden Konten, Deals, Bestellungen oder internen Notizen abrufen.
5. Nachträgliche Angebotsänderungen überschreiben keine angenommenen Konditionen.
6. Eine offene Nachforderung blockiert die Anbieterfreigabe.
7. Eine Ablehnung gibt nur die tatsächlich reservierten Mittel frei.
8. Bewertungen sind je abgeschlossenem Deal und Partei auf eine Abgabe begrenzt.
9. Ein Bewertungsstreit ändert nicht stillschweigend Zahlungen oder Originalbewertungen.
10. Ein echter Widerruf wird nicht erst nach freiwilliger Adminfreigabe wirksam zugestellt.
