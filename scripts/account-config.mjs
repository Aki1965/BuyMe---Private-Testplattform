const normal = value => String(value || '').trim();

export function publicAccountConfig(env = process.env) {
  const enabled = env.BUYME_ACCOUNT_SIGNUP_ENABLED === 'true';
  const config = {
    enabled,
    supabaseUrl: normal(env.SUPABASE_URL),
    publishableKey: normal(env.SUPABASE_PUBLISHABLE_KEY),
    appOrigin: normal(env.BUYME_APP_ORIGIN) || 'https://buyme.com.tr',
    operatorName: 'Ejdat Akyol',
    operatorAddress: normal(env.BUYME_OPERATOR_ADDRESS),
    senderEmail: 'info@buyme.com.tr',
    termsVersion: '2026-11-12.test-accounts-v1',
    privacyVersion: '2026-11-12.test-accounts-v1'
  };
  // Do not serialize the environment or any Brevo/SMTP secret into public assets.
  if (!enabled) return {...config, supabaseUrl: '', publishableKey: ''};
  const requireHttpsOrigin = (value, label) => {
    let url;
    try { url = new URL(value); } catch { throw Error(label + ' fehlt oder ist ungültig.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw Error(label + ' muss eine reine HTTPS-Adresse sein.');
    }
    return url.origin;
  };
  config.supabaseUrl = requireHttpsOrigin(config.supabaseUrl, 'SUPABASE_URL');
  config.appOrigin = requireHttpsOrigin(config.appOrigin, 'BUYME_APP_ORIGIN');
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) {
    throw Error('Ein öffentlicher Supabase Publishable Key ist erforderlich.');
  }
  if (config.operatorAddress.length < 12 || /platzhalter|noch offen|example|musteradresse/i.test(config.operatorAddress)) {
    throw Error('Die vollständige Betreiberanschrift fehlt.');
  }
  if (env.BUYME_ACCOUNT_SETUP_VERIFIED !== 'true') {
    throw Error('SMTP, E-Mail-Bestätigung, Redirects und Datenschutzhinweise müssen vor der Freigabe geprüft sein.');
  }
  return config;
}
