import { promises as dnsPromises } from 'dns';

// ─── Constantes ───────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 5000;
const DNS_TIMEOUT_MS   = 3000;
const MAX_BATCH_SIZE   = 10;
const MAX_HTML_BYTES   = 400_000;

// Pages scrapées dans l'ordre (stop dès qu'un email est trouvé)
const CONTACT_PATHS = [
  '/contact',
  '/nous-contacter',
  '/contactez-nous',
  '/contact.html',
  '/contact.php',
  '',               // homepage en dernier
];

// Patterns à rejeter — faux positifs courants
const EMAIL_BLACKLIST = [
  'noreply', 'no-reply', 'example', 'wordpress', 'sentry',
  'wixpress', 'squarespace', 'shopify', 'prestashop',
  'privacy@', 'legal@', 'dpo@', 'rgpd@',
];

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.entreprises || !Array.isArray(body.entreprises)) {
    return Response.json({ error: 'Format invalide' }, { status: 400 });
  }
  if (body.entreprises.length > MAX_BATCH_SIZE) {
    return Response.json({ error: `Batch trop grand (max ${MAX_BATCH_SIZE})` }, { status: 400 });
  }

  try {
    const results = await Promise.all(body.entreprises.map(enrichEntreprise));
    return Response.json({ results });
  } catch (err) {
    console.error('Erreur enrichissement scrape:', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── Fonction principale ──────────────────────────────────────────────────────

const EMPTY = (siren) => ({ siren, email_website: null });

async function enrichEntreprise(entreprise) {
  if (!entreprise.site_web) return EMPTY(entreprise.siren);

  const baseUrl = normalizeUrl(entreprise.site_web);
  if (!isSafeUrl(baseUrl)) return EMPTY(entreprise.siren);

  const domain = extractDomain(entreprise.site_web);

  // ── Passe 1 : scraping HTML ────────────────────────────────────────────────
  let scrapedEmail = null;
  try {
    for (const path of CONTACT_PATHS) {
      const email = await fetchAndExtractEmail(baseUrl + path, domain);
      if (email) { scrapedEmail = email; break; }
    }
  } catch (err) {
    console.error(`Scraping SIREN ${entreprise.siren}:`, err.message);
  }

  if (scrapedEmail) {
    return { siren: entreprise.siren, email_website: scrapedEmail, email_source: 'scraped' };
  }

  // ── Passe 2 : génération algorithmique + vérification MX ─────────────────
  if (!domain) return EMPTY(entreprise.siren);

  const hasMx = await checkMx(domain);
  if (!hasMx) return EMPTY(entreprise.siren);

  const dirigeant = entreprise.dirigeant ?? {};
  const { nominative, generic } = buildCombinations(
    dirigeant.prenom ?? '',
    dirigeant.nom    ?? '',
    domain,
  );

  // Priorité : nominatif > générique
  const best = nominative[0] ?? generic[0] ?? null;
  if (!best) return EMPTY(entreprise.siren);

  return {
    siren:            entreprise.siren,
    email_website:    best,
    email_source:     nominative.length > 0 ? 'algorithmic_nominative' : 'algorithmic_generic',
    email_candidates: [...nominative, ...generic],
  };
}

// ─── MX Verification ─────────────────────────────────────────────────────────

const mxCache = new Map();

async function checkMx(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  try {
    const records = await Promise.race([
      dnsPromises.resolveMx(domain),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), DNS_TIMEOUT_MS)
      ),
    ]);
    const ok = Array.isArray(records) && records.length > 0;
    mxCache.set(domain, ok);
    return ok;
  } catch {
    mxCache.set(domain, false);
    return false;
  }
}

// ─── Génération algorithmique ─────────────────────────────────────────────────

function normalizePart(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // retire les accents (é→e, ç→c, etc.)
    .replace(/[^a-z0-9]/g, '');        // garde alphanumériques seulement
}

function extractDomain(siteUrl) {
  try {
    const u = new URL(normalizeUrl(siteUrl));
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Génère les combinaisons d'email possibles pour un dirigeant.
 * Portage 1:1 depuis le notebook Python LeadHarvest_Enrichissement_Email.ipynb
 */
function buildCombinations(rawPrenom, rawNom, domain) {
  const p  = normalizePart(rawPrenom);
  const n  = normalizePart(rawNom);
  const p1 = p ? p[0] : '';

  const nominative = [];
  if (p && n) {
    nominative.push(
      `${p}.${n}@${domain}`,     // jean.dupont@
      `${p1}.${n}@${domain}`,    // j.dupont@
      `${p}${n}@${domain}`,      // jeandupont@
      `${p}@${domain}`,          // jean@
      `${n}@${domain}`,          // dupont@
    );
  } else if (n) {
    nominative.push(`${n}@${domain}`);
  } else if (p) {
    nominative.push(`${p}@${domain}`);
  }

  const generic = [
    `contact@${domain}`,
    `info@${domain}`,
    `direction@${domain}`,
    `accueil@${domain}`,
    `bonjour@${domain}`,
  ];

  return { nominative, generic };
}

// ─── Scraping HTML ────────────────────────────────────────────────────────────

function isSafeUrl(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (!['http:', 'https:'].includes(protocol))                return false;
    if (/^(localhost|127\.\d+\.\d+\.\d+)$/.test(hostname))     return false;
    if (/^10\.\d+\.\d+\.\d+$/.test(hostname))                  return false;
    if (/^192\.168\.\d+\.\d+$/.test(hostname))                 return false;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)) return false;
    if (hostname === '169.254.169.254')                         return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/$/, '');
}

async function fetchAndExtractEmail(url, domain = null) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadHarvestBot/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!res.ok || !res.body) return null;

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

    return extractEmail(html, domain);
  } catch {
    return null;
  }
}

/**
 * Extrait le meilleur email d'un bloc HTML.
 * Priorité : mailto sur même domaine > mailto autre > texte même domaine > texte autre.
 */
function extractEmail(html, domain = null) {
  const found = [];

  // 1. Liens mailto: — source la plus fiable
  const mailtoRe = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  let m;
  while ((m = mailtoRe.exec(html)) !== null) {
    const email = m[1].split('?')[0].toLowerCase();
    if (isValidEmail(email)) found.push({ email, type: 'mailto' });
  }

  // 2. Patterns texte dans le HTML
  const textRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  while ((m = textRe.exec(html)) !== null) {
    const email = m[0].toLowerCase();
    if (isValidEmail(email) && !found.some(f => f.email === email)) {
      found.push({ email, type: 'text' });
    }
  }

  if (found.length === 0) return null;

  // Priorité : même domaine d'abord
  if (domain) {
    const hit = found.find(f => f.type === 'mailto' && f.email.endsWith('@' + domain))
             ?? found.find(f => f.email.endsWith('@' + domain));
    if (hit) return hit.email;
  }

  // Fallback : premier mailto, sinon premier trouvé
  return (found.find(f => f.type === 'mailto') ?? found[0]).email;
}

function isValidEmail(email) {
  if (!email.includes('@'))                                   return false;
  if (EMAIL_BLACKLIST.some(b => email.includes(b)))          return false;
  if (/\.(png|jpg|gif|svg|webp|css|js)$/i.test(email))       return false;
  if (email.includes('..'))                                   return false;
  const tld = email.split('.').pop();
  if (tld.length > 6)                                        return false;
  return true;
}
