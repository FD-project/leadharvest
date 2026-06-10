// ─── Constantes ───────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 4000;
const MAX_BATCH_SIZE   = 10;

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
 * Tente d'extraire un email depuis le site web d'une entreprise.
 * Essaie plusieurs pages en parallèle et retourne le premier email valide trouvé.
 */
async function scrapeWebsite(entreprise) {
  if (!entreprise.site_web) return EMPTY_RESULT(entreprise.siren);

  const baseUrl = normalizeUrl(entreprise.site_web);
  const urls    = CONTACT_PATHS.map((p) => baseUrl + p);

  try {
    // Fetch toutes les pages en parallèle, on prend le premier email valide
    const fetchResults = await Promise.allSettled(urls.map(fetchAndExtractEmail));

    for (const r of fetchResults) {
      if (r.status === 'fulfilled' && r.value) {
        return { siren: entreprise.siren, email_website: r.value };
      }
    }
  } catch (err) {
    console.error(`Erreur scraping SIREN ${entreprise.siren}:`, err);
  }

  return EMPTY_RESULT(entreprise.siren);
}

/**
 * Fetche une URL et en extrait le premier email valide.
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

    if (!res.ok) return null;

    const html = await res.text();
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
  if (/\.(png|jpg|gif|svg|webp|css|js)$/i.test(email)) return false; // faux positifs dans src= attr
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
