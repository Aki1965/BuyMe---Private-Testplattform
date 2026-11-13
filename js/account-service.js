// Supabase client is injected so account workflows can be tested without sending emails.
// This module never reads or writes the prototype's auth/store/IndexedDB data.
export function createAccountService(client, config) {
  const profileColumns = 'id,display_name,company_name,requested_role,terms_version,privacy_version,created_at';
  const fail = error => { if (error) throw error; };
  const redirectTo = () => new URL('/account.html', config.appOrigin).href;
  const emailValue = value => String(value || '').trim().toLowerCase();
  const profileValue = (value, min, max, label) => {
    const text = String(value || '').trim();
    if (text.length < min || text.length > max) throw Error(label + ' ist ungültig.');
    return text;
  };
  const requirePassword = password => {
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
      throw Error('Bitte ein Passwort mit 12 bis 128 Zeichen verwenden.');
    }
  };
  async function verifiedUser() {
    const {data, error} = await client.auth.getUser();
    fail(error);
    const user = data?.user;
    if (!user || !user.email || !user.email_confirmed_at || user.is_anonymous) {
      throw Error('Bitte zuerst die E-Mail-Adresse bestätigen und anmelden.');
    }
    return user;
  }
  async function ownProfile() {
    const user = await verifiedUser();
    let result = await client.from('buyme_test_profiles').select(profileColumns).eq('id', user.id).maybeSingle();
    fail(result.error);
    if (!result.data) {
      const metadata = user.user_metadata || {};
      if (metadata.buyme_test_terms !== config.termsVersion || !String(metadata.display_name || '').trim()) return {user, profile: null};
      const payload = {
        id: user.id,
        display_name: profileValue(metadata.display_name, 2, 100, 'Name'),
        company_name: profileValue(metadata.company_name, 0, 160, 'Firmenname'),
        requested_role: metadata.requested_role === 'provider' ? 'provider' : 'member',
        terms_acknowledged: true
      };
      result = await client.from('buyme_test_profiles').insert(payload).select(profileColumns).single();
      // Two browser tabs may create the same verified profile concurrently.
      if (result.error?.code === '23505') {
        result = await client.from('buyme_test_profiles').select(profileColumns).eq('id', user.id).single();
      }
      fail(result.error);
    }
    return {user, profile: result.data};
  }
  return {
    async register(form) {
      const email = emailValue(form.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Bitte eine gültige E-Mail-Adresse eingeben.');
      requirePassword(form.password);
      if (form.password !== form.passwordConfirm) throw Error('Die Passwörter stimmen nicht überein.');
      if (form.terms !== 'on') throw Error('Bitte die Testnutzungsbedingungen akzeptieren.');
      if (!['member', 'provider'].includes(form.role)) throw Error('Bitte einen gültigen Kontotyp auswählen.');
      const name = profileValue(form.name, 2, 100, 'Name');
      const company = profileValue(form.company, form.role === 'provider' ? 2 : 0, 160, 'Firmenname');
      const {data, error} = await client.auth.signUp({email, password: form.password, options: {
        emailRedirectTo: redirectTo(),
        data: {display_name: name, company_name: company, requested_role: form.role, buyme_test_terms: config.termsVersion}
      }});
      fail(error);
      // A session here signals that server-side email confirmation is disabled.
      // Fail closed in the UI; operators must fix the hosted Auth configuration.
      if (data?.session) {
        await client.auth.signOut();
        throw Error('Die Registrierung ist noch nicht korrekt freigeschaltet. Bitte den Betreiber kontaktieren.');
      }
      return {confirmationRequired: true};
    },
    async signIn(email, password) {
      const {error} = await client.auth.signInWithPassword({email: emailValue(email), password});
      fail(error);
      return ownProfile();
    },
    ownProfile,
    async completeProfile(form) {
      if (form.terms !== 'on') throw Error('Bitte die Testnutzungsbedingungen akzeptieren.');
      if (!['member', 'provider'].includes(form.role)) throw Error('Bitte einen gültigen Kontotyp auswählen.');
      const user = await verifiedUser();
      const payload = {
        id: user.id,
        display_name: profileValue(form.name, 2, 100, 'Name'),
        company_name: profileValue(form.company, form.role === 'provider' ? 2 : 0, 160, 'Firmenname'),
        requested_role: form.role,
        terms_acknowledged: true
      };
      const result = await client.from('buyme_test_profiles').insert(payload).select(profileColumns).single();
      fail(result.error);
      return result.data;
    },
    async saveProfile(form) {
      const user = await verifiedUser();
      const payload = {
        display_name: profileValue(form.name, 2, 100, 'Name'),
        company_name: profileValue(form.company, 0, 160, 'Firmenname')
      };
      const result = await client.from('buyme_test_profiles').update(payload).eq('id', user.id).select(profileColumns).single();
      fail(result.error);
      return result.data;
    },
    async requestReset(email) {
      const {error} = await client.auth.resetPasswordForEmail(emailValue(email), {redirectTo: redirectTo()});
      fail(error);
    },
    async resendConfirmation(email) {
      const {error} = await client.auth.resend({type: 'signup', email: emailValue(email), options: {emailRedirectTo: redirectTo()}});
      fail(error);
    },
    async setPassword(password, confirmation) {
      requirePassword(password);
      if (password !== confirmation) throw Error('Die Passwörter stimmen nicht überein.');
      await verifiedUser();
      const {error} = await client.auth.updateUser({password});
      fail(error);
      const result = await client.auth.signOut();
      fail(result.error);
    },
    async signOut() { const {error} = await client.auth.signOut(); fail(error); }
  };
}
