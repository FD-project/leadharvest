import {
  SIRENE_API_URL,
  SIRENE_PAGE_SIZE,
  SIRENE_MAX_RESULTS,
  SIRENE_PAGE_DELAY_MS,
  fetchWithRetry,
  sleep,
} from '@/lib/api';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const nafCodes   = searchParams.get('naf_codes');
  const departements = searchParams.get('departements');
  const tranches   = searchParams.get('tranches');

  if (!nafCodes || !departements) {
    return Response.json(
      { error: 'Paramètres manquants : naf_codes et departements sont requis' },
      { status: 400 }
    );
  }

  const nafList     = nafCodes.split(',').map((c) => c.trim()).filter(Boolean);
  const deptList    = departements.split(',').map((d) => d.trim()).filter(Boolean);
  const trancheList = tranches
    ? tranches.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  // Validation des inputs contre des patterns stricts
  const VALID_NAF_RE  = /^\d{4}[A-Z]$/;
  const VALID_DEPT_RE = /^\d{2,3}$/;

  if (!nafList.every((c) => VALID_NAF_RE.test(c))) {
    return Response.json({ error: 'Code NAF invalide' }, { status: 400 });
  }
  if (!deptList.every((d) => VALID_DEPT_RE.test(d))) {
    return Response.json({ error: 'Département invalide' }, { status: 400 });
  }

  // Concurrence maximale : 5 paires NAF × département en parallèle.
  // Divise le temps de réponse par ~5 par rapport aux boucles séquentielles
  // tout en respectant le throttle SIRENE par paire.
  const CONCURRENCY = 5;

  try {
    const collected = new Map();
    const pairs = nafList.flatMap((naf) => deptList.map((dept) => ({ naf, dept })));

    for (let i = 0; i < pairs.length; i += CONCURRENCY) {
      if (collected.size >= SIRENE_MAX_RESULTS) break;
      const chunk = pairs.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(({ naf, dept }) =>
          collectEntreprises({ naf, dept, trancheList, collected })
        )
      );
    }

    const results = Array.from(collected.values());
    return Response.json({
      total:  results.length,
      capped: results.length >= SIRENE_MAX_RESULTS,
      results,
    });
  } catch (error) {
    console.error('Erreur recherche SIRENE:', error);
    return Response.json({ error: 'Erreur lors de la recherche' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collecte toutes les pages d'une combinaison NAF × Département
 * et les insère dans la Map `collected`.
 */
async function collectEntreprises({ naf, dept, trancheList, collected }) {
  let apiPage = 1;
  let hasMore = true;

  while (hasMore && collected.size < SIRENE_MAX_RESULTS) {
    const url = buildSireneUrl({ naf, dept, page: apiPage });

    try {
      const res = await fetchWithRetry(url);
      if (!res) break;

      const data    = await res.json();
      const results = data.results ?? [];

      for (const raw of results) {
        if (collected.has(raw.siren)) continue;

        const entreprise = normalizeEntreprise(raw);

        // Filtre strict : le code NAF du siège doit correspondre au code demandé.
        // L'API peut renvoyer des résultats "proches" dont le NAF siège diffère
        // du filtre activite_principale appliqué au niveau entreprise.
        const matchesNaf =
          entreprise.naf_code === naf ||
          entreprise.naf_code.replace('.', '') === naf.replace('.', '');

        const matchesTranche =
          trancheList.length === 0 ||
          trancheList.includes(entreprise.tranche_effectif);

        if (matchesNaf && matchesTranche) {
          collected.set(entreprise.siren, entreprise);
        }
      }

      hasMore = results.length === SIRENE_PAGE_SIZE;
      apiPage++;

      await sleep(SIRENE_PAGE_DELAY_MS);
    } catch (err) {
      console.error(`Erreur SIRENE NAF=${naf} Dept=${dept} page=${apiPage}:`, err);
      break;
    }
  }
}

/**
 * Construit l'URL de requête vers l'API SIRENE.
 */
function buildSireneUrl({ naf, dept, page }) {
  const params = new URLSearchParams({
    activite_principale:       naf,
    departement:               dept,
    etat_administratif:        'A',
    per_page:                  String(SIRENE_PAGE_SIZE),
    page:                      String(page),
  });
  return `${SIRENE_API_URL}?${params}`;
}

/**
 * Normalise une entrée brute de l'API SIRENE en objet entreprise.
 * Garantit que tous les champs attendus sont présents.
 */
function normalizeEntreprise(raw) {
  const siege      = raw.siege       ?? {};
  const dirigeants = raw.dirigeants  ?? [];
  const dirigeant  = dirigeants[0]   ?? {};

  // CA depuis la dernière année financière disponible dans SIRENE
  const finances   = raw.finances    ?? {};
  const latestYear = Object.keys(finances).sort().pop();
  const latestFin  = latestYear ? finances[latestYear] : {};

  return {
    siren:           raw.siren ?? '',
    nom:             raw.nom_raison_sociale ?? raw.nom_complet ?? '',
    dirigeant: {
      prenom:  dirigeant.prenoms ?? '',
      nom:     dirigeant.nom     ?? '',
      qualite: dirigeant.qualite ?? '',
    },
    adresse: [
      siege.numero_voie,
      siege.type_voie,
      siege.libelle_voie,
      siege.code_postal,
      siege.libelle_commune,
    ].filter(Boolean).join(' '),
    code_postal:      siege.code_postal                 ?? '',
    commune:          siege.libelle_commune             ?? '',
    naf_code:         siege.activite_principale         ?? '',
    naf_libelle:      siege.libelle_activite_principale ?? '',
    tranche_effectif: siege.tranche_effectif_salarie    ?? '',
    date_creation:    raw.date_creation                 ?? '',
    // Données financières & juridiques — scoring v2 (disponibles avant enrichissement)
    nature_juridique: raw.nature_juridique              ?? '',
    ca:               latestFin.ca                      ?? null,
    resultat_net:     latestFin.resultat_net             ?? null,
    latitude:         siege.latitude                    ?? null,
    longitude:        siege.longitude                   ?? null,
  };
}
