export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const nafCodes = searchParams.get("naf_codes"); // ex: "43.21A,43.22A"
  const departements = searchParams.get("departements"); // ex: "73,74"
  const tranches = searchParams.get("tranches"); // ex: "01,02,03"
  const page = searchParams.get("page") || "1";

  if (!nafCodes || !departements) {
    return Response.json(
      { error: "Paramètres manquants : naf_codes et departements sont requis" },
      { status: 400 }
    );
  }

  try {
    const results = [];
    const nafList = nafCodes.split(",").map((c) => c.trim());
    const deptList = departements.split(",").map((d) => d.trim());
    const trancheList = tranches ? tranches.split(",").map((t) => t.trim()) : [];

    // L'API ne supporte qu'un code NAF et un département par appel
    // On fait des appels pour chaque combinaison (limité aux premières combinaisons)
    const combinations = [];
    for (const naf of nafList.slice(0, 5)) {
      for (const dept of deptList.slice(0, 5)) {
        combinations.push({ naf, dept });
      }
    }

    const fetchPromises = combinations.map(async ({ naf, dept }) => {
      const params = new URLSearchParams({
        activite_principale: naf,
        departement: dept,
        etat_administratif: "A",
        per_page: "25",
        page: page,
      });

      const url = `https://recherche-entreprises.api.gouv.fr/search?${params}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`Erreur API pour NAF ${naf} / Dept ${dept}: ${res.status}`);
        return [];
      }

      const data = await res.json();
      return data.results || [];
    });

    const allResults = await Promise.all(fetchPromises);

    // Fusionner et dédupliquer par SIREN
    const seen = new Set();
    for (const batch of allResults) {
      for (const entreprise of batch) {
        if (!seen.has(entreprise.siren)) {
          seen.add(entreprise.siren);

          // Extraire les données utiles
          const siege = entreprise.siege || {};
          const dirigeants = entreprise.dirigeants || [];

          // Filtrer par tranche d'effectif si demandé
          const trancheEntreprise = siege.tranche_effectif_salarie || "";
          if (trancheList.length > 0 && !trancheList.includes(trancheEntreprise)) {
            continue;
          }

          const dirigeantPrincipal = dirigeants[0] || {};

          results.push({
            siren: entreprise.siren,
            nom: entreprise.nom_raison_sociale || entreprise.nom_complet || "",
            dirigeant: {
              prenom: dirigeantPrincipal.prenoms || "",
              nom: dirigeantPrincipal.nom || "",
              qualite: dirigeantPrincipal.qualite || "",
            },
            adresse: [
              siege.numero_voie,
              siege.type_voie,
              siege.libelle_voie,
              siege.code_postal,
              siege.libelle_commune,
            ]
              .filter(Boolean)
              .join(" "),
            code_postal: siege.code_postal || "",
            commune: siege.libelle_commune || "",
            naf_code: siege.activite_principale || "",
            naf_libelle: siege.libelle_activite_principale || "",
            tranche_effectif: siege.tranche_effectif_salarie || "",
            date_creation: entreprise.date_creation || "",
            latitude: siege.latitude || null,
            longitude: siege.longitude || null,
          });
        }
      }
    }

    return Response.json({
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("Erreur recherche entreprises:", error);
    return Response.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
