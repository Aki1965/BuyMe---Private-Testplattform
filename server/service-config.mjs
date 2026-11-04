// Configuration validation only; this module never connects an account or sends data.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const httpsOrigin=/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::443)?\/?$/i;
export function readServiceConfig(env={}){
  const errors=[],value=key=>String(env[key]||'').trim();
  const environment=value('BUYME_ENVIRONMENT');
  const publicConfig={
    appOrigin:value('BUYME_APP_ORIGIN').replace(/\/$/,''),
    supabaseUrl:value('SUPABASE_URL').replace(/\/$/,''),
    supabasePublishableKey:value('SUPABASE_PUBLISHABLE_KEY'),
    cookiebotDomainGroupId:value('COOKIEBOT_DOMAIN_GROUP_ID')
  };
  if(!['staging','production'].includes(environment))errors.push('BUYME_ENVIRONMENT: staging oder production angeben.');
  if(!httpsOrigin.test(publicConfig.appOrigin))errors.push('BUYME_APP_ORIGIN: bestätigte HTTPS-Adresse ohne Pfad angeben.');
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(publicConfig.supabaseUrl))errors.push('SUPABASE_URL: die Standard-Projektadresse verwenden; eigene Domains separat prüfen.');
  if(!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publicConfig.supabasePublishableKey))errors.push('SUPABASE_PUBLISHABLE_KEY: nur einen aktuellen Publishable Key verwenden, niemals Secret oder service_role.');
  if(!uuid.test(publicConfig.cookiebotDomainGroupId)||/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(publicConfig.cookiebotDomainGroupId))errors.push('COOKIEBOT_DOMAIN_GROUP_ID: tatsächliche Domain-Group-ID angeben.');
  const serverConfig={brevoApiKey:value('BREVO_API_KEY'),brevoSenderEmail:value('BREVO_SENDER_EMAIL'),brevoSenderName:value('BREVO_SENDER_NAME')||'BuyMe'};
  if(serverConfig.brevoApiKey.length<20||/\s/.test(serverConfig.brevoApiKey))errors.push('BREVO_API_KEY: serverseitig hinterlegen.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(serverConfig.brevoSenderEmail))errors.push('BREVO_SENDER_EMAIL: die in Brevo verifizierte Absenderadresse angeben.');
  return {environment,publicConfig,serverConfig,errors,configurationComplete:errors.length===0};
}
