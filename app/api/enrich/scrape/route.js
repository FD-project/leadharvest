// ─── Constantes ───────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 4000;
const MAX_BATCH_SIZE   = 10;
const MAX_HTML_BYTES   = 500_000; // 500 ko — évite de charger des pages catalogue en entier

// Pages tentées dans l'ordre (on s'arrête dès qu'un email est trouvé)
const CONTACT_PATHS = [
  '',
  '/contact',
  '/nous-contacter',
  '/contactez-nous',
  '/contact.html',
  '/contact.php',
];

// Domaines / patterns à ignorer (faux positifs courants)
const EMAIL_BLACKLIST = [
  'noreply', 'no-reply', 'example', 'wordpress', 'sentry',
  'wixpress', 'squarespace', 'shopify', 'prestashop',
  'privacy@', 'legal@', 'dpo@', 'rgpd@',
];

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.entreprises || !Array.isArray(body.entreprises)) {
    return Response.json({ error: 'Format invalide' }, { status: 400 });
  }
  if (body.entreprises.length > MAX_BATCH_SIZE) {
    return Response.json({ error: `Batch trop grand (max ${MAX_BATCH_SIZE})` }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      body.entreprises.map(scrapeWebsite)
    );
    return Response.json({ results });
  } catch (error) {
    console.error('Erreur scraping:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_RESULT = (siren) => ({ siren, email_website: null });

/**
 * Bloque les URLs pointant vers des ressources internes ou non-HTTP.
 * Protège contre les attaques SSRF (Server-Side Request Forgery).
 */
function isSafeUrl(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (!['http:', 'https:'].includes(protocol)) return false;
    // Bloquer localhost et plages IP privées
    if (/^(localhost|127\.\d+\.\d+\.\d+)$/.test(hostname)) return false;
    if (/^10\.\d+\.\d+\.\d+$/.test(hostname))               return false;
    if (/^192\.168\.\d+\.\d+$/.test(hostname))              return false;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)) return false;
    if (hostname === '169.254.169.254')                      return false; // AWS metadata
    return true;
  } catch {
    return false;
  }
}

/**
 * Tente d'extraire un email depuis le site web d'une entreprise.
 * Parcourt les pages séquentiellement et s'arrête dès le premier email valide.
 */
async function scrapeWebsite(entreprise) {
  if (!entreprise.site_web) return EMPTY_RESULT(entreprise.siren);

  const baseUrl = normalizeUrl(entreprise.site_web);

  // Sécurité SSRF : rejeter toute URL interne ou non-HTTP
  if (!isSafeUrl(baseUrl)) return EMPTY_RESULT(entreprise.siren);

  try {
    for (const path of CONTACT_PATHS) {
      const email = await fetchAndExtractEmail(baseUrl + path);
      if (email) return { siren: entreprise.siren, email_website: email };
    }
  } catch (err) {
    console.error(`Erreur scraping SIREN ${entreprise.siren}:`, err);
  }

  return EMPTY_RESULT(entreprise.siren);
}

/**
 * Fetche une URL et en extrait le premier email valide.
 * Limite la lecture à MAX_HTML_BYTES pour éviter de saturer la mémoire.
 * @returns {Promise<string|null>}
 */
async function fetchAndExtractEmail(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadHarvestBot/1.0)',
        'Accept':     'text/html',
      },
      redirect: 'follow',
    });

    if (!res.ok || !res.body) return null;

    // Lecture limitée à MAX_HTML_BYTES — protège contre les pages volumineuses
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.length >= MAX_HTML_BYTES) {
        reader.cancel().catch(() => {});
        break;
      }
    }

    return extractEmail(html);
  } catch {
    return null; // timeout, SSL error, etc.
  }
}

/**
 * Extrait le meilleur email d'un bloc HTML.
 * Priorité : liens mailto: > patterns texte
 */
function extractEmail(html) {
  // 1. Liens mailto: — le plus fiable
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const email = match[1].split('?')[0].toLowerCase();
    if (isValidEmail(email)) return email;
  }

  // 2. Patterns email dans le texte
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  while ((match = emailRegex.exec(html)) !== null) {
    const email = match[0].toLowerCase();
    if (isValidEmail(email)) return email;
  }

  return null;
}

/**
 * Valide qu'un email est probablement réel et utile.
 */
function isValidEmail(email) {
  if (EMAIL_BLACKLIST.some((b) => email.includes(b)))   return false;
  if (/\.(png|jpg|gif|svg|webp|css|js)$/i.test(email)) return false;
  if (email.includes('..'))                             return false;
  const tld = email.split('.').pop();
  if (tld.length > 6)                                   return false;
  if (!email.includes('@'))                             return false;
  return true;
}

/**
 * Normalise une URL (ajoute https si absent, retire le slash final).
 */
function normalizeUrl(url) {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/$/, '');
}
