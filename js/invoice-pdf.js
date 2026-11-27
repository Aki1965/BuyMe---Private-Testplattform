import pdfMake from 'pdfmake/build/pdfmake.js';
import fonts from 'pdfmake/build/vfs_fonts.js';
import {money, date} from './model.js';

pdfMake.addVirtualFileSystem(fonts);
const euros = cents => money(cents / 100);

export function demoInvoicePdf(invoice) {
  return pdfMake.createPdf({
    pageSize: 'A4',
    info: {title: 'Muster – ' + invoice.title},
    defaultStyle: {fontSize: 10, color: '#123563'},
    watermark: {text: 'MUSTER', opacity: 0.08},
    content: [
      {text: 'MUSTER – KEINE STEUERRECHNUNG', bold: true, fontSize: 12, color: '#9b2d2d'},
      {text: invoice.title, bold: true, fontSize: 22, margin: [0, 8, 0, 12]},
      {text: 'Belegnummer: ' + invoice.id},
      ...(invoice.date ? [{text: 'Testdatum: ' + date(invoice.date)}] : []),
      {text: 'Bezug: ' + invoice.reference},
      {columns: [{text: 'Aussteller im Test\n' + invoice.issuer}, {text: 'Empfänger im Test\n' + invoice.recipient}], margin: [0, 15, 0, 15]},
      {layout: 'lightHorizontalLines', table: {
        headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          ['Leistung', 'Menge', 'Einzelbetrag', 'Betrag'],
          ...invoice.lines.map(line => [
            [line.title, line.variant].filter(Boolean).join(' · '), String(line.quantity),
            {text: euros(line.unitCents), alignment: 'right'},
            {text: euros(line.totalCents), alignment: 'right'}
          ])
        ]
      }},
      {text: 'Summe: ' + euros(invoice.totalCents), alignment: 'right', bold: true, margin: [0, 12, 0, 12]},
      {text: 'Fiktiver Beleg für die BuyMe-Testplattform. Keine echte Zahlung. Kein Umsatzsteuerausweis. Cashback wird getrennt behandelt.'}
    ]
  }).getBlob();
}
