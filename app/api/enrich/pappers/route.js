export async function POST(request) {
  const apiKey = process.env.PAPPERS_API_KEY;

  try {
    const { entreprises } = await request.json();

    if (!entreprises || !Array.isArray(entreprises)) {
      return Response.json({ error: "Format invalide" }, { status: 400 });
    }

    const results = await Promise.all(
      entreprises.map(async (entreprise) => {
        try {
          // Pappers API - recherche par SIREN
          // Sans clé API : données limitées mais disponibles
          const url = apiKey
            ? `https://api.pappers.fr/v2/entreprise?siren=${entreprise.siren}&api_token=${apiKey}`
            : `https://api.pappers.fr/v2/entreprise?siren=${entreprise.siren}`;

          const res = await fetch(url);

          if (!res.ok) {
            return {
              siren: entreprise.siren,
              pj_present: false,
              telephone_pappers: null,
              email: null,
            };
          }

          const data = await res.json();

          // Extraire les contacts disponibles
          const telephone =
            data.siege?.telephone ||
            data.representants?.[0]?.telephone ||
            null;

          const email =
            data.siege?.email || data.representants?.[0]?.email || null;

          return {
            siren: entreprise.siren,
            pj_present: !!data.siren, // présent dans Pappers = présence annuaire
            telephone_pappers: telephone,
            email: email,
            forme_juridique: data.forme_juridique || null,
            capital: data.capital || null,
          };
        } catch (err) {
          console.error(`Erreur Pappers pour ${entreprise.siren}:`, err);
          return {
            siren: entreprise.siren,
            pj_present: false,
            telephone_pappers: null,
            email: null,
            error: true,
          };
        }
      })
    );

    return Response.json({ results });
  } catch (error) {
    console.error("Erreur enrichissement Pappers:", error);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
