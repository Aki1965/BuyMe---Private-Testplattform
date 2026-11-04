import {readServiceConfig} from '../server/service-config.mjs';
const result=readServiceConfig(process.env);
if(result.errors.length){
  console.error('Verbindungseinstellungen sind noch unvollständig:');
  for(const error of result.errors)console.error('- '+error);
  process.exitCode=1;
}else{
  console.log('Format der Einstellungen geprüft. Es wurden keine Konten verbunden, Daten migriert oder E-Mails versendet.');
  console.log('Datenbank-/Rollenprüfung, Cookiebot-Domainprüfung und Brevo-Absenderprüfung bleiben erforderlich.');
}
