export function downloadInvoiceFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function showInvoiceFile(load, name, print) {
  // Open synchronously so that browsers allow a tab opened by this click.
  const tab = print ? window.open('', '_blank') : null;
  if (print && !tab) throw Error('Bitte Pop-ups für BuyMe erlauben oder die PDF herunterladen und öffnen.');
  if (tab) {
    tab.opener = null;
    tab.document.body.textContent = 'Rechnung wird geladen …';
  }
  try {
    const blob = await load();
    if (!print) {
      downloadInvoiceFile(blob, name);
      return;
    }
    if (tab.closed) return;
    const url = URL.createObjectURL(blob);
    tab.location.replace(url);
    setTimeout(() => URL.revokeObjectURL(url), 300_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export function invoiceFilename(number, extension) {
  return 'BuyMe-' + String(number).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 150) + '.' + extension;
}
