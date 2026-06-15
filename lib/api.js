// ─── URLs des API externes (serveur uniquement) ───────────────────────────────

export const SIRENE_API_URL   = 'https://recherche-entreprises.api.gouv.fr/search';
export const GOOGLE_PLACES_FIND_URL   = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
export const GOOGLE_PLACES_DETAIL_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

// ─── Constantes de comportement ───────────────────────────────────────────────

export const SIRENE_PAGE_SIZE     = 25;   // Résultats par page API SIRENE
export const SIRENE_MAX_RESULTS   = 1000; // Limite totale de résultats collectés
export const SIRENE_PAGE_DELAY_MS = 100;  // Délai entre les pages (throttle)
export const FETCH_TIMEOUT_MS     = 8000; // Timeout par requête
export const FETCH_MAX_RETRIES    = 3;    // Nombre de tentatives
export const FETCH_RETRY_DELAY_MS = 500;  // Délai de base entre tentatives

// ─── Constantes d'enrichissement ─────────────────────────────────────────────

export const ENRICH_BATCH_SIZE    = 5;    // Entreprises par batch d'enrichissement

// ─── Helpers serveur ─────────────────────────────────────────────────────────

/**
 * Fetch avec retry exponentiel.
 * À utiliser dans les API Routes uniquement (Node.js / Edge Runtime).
 *
 * @param {string} url
 * @param {number} retries
 * @param {number} delayMs
 * @returns {Promise<Response|null>}
 */
export async function fetchWithRetry(
  url,
  retries = FETCH_MAX_RETRIES,
  delayMs = FETCH_RETRY_DELAY_MS
) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) return res;
      if (attempt < retries - 1) {
        await sleep(delayMs * (attempt + 1));
      }
    } catch (err) {
      if (attempt < retries - 1) {
        await sleep(delayMs * (attempt + 1));
      } else {
        throw err;
      }
    }
  }
  return null;
}

/**
 * Urls des routes d'enrichissement (client → serveur Next.js)
 * Centralisées ici pour éviter les strings hardcodées dans les composants.
 */
export const ENRICH_ROUTES = {
  google: '/api/enrich/google',
  scrape: '/api/enrich/scrape',
};

// ─── Helpers client ───────────────────────────────────────────────────────────

/**
 * POST JSON vers une API Route Next.js.
 * Lance une exception si la réponse est en erreur.
 *
 * @template T
 * @param {string} url
 * @param {unknown} body
 * @returns {Promise<T>}
 */
export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

// ─── Utilitaire partagé ───────────────────────────────────────────────────────

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
