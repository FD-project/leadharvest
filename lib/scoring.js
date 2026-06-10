// ─── Scoring v2 — 3 dimensions ────────────────────────────────────────────────
// Adéquation :   âge de l'entreprise vs cible PME/artisan
// Capacité :     taille + forme juridique + CA (tout disponible depuis SIRENE)
// Joignabilité : dirigeant (SIRENE) + téléphone & email (enrichissement)

// ─── Poids de base des 3 dimensions (somme = 100) ─────────────────────────────
const BASE_WEIGHTS = {
  adequation:   30,
  capacite:     40,
  joignabilite: 30,
};

// ─── Valeurs des multiplicateurs de profil ────────────────────────────────────
export const MULTIPLIER_VALUES = {
  ignorer:   0.5,
  normal:    1.0,
  prioriser: 1.5,
};

// ─── Profil par défaut (tout Normal) ─────────────────────────────────────────
export const DEFAULT_PROFILE = {
  adequation:   'normal',
  capacite:     'normal',
  joignabilite: 'normal',
};

// ─── Seuils d'affichage ───────────────────────────────────────────────────────
export const SCORE_HOT_THRESHOLD  = 70;
export const SCORE_WARM_THRESHOLD = 40;

// ─── Dimension 1 : Adéquation (0-100) ────────────────────────────────────────
// Zone idéale = entreprise créée il y a 3-15 ans : suffisamment mature pour
// investir mais pas encore figée dans ses habitudes.

function scoreAdequation(entreprise) {
  if (!entreprise.date_creation) return 50; // inconnu → score médian
  const ageYears = (Date.now() - new Date(entreprise.date_creation).getTime())
    / (1000 * 60 * 60 * 24 * 365.25);
  if (ageYears < 1.5) return 40;  // trop jeune, fragile
  if (ageYears < 3)   return 70;  // en croissance, s'équipe
  if (ageYears < 15)  return 100; // zone idéale
  return 55;                       // ancienne, peut être résistante
}

// ─── Dimension 2 : Capacité (0-100) ──────────────────────────────────────────
// Tout issu de SIRENE → disponible dès la recherche, avant enrichissement.

const EFFECTIF_POINTS = {
  '03': 50,  // 6-9 salariés  — artisan/PME idéal
  '11': 45,  // 10-19
  '02': 35,  // 3-5
  '12': 30,  // 20-49
  '01': 20,  // 1-2
  '21': 18,  // 50-99
  '22': 15,  // 100-199
  '00': 8,   // 0 salarié
  'NN': 8,   // non employeur
};

function getFormeJuridiquePoints(code) {
  if (!code) return 8;
  const c = String(code).trim();
  if (c.startsWith('1') || c.startsWith('9')) return 0;   // EI / micro
  if (['5710', '5720'].includes(c)) return 22;             // SAS / SASU
  if (['5499', '5308'].includes(c)) return 20;             // SARL / EURL
  if (['5800', '5815'].includes(c)) return 18;             // SA
  if (c.startsWith('5')) return 10;                        // autre société
  return 5;                                                 // inconnu
}

function scoreCapacite(entreprise) {
  let score = 0;

  // Effectif (max 50)
  score += EFFECTIF_POINTS[entreprise.tranche_effectif] ?? 10;

  // Forme juridique — depuis SIRENE (max 22)
  score += getFormeJuridiquePoints(entreprise.nature_juridique);

  // Chiffre d'affaires — depuis SIRENE quand disponible (max 25)
  const ca = entreprise.ca;
  if (ca != null) {
    if (ca >= 500_000)      score += 25;
    else if (ca >= 100_000) score += 15;
    else if (ca > 0)        score += 5;
  }

  return Math.min(score, 100);
}

// ─── Dimension 3 : Joignabilité (0-100) ──────────────────────────────────────
// Dirigeant nommé = SIRENE (gratuit, immédiat)
// Téléphone + Email = enrichissement (Google Maps / Pappers / scraping)

function scoreJoignabilite(entreprise) {
  let score = 0;

  if (entreprise.dirigeant?.nom)                      score += 30; // SIRENE
  if (entreprise.telephone ?? entreprise.telephone_pappers) score += 40; // enrichissement
  if (entreprise.email)                               score += 30; // enrichissement

  return Math.min(score, 100);
}

// ─── Score global ─────────────────────────────────────────────────────────────

/**
 * Calcule le score composite pondéré selon un profil.
 *
 * Score non-enrichi max ≈ 79 (si Adéq=100, Cap=100, Joi=30)
 * Score enrichi max = 100 (si tous les sous-scores = 100)
 * → Un prospect enrichi peut toujours dépasser un prospect non enrichi.
 *
 * @param {Object} entreprise
 * @param {Object} profile   — { adequation, capacite, joignabilite }
 *                             valeurs : 'ignorer' | 'normal' | 'prioriser'
 * @returns {{ score: number, subscores: { adequation, capacite, joignabilite } }}
 */
export function calculateScore(entreprise, profile = DEFAULT_PROFILE) {
  const adequation   = scoreAdequation(entreprise);
  const capacite     = scoreCapacite(entreprise);
  const joignabilite = scoreJoignabilite(entreprise);

  const mult = (key) => MULTIPLIER_VALUES[profile[key] ?? 'normal'];

  const wa = BASE_WEIGHTS.adequation   * mult('adequation');
  const wc = BASE_WEIGHTS.capacite     * mult('capacite');
  const wj = BASE_WEIGHTS.joignabilite * mult('joignabilite');
  const wt = wa + wc + wj;

  const score = wt > 0
    ? Math.round((adequation * wa + capacite * wc + joignabilite * wj) / wt)
    : 0;

  return {
    score: Math.min(Math.max(score, 0), 100),
    subscores: { adequation, capacite, joignabilite },
  };
}

// ─── Helpers de traitement (utilisés dans page.js) ────────────────────────────

/**
 * Ajoute score + sous-scores à une entreprise.
 * @param {Object} entreprise
 * @param {Object} profile
 * @returns {Object}
 */
export function withScore(entreprise, profile = DEFAULT_PROFILE) {
  const result = calculateScore(entreprise, profile);
  return { ...entreprise, score: result.score, subscores: result.subscores };
}

/**
 * Filtre par catégorie de score.
 * @param {Array}  results
 * @param {string} filterKey — 'all' | 'hot' | 'warm' | 'cold'
 */
export function applyScoreFilter(results, filterKey) {
  if (filterKey === 'all')  return results;
  if (filterKey === 'hot')  return results.filter((r) => r.score >= SCORE_HOT_THRESHOLD);
  if (filterKey === 'warm') return results.filter((r) => r.score >= SCORE_WARM_THRESHOLD && r.score < SCORE_HOT_THRESHOLD);
  if (filterKey === 'cold') return results.filter((r) => r.score < SCORE_WARM_THRESHOLD);
  return results;
}

/**
 * Filtre par données de contact enrichies.
 * @param {Array}  results
 * @param {string} filterKey — 'all' | 'phone' | 'email' | 'both'
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
 * Trie par champ.
 * @param {Array}        results
 * @param {string}       field
 * @param {'asc'|'desc'} direction
 */
export function applySort(results, field, direction) {
  return [...results].sort((a, b) => {
    const va = a[field] ?? '';
    const vb = b[field] ?? '';
    return direction === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });
}

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

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
