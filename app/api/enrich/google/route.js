export async function POST(request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Clé Google Maps non configurée" },
      { status: 500 }
    );
  }

  try {
    const { entreprises } = await request.json();

    if (!entreprises || !Array.isArray(entreprises)) {
      return Response.json({ error: "Format invalide" }, { status: 400 });
    }

    const results = await Promise.all(
      entreprises.map(async (entreprise) => {
        try {
          // Recherche Places par nom + ville
          const query = [entreprise.nom, entreprise.commune]
            .filter(Boolean)
            .join(" ");

          const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_phone_number,website,rating,user_ratings_total&key=${apiKey}`;

          const searchRes = await fetch(searchUrl);
          const searchData = await searchRes.json();

          if (
            searchData.status !== "OK" ||
            !searchData.candidates ||
            searchData.candidates.length === 0
          ) {
            return {
              siren: entreprise.siren,
              gmb_present: false,
              telephone: null,
              site_web: null,
              note_gmb: null,
            };
          }

          const place = searchData.candidates[0];

          // Récupérer les détails complets si on a un place_id
          if (place.place_id) {
            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website,rating,user_ratings_total&key=${apiKey}`;
            const detailRes = await fetch(detailUrl);
            const detailData = await detailRes.json();

            if (detailData.status === "OK" && detailData.result) {
              const detail = detailData.result;
              return {
                siren: entreprise.siren,
                gmb_present: true,
                telephone: detail.formatted_phone_number || null,
                site_web: detail.website || null,
                note_gmb: detail.rating || null,
                nb_avis: detail.user_ratings_total || 0,
              };
            }
          }

          return {
            siren: entreprise.siren,
            gmb_present: true,
            telephone: place.formatted_phone_number || null,
            site_web: place.website || null,
            note_gmb: place.rating || null,
          };
        } catch (err) {
          console.error(`Erreur Google Maps pour ${entreprise.siren}:`, err);
          return {
            siren: entreprise.siren,
            gmb_present: false,
            telephone: null,
            site_web: null,
            note_gmb: null,
            error: true,
          };
        }
      })
    );

    return Response.json({ results });
  } catch (error) {
    console.error("Erreur enrichissement Google Maps:", error);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
