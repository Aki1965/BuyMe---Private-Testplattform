// Public settings only. Build-time values are validated by scripts/account-config.mjs.
// Remains closed until SMTP, redirects, operator address and acceptance checks are complete.
export const accountConfig = Object.freeze({
  enabled: false,
  supabaseUrl: '',
  publishableKey: '',
  appOrigin: 'https://buyme.com.tr',
  operatorName: 'Ejdat Akyol',
  operatorContext: 'BuyMe-Testversion in der Gründungsphase',
  operatorAddress: '',
  senderEmail: 'info@buyme.com.tr',
  termsVersion: '2026-11-12.test-accounts-v1',
  privacyVersion: '2026-11-12.test-accounts-v1'
});
