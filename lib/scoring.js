// ─── Constantes de scoring ────────────────────────────────────────────────────
// Logique métier centrale de LeadHarvest
// Maturité digitale faible = score élevé = prospect chaud

export const SCORE_WEIGHTS = {
  NO_WEBSITE:       30,
  NO_GMB:           25,
  NO_DIRECTORY:     15,
  TARGET_HEADCOUNT: 20,
  RECENT_COMPANY:   10,
};

export const SCORE_MAX = 100;

// Tranches d'effectif considérées comme "cible PME/artisan"
export const TARGET_HEADCOUNT_CODES = ['NN', '00', '01', '02', '03', '11', '12'];

// Seuils d'affichage
export const SCORE_HOT_THRESHOLD  = 70;
export const SCORE_WARM_THRESHOLD = 40;

// Age max (en années) pour considérer une entreprise comme "récente"
export const RECENT_COMPANY_MAX_YEARS = 3;

// ─── Calcul du score ──────────────────────────────────────────────────────────

/**
 * Calcule le score de maturité digitale d'une entreprise.
 * Plus le score est élevé, plus la maturité digitale est faible → prospect chaud.
 *
 * @param {Object} entreprise
 * @param {string|null} entreprise.site_web
 * @param {boolean}     entreprise.gmb_present
 * @param {boolean}     entreprise.pappers_present
 * @param {string}      entreprise.tranche_effectif
 * @param {string}      entreprise.date_creation  — format ISO ou YYYY-MM-DD
 * @returns {number} Score entre 0 et SCORE_MAX
 */
export function calculateScore(entreprise) {
  let score = 0;

  if (!entreprise.site_web)         score += SCORE_WEIGHTS.NO_WEBSITE;
  if (!entreprise.gmb_present)      score += SCORE_WEIGHTS.NO_GMB;
  if (!entreprise.pappers_present)  score += SCORE_WEIGHTS.NO_DIRECTORY;

  if (TARGET_HEADCOUNT_CODES.includes(entreprise.tranche_effectif)) {
    score += SCORE_WEIGHTS.TARGET_HEADCOUNT;
  }

  if (entreprise.date_creation) {
    const ageInYears = (Date.now() - new Date(entreprise.date_creation).getTime())
      / (1000 * 60 * 60 * 24 * 365.25);

    if (ageInYears < RECENT_COMPANY_MAX_YEARS) {
      score += SCORE_WEIGHTS.RECENT_COMPANY;
    }
  }

  return Math.min(score, SCORE_MAX);
}

// ─── Helpers de traitement (utilisés dans page.js pour opérer sur allResults) ─

/**
 * Ajoute un score calculé à une entreprise si elle n'en a pas encore.
 * @param {Object} entreprise
 * @returns {Object}
 */
export function withScore(entreprise) {
  return {
    ...entreprise,
    score: entreprise.score ?? calculateScore(entreprise),
  };
}

/**
 * Filtre une liste d'entreprises par catégorie de score.
 * @param {Array}  results
 * @param {string} filterKey — 'all' | 'hot' | 'warm' | 'cold'
 * @returns {Array}
 */
export function applyScoreFilter(results, filterKey) {
  if (filterKey === 'all')  return results;
  if (filterKey === 'hot')  return results.filter((r) => r.score >= SCORE_HOT_THRESHOLD);
  if (filterKey === 'warm') return results.filter((r) => r.score >= SCORE_WARM_THRESHOLD && r.score < SCORE_HOT_THRESHOLD);
  if (filterKey === 'cold') return results.filter((r) => r.score < SCORE_WARM_THRESHOLD);
  return results;
}

/**
 * Filtre une liste d'entreprises selon la présence de données de contact enrichies.
 * @param {Array}  results
 * @param {string} filterKey — 'all' | 'phone' | 'email' | 'both'
 * @returns {Array}
 */
export function applyEnrichFilter(results, filterKey) {
  if (filterKey === 'all') return results;
  const hasPhone = (r) => !!(r.telephone ?? r.telephone_pappers);
  const hasEmail = (r) => !!r.email;
  if (filterKey === 'phone') return results.filter(hasPhone);
  if (filterKey === 'email') return results.filter(hasEmail);
  if (filterKey === 'both')  return results.filter((r) => hasPhone(r) && hasEmail(r));
  return results;
}

/**
 * Trie une liste d'entreprises par un champ donné.
 * @param {Array}  results
 * @param {string} field
 * @param {'asc'|'desc'} direction
 * @returns {Array}
 */
export function applySort(results, field, direction) {
  return [...results].sort((a, b) => {
    const va = a[field] ?? '';
    const vb = b[field] ?? '';
    return direction === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });
}

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

/**
 * @param {number} score
 * @returns {'hot' | 'warm' | 'cold'}
 */
export function getScoreCategory(score) {
  if (score >= SCORE_HOT_THRESHOLD)  return 'hot';
  if (score >= SCORE_WARM_THRESHOLD) return 'warm';
  return 'cold';
}

export const SCORE_CATEGORY_LABELS = {
  hot:  'Chaud',
  warm: 'Tiède',
  cold: 'Froid',
};

export const SCORE_CATEGORY_COLORS = {
  hot:  { badge: 'bg-red-100 text-red-700',    bar: 'bg-red-500'   },
  warm: { badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  cold: { badge: 'bg-green-100 text-green-700', bar: 'bg-green-500' },
};
