# Serverseitige Funktionen

Dieser Ordner enthält noch keine aktive Brevo- oder Supabase-Geschäftsfunktion. Er ist in netlify.toml für die spätere Serverintegration vorgesehen.

Brevo-Schlüssel ausschließlich als Netlify-Laufzeitgeheimnisse mit Functions-Scope verwenden. Berechtigungen müssen serverseitig aus der bestätigten Supabase-Sitzung kommen. Browserrollen und frei gewählte Empfänger dürfen keine Versand- oder Administrationsrechte verleihen. Siehe docs/SERVICE_INTEGRATION.md für die offenen Implementierungsschritte.
