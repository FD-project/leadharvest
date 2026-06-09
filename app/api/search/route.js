export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const nafCodes = searchParams.get("naf_codes");
  const departements = searchParams.get("departements");
  const tranches = searchParams.get("tranches");
  const perPage = parseInt(searchParams.get("per_page") || "25");
  const page = parseInt(searchParams.get("page") || "1");

  if (!nafCodes || !departements) {
    return Response.json(
      { error: "Paramètres manquants : naf_codes et departements sont requis" },
      { status: 400 }
    );
  }

  const nafList = nafCodes.split(",").map((c) => c.trim()).filter(Boolean);
  const deptList = departements.split(",").map((d) => d.trim()).filter(Boolean);
  const trancheList = tranches ? tranches.split(",").map((t) => t.trim()).filter(Boolean) : [];

  // Helper : fetch avec retry
  async function fetchWithRetry(url, retries = 3, delay = 500) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) return res;
        if (attempt < retries - 1) await new Promise(r => setTimeout(r, delay * (attempt + 1)));
      } catch (err) {
        if (attempt < retries - 1) await new Promise(r => setTimeout(r, delay * (attempt + 1)));
        else throw err;
      }
    }
    return null;
  }

  try {
    // Collecte TOUS les résultats depuis l'API SIRENE
    // On fait les appels séquentiellement pour avoir des résultats stables
    const allResults = new Map(); // siren → entreprise (dédupliqué)

    for (const naf of nafList) {
      for (const dept of deptList) {
        // On pagine l'API SIRENE pour récupérer plus de résultats
        let apiPage = 1;
        let hasMore = true;

        while (hasMore && allResults.size < 1000) {
          const params = new URLSearchParams({
            activite_principale: naf,
            departement: dept,
            etat_administratif: "A",
            per_page: "25",
            page: String(apiPage),
          });

          const url = `https://recherche-entreprises.api.gouv.fr/search?${params}`;

          try {
            const res = await fetchWithRetry(url);
            if (!res) { hasMore = false; break; }

            const data = await res.json();
            const results = data.results || [];

            for (const entreprise of results) {
              if (!allResults.has(entreprise.siren)) {
                const siege = entreprise.siege || {};
                const dirigeants = entreprise.dirigeants || [];
                const trancheEntreprise = siege.tranche_effectif_salarie || "";

                // Filtre tranche effectif
                if (trancheList.length > 0 && !trancheList.includes(trancheEntreprise)) {
                  continue;
                }

                const dirigeantPrincipal = dirigeants[0] || {};

                allResults.set(entreprise.siren, {
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
                  ].filter(Boolean).join(" "),
                  code_postal: siege.code_postal || "",
                  commune: siege.libelle_commune || "",
                  naf_code: siege.activite_principale || "",
                  naf_libelle: siege.libelle_activite_principale || "",
                  tranche_effectif: trancheEntreprise,
                  date_creation: entreprise.date_creation || "",
                  latitude: siege.latitude || null,
                  longitude: siege.longitude || null,
                });
              }
            }

            // Continuer la pagination si on a eu 25 résultats
            if (results.length < 25) {
              hasMore = false;
            } else {
              apiPage++;
            }

            // Petite pause pour ne pas surcharger l'API
            await new Promise(r => setTimeout(r, 100));

          } catch (err) {
            console.error(`Erreur pour NAF ${naf} / Dept ${dept} page ${apiPage}:`, err);
            hasMore = false;
          }
        }
      }
    }

    // Convertir en tableau et trier par nom
    const allArray = Array.from(allResults.values());
    const total = allArray.length;

    // Pagination côté serveur
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const pageResults = allArray.slice(startIndex, endIndex);

    return Response.json({
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
      results: pageResults,
    });

  } catch (error) {
    console.error("Erreur recherche entreprises:", error);
    return Response.json({ error: "Erreur lors de la recherche" }, { status: 500 });
  }
}
