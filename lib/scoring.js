// Scoring V2 - 4 axes
// 1. Adequation   : pertinence du code NAF vs cible PME/artisan
// 2. Capacite     : tranche effectif + CA
// 3. Maturite     : anciennete (zone ideale 3-15 ans)
// 4. Joignabilite : dirigeant nomme + telephone + email

const BASE_WEIGHTS = {
  capacite:     30,
  maturite:     30,
  joignabilite: 40,
};

export const MULTIPLIER_VALUES = {
  ignorer:   0,
  normal:    1.0,
  prioriser: 2.0,
};

export const DEFAULT_PROFILE = {
  capacite:     'normal',
  maturite:     'normal',
  joignabilite: 'normal',
};

export const PRESETS = {
  chasse_volume: {
    label:   'Chasse au volume',
    icon:    'target',
    tooltip: 'Maximise le nombre de prospects joignables. Ideal pour un demarchage a grande echelle.',
    profile: { capacite: 'normal', maturite: 'ignorer',  joignabilite: 'prioriser' },
  },
  gros_tickets: {
    label:   'Gros tickets',
    icon:    'diamond',
    tooltip: 'Favorise les entreprises solides financierement. Moins de leads, mais mieux qualifies.',
    profile: { capacite: 'prioriser', maturite: 'normal', joignabilite: 'normal' },
  },
  terrain_cold_call: {
    label:   'Terrain / cold call',
    icon:    'phone',
    tooltip: "Priorise les prospects joignables par telephone. Ignore l'anciennete.",
    profile: { capacite: 'normal', maturite: 'ignorer',  joignabilite: 'prioriser' },
  },
};

export const DEFAULT_HOT_THRESHOLD  = 70;
export const DEFAULT_WARM_THRESHOLD = 40;
export const SCORE_HOT_THRESHOLD    = DEFAULT_HOT_THRESHOLD;
export const SCORE_WARM_THRESHOLD   = DEFAULT_WARM_THRESHOLD;

export const DEFAULT_OPTIONS = {
  filtres: { effectif_min: null, anciennete_min: null },
  seuils:  { hot: DEFAULT_HOT_THRESHOLD, warm: DEFAULT_WARM_THRESHOLD },
  geo:     { actif: false, departements_cibles: [], bonus: 10 },
};

export const EFFECTIF_ORDER = [
  'NN', '00', '01', '02', '03', '11', '12', '21', '22', '31', '32', '41', '42', '51', '52', '53',
];

// --- Axe 1 : Capacite ---

const EFFECTIF_PTS = { '03':50,'11':45,'02':35,'12':30,'01':20,'21':18,'22':15,'00':8,'NN':8 };

function getFormePoints(code) {
  if (!code) return 8;
  const c = String(code).trim();
  if (c.startsWith('1') || c.startsWith('9')) return 0;
  if (c === '5710' || c === '5720') return 22;
  if (c === '5499' || c === '5308') return 20;
  if (c === '5800' || c === '5815') return 18;
  if (c.startsWith('5')) return 10;
  return 5;
}

function scoreCapacite(entreprise) {
  let s = 0;
  const ep = EFFECTIF_PTS[entreprise.tranche_effectif];
  s += ep !== undefined ? ep : 10;
  s += getFormePoints(entreprise.nature_juridique);
  const ca = entreprise.ca;
  if (ca != null) {
    if (ca >= 500000) s += 25;
    else if (ca >= 100000) s += 15;
    else if (ca > 0) s += 5;
  }
  return Math.min(s, 100);
}

// --- Axe 3 : Maturite ---

function scoreMaturite(entreprise) {
  if (!entreprise.date_creation) return 50;
  const age = (Date.now() - new Date(entreprise.date_creation).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 1.5) return 35;
  if (age < 3)   return 65;
  if (age < 15)  return 100;
  return 55;
}

// --- Axe 4 : Joignabilite ---

function scoreJoignabilite(entreprise) {
  let s = 0;
  if (entreprise.dirigeant && entreprise.dirigeant.nom) s += 30;
  if (entreprise.telephone) s += 40;
  if (entreprise.email)     s += 30;
  return Math.min(s, 100);
}

// --- Renormalisation des poids ---
// Regle : poids_brut = BASE_WEIGHT * MULTIPLIER
// fraction = poids_brut / somme_totale
// Score = somme(sous_score * fraction) => reste sur 0-100

function calcWeights(profile) {
  const raw = {};
  let total = 0;
  for (const key of Object.keys(BASE_WEIGHTS)) {
    const mv = MULTIPLIER_VALUES[profile[key]];
    const mult = mv !== undefined ? mv : MULTIPLIER_VALUES.normal;
    raw[key] = BASE_WEIGHTS[key] * mult;
    total += raw[key];
  }
  if (total === 0) return null;
  const fracs = {};
  for (const key of Object.keys(raw)) {
    fracs[key] = raw[key] / total;
  }
  return fracs;
}

// --- Disqualification ---

function mkDQ(raison) {
  return { score:0, segment:'disqualifie', disqualifie:true, raison, details_par_axe:{}, poids_effectifs:{}, subscores:{} };
}

function mergeOpts(options) {
  const o = options || {};
  return {
    filtres: Object.assign({}, DEFAULT_OPTIONS.filtres, o.filtres || {}),
    seuils:  Object.assign({}, DEFAULT_OPTIONS.seuils,  o.seuils  || {}),
    geo:     Object.assign({}, DEFAULT_OPTIONS.geo,     o.geo     || {}),
  };
}

// --- Fonction principale ---

export function calculateScore(entreprise, profile, options) {
  const prof = profile || DEFAULT_PROFILE;
  const opts = mergeOpts(options);
  const seuils = opts.seuils;

  // Exclusions dures
  if (entreprise.etat_administratif === 'F') return mkDQ('Etablissement ferme (SIRENE)');

  if (opts.filtres.effectif_min) {
    const idx    = EFFECTIF_ORDER.indexOf(entreprise.tranche_effectif || '');
    const minIdx = EFFECTIF_ORDER.indexOf(opts.filtres.effectif_min);
    if (minIdx >= 0 && (idx < 0 || idx < minIdx)) return mkDQ('Effectif insuffisant (filtre dur)');
  }

  if (opts.filtres.anciennete_min != null && entreprise.date_creation) {
    const age = (Date.now() - new Date(entreprise.date_creation).getTime()) / (1000*60*60*24*365.25);
    if (age < opts.filtres.anciennete_min) return mkDQ('Entreprise trop recente (filtre dur)');
  }

  const hasPhone     = !!entreprise.telephone;
  const hasEmail     = !!entreprise.email;
  const hasDirigeant = !!(entreprise.dirigeant && entreprise.dirigeant.nom);
  if (!hasPhone && !hasEmail && !hasDirigeant) return mkDQ('Aucun contact identifie');

  // Sous-scores
  const details_par_axe = {
    capacite:     scoreCapacite(entreprise),
    maturite:     scoreMaturite(entreprise),
    joignabilite: scoreJoignabilite(entreprise),
  };

  const fracs = calcWeights(prof);

  const poids_effectifs = {};
  for (const key of Object.keys(BASE_WEIGHTS)) {
    poids_effectifs[key] = fracs ? Math.round(fracs[key] * 100) : 0;
  }

  let score = 0;
  if (fracs) {
    for (const key of Object.keys(BASE_WEIGHTS)) {
      score += details_par_axe[key] * fracs[key];
    }
    score = Math.round(score);
  }

  // Bonus geo
  if (opts.geo.actif && opts.geo.departements_cibles.length > 0) {
    const dept = entreprise.departement ||
      ((entreprise.siege && entreprise.siege.code_postal) || '').substring(0, 2) || '';
    if (opts.geo.departements_cibles.includes(dept)) {
      score = Math.min(score + opts.geo.bonus, 100);
    }
  }

  score = Math.min(Math.max(score, 0), 100);
  const segment = score >= seuils.hot ? 'hot' : score >= seuils.warm ? 'warm' : 'cold';

  return { score, segment, disqualifie:false, raison:null, details_par_axe, poids_effectifs, subscores:details_par_axe };
}

export function withScore(entreprise, profile, options) {
  const result = calculateScore(entreprise, profile || DEFAULT_PROFILE, options || {});
  return Object.assign({}, entreprise, {
    score:           result.score,
    segment:         result.segment,
    disqualifie:     result.disqualifie,
    raison_dq:       result.raison,
    subscores:       result.subscores,
    details_par_axe: result.details_par_axe,
    poids_effectifs: result.poids_effectifs,
  });
}

export function applyScoreFilter(results, filterKey) {
  if (filterKey === 'all')         return results;
  if (filterKey === 'disqualifie') return results.filter(function(r) { return r.disqualifie; });
  if (filterKey === 'hot')         return results.filter(function(r) { return !r.disqualifie && r.segment === 'hot'; });
  if (filterKey === 'warm')        return results.filter(function(r) { return !r.disqualifie && r.segment === 'warm'; });
  if (filterKey === 'cold')        return results.filter(function(r) { return !r.disqualifie && r.segment === 'cold'; });
  return results;
}

export function applyEnrichFilter(results, filterKey) {
  if (filterKey === 'all')   return results;
  if (filterKey === 'phone') return results.filter(function(r) { return !!r.telephone; });
  if (filterKey === 'email') return results.filter(function(r) { return !!r.email; });
  if (filterKey === 'both')  return results.filter(function(r) { return !!r.telephone && !!r.email; });
  return results;
}

export function applySort(results, field, direction) {
  return results.slice().sort(function(a, b) {
    const va = a[field] !== undefined ? a[field] : '';
    const vb = b[field] !== undefined ? b[field] : '';
    return direction === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });
}

export function getScoreCategory(score, seuils) {
  const hot  = (seuils && seuils.hot  != null) ? seuils.hot  : DEFAULT_HOT_THRESHOLD;
  const warm = (seuils && seuils.warm != null) ? seuils.warm : DEFAULT_WARM_THRESHOLD;
  if (score >= hot)  return 'hot';
  if (score >= warm) return 'warm';
  return 'cold';
}

export const SCORE_CATEGORY_LABELS = {
  hot:         'Chaud',
  warm:        'Tiede',
  cold:        'Froid',
  disqualifie: 'Exclu',
};

export const SCORE_CATEGORY_COLORS = {
  hot:         { badge: 'bg-red-100 text-red-700',    bar: 'bg-red-500'    },
  warm:        { badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  cold:        { badge: 'bg-green-100 text-green-700', bar: 'bg-green-500' },
  disqualifie: { badge: 'bg-slate-100 text-slate-500', bar: 'bg-slate-300' },
};
