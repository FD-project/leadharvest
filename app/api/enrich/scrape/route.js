// ─── Constantes ───────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 5000;
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

// ─── Niveau 1 : blacklist de patterns dans l'adresse email ───────────────────
// Faux positifs courants : plateformes, éditeurs de thèmes, rôles techniques
const EMAIL_BLACKLIST = [
  // Adresses système / rôles
  'noreply', 'no-reply', 'example', 'sentry', 'abuse@', 'postmaster@',
  'webmaster@', 'hostmaster@', 'mailer-daemon',
  // Mentions légales / RGPD
  'privacy@', 'legal@', 'dpo@', 'rgpd@',
  // Constructeurs de sites
  'wordpress', 'wixpress', 'squarespace', 'shopify', 'prestashop',
  'wix.com', 'weebly.com', 'webflow.io',
  // Éditeurs de thèmes WordPress connus
  'elegantthemes.com', 'elementor.com', 'wpbakery.com', 'themeforest.net',
  'envato.com', 'themeisle.com', 'generatepress.com', 'avada.io',
  'wpforms.com', 'gravityforms.com', 'yoast.com', 'wpengine.com',
  'mythemeshop.com', 'studiopress.com', 'astra-theme.com',
  // Hébergeurs (leur email ne peut pas être celui de l'entreprise)
  'ovh.com', 'ovh.net', 'ovhcloud.com', 'ionos.fr', 'ionos.com',
  '1and1.fr', '1and1.com', 'godaddy.com', 'gandi.net',
  'infomaniak.com', 'planethoster.com', 'o2switch.fr',
  'hostinger.com', 'bluehost.com', 'siteground.com',
];

// ─── Niveau 2a : domaines d'email acceptables hors domaine site ──────────────
// Webmails personnels courants en France — un artisan peut avoir son email
// pro sur Orange, SFR, Gmail, etc. Ces adresses sont légitimes même si elles
// ne correspondent pas au domaine du site.
const WEBMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.fr', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.fr',
  'orange.fr', 'wanadoo.fr',
  'sfr.fr', 'sfr.com', 'neuf.fr',
  'free.fr', 'aliceadsl.fr',
  'laposte.net',
  'bbox.fr', 'bouyguestelecom.fr',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com',
]);

// Domaines plateformes/agrégateurs — jamais un site propre à l'entreprise
// → on n'y scrape pas
const PLATFORM_DOMAINS = new Set([
  // Réseaux sociaux
  'facebook.com', 'fb.com', 'instagram.com', 'linkedin.com',
  'twitter.com', 'x.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
  // Annuaires / plateformes françaises
  'pages-jaunes.fr', 'pagesjaunes.fr', 'societe.com', 'verif.com',
  'infogreffe.fr', 'pappers.fr', 'manageo.fr', 'kompass.com',
  'banette.fr', 'lafourchette.com', 'tripadvisor.com', 'tripadvisor.fr',
  'booking.com', 'google.com', 'maps.google.com',
  'apple.com', 'yelp.com', 'yelp.fr',
  // Constructeurs / franchises génériques
  'maisons-du-monde.com', 'groupon.com', 'vistaprint.com',
  // Créateurs de sites — domaine partagé
  'jimdo.com', 'wix.com', 'weebly.com', 'webflow.io', 'myshopify.com',
]);

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

  const siteDomain = extractDomain(entreprise.site_web);

  // Rejeter les domaines plateformes (Facebook, Banette, etc.) — pas un site propre
  const isPlatform = !siteDomain || [...PLATFORM_DOMAINS].some(
    p => siteDomain === p || siteDomain.endsWith('.' + p)
  );
  if (isPlatform) return EMPTY(entreprise.siren);

  // ── Scraping HTML : recherche d'emails réels sur le site de l'entreprise ───
  // Seuls les emails effectivement présents sur le site sont remontés.
  // Aucune génération algorithmique — évite les hard bounces.
  let scrapedEmail = null;
  try {
    for (const path of CONTACT_PATHS) {
      const email = await fetchAndExtractEmail(baseUrl + path, siteDomain);
      if (email) { scrapedEmail = email; break; }
    }
  } catch (err) {
    console.error(`Scraping SIREN ${entreprise.siren}:`, err.message);
  }

  // ── Niveau 2b : cohérence domaine email vs domaine du site ────────────────
  // Un email trouvé sur un domaine tiers inconnu (ni le site, ni un webmail
  // connu) est rejeté — c'est le signe d'un email d'éditeur de thème ou de
  // plugin embarqué dans la page.
  if (scrapedEmail && !isTrustedEmail(scrapedEmail, siteDomain)) {
    console.warn(`Email rejeté (domaine tiers non reconnu) : ${scrapedEmail} pour ${siteDomain}`);
    scrapedEmail = null;
  }

  return {
    siren:         entreprise.siren,
    email_website: scrapedEmail ?? null,
  };
}

// ─── Validation email ─────────────────────────────────────────────────────────

/**
 * Vérifie qu'un email est fiable avant de le retourner.
 * Niveau 2 : cohérence domaine email vs domaine du site.
 *
 * Accepté si :
 *   - l'email est sur le même domaine que le site de l'entreprise
 *   - OU l'email est sur un webmail connu (Gmail, Orange, SFR, etc.)
 * Rejeté si :
 *   - l'email est sur un domaine tiers inconnu (éditeur de thème, hébergeur…)
 */
function isTrustedEmail(email, siteDomain) {
  const emailDomain = email.split('@')[1];
  if (!emailDomain) return false;

  // Même domaine que le site (ou sous-domaine) → toujours OK
  if (siteDomain && (emailDomain === siteDomain || emailDomain.endsWith('.' + siteDomain))) {
    return true;
  }

  // Webmail connu → OK (artisan avec email perso)
  if (WEBMAIL_DOMAINS.has(emailDomain)) return true;

  // Domaine tiers inconnu → rejeté
  return false;
}

function isValidEmail(email) {
  if (!email.includes('@'))                                          return false;
  if (EMAIL_BLACKLIST.some(b => email.toLowerCase().includes(b)))   return false;
  if (/\.(png|jpg|gif|svg|webp|css|js)$/i.test(email))             return false;
  if (email.includes('..'))                                          return false;
  const tld = email.split('.').pop();
  if (tld.length > 6)                                               return false;
  return true;
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

function extractDomain(siteUrl) {
  try {
    const u = new URL(normalizeUrl(siteUrl));
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
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
 * Seuls les emails passant isValidEmail() (niveau 1) sont candidats.
 * La cohérence domaine (niveau 2) est vérifiée en aval dans enrichEntreprise().
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
