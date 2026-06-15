// ─── Cache d'enrichissement — localStorage ────────────────────────────────────
// Stocke les données enrichies (téléphone, email, site web, GMB, Pappers)
// indexées par SIREN. Persiste entre les sessions navigateur.
//
// Clé versionnée (v1) pour permettre une invalidation propre si la structure change.

const CACHE_KEY = 'leadharvest_enriched_v2'; // v2 : note_gmb/nb_avis supprimés (Atmosphere Data)

// Champs enrichis à conserver en cache (on n'y met pas les données SIRENE brutes)
const ENRICHED_FIELDS = [
  'telephone',
  'telephone_pappers',
  'email',
  'site_web',
  'gmb_present',
  'pappers_present',
  'enriched',
];

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Charge le cache complet depuis localStorage.
 * @returns {Record<string, object>}  — objet indexé par SIREN
 */
export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Retourne le nombre d'entrées en cache.
 * @returns {number}
 */
export function getCacheSize() {
  return Object.keys(loadCache()).length;
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

/**
 * Sauvegarde les données enrichies d'une liste d'entreprises.
 * Seules les entreprises avec enriched=true sont enregistrées.
 * Les entrées existantes sont fusionnées (merge), pas écrasées.
 *
 * @param {Array} entreprises
 */
export function saveToCache(entreprises) {
  try {
    const cache = loadCache();
    for (const e of entreprises) {
      if (!e.siren || !e.enriched) continue;
      const entry = {};
      for (const field of ENRICHED_FIELDS) {
        if (e[field] !== undefined) entry[field] = e[field];
      }
      cache[e.siren] = {
        ...(cache[e.siren] ?? {}),
        ...entry,
        cached_at: new Date().toISOString(),
      };
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('LeadHarvest — cache indisponible:', err);
  }
}

// ─── Application ──────────────────────────────────────────────────────────────

/**
 * Applique le cache sur une liste de résultats de recherche.
 * Les entreprises déjà enrichies dans la session en cours ne sont pas écrasées.
 * Les données cachées sont marquées with `from_cache: true`.
 *
 * @param {Array} results
 * @returns {Array}
 */
export function applyCacheToResults(results) {
  const cache = loadCache();
  return results.map((r) => {
    if (r.enriched) return r; // déjà enrichi dans cette session → prioritaire
    const cached = cache[r.siren];
    if (!cached) return r;
    return { ...r, ...cached, from_cache: true };
  });
}

// ─── Reset ────────────────────────────────────────────────────────────────────

/**
 * Vide entièrement le cache d'enrichissement.
 */
export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // silencieux
  }
}
