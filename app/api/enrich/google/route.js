import {
  GOOGLE_PLACES_FIND_URL,
  GOOGLE_PLACES_DETAIL_URL,
} from '@/lib/api';

export async function POST(request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'Clé Google Maps non configurée' },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.entreprises || !Array.isArray(body.entreprises)) {
    return Response.json({ error: 'Format invalide' }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      body.entreprises.map((e) => enrichWithGoogleMaps(e, apiKey))
    );
    return Response.json({ results });
  } catch (error) {
    console.error('Erreur enrichissement Google Maps:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_RESULT = (siren) => ({
  siren,
  gmb_present: false,
  telephone:   null,
  site_web:    null,
  note_gmb:    null,
  nb_avis:     0,
});

/**
 * Enrichit une entreprise via Google Maps Places.
 * Un seul appel si `findplacefromtext` retourne les champs nécessaires,
 * sinon un second appel `place/details` pour compléter.
 */
async function enrichWithGoogleMaps(entreprise, apiKey) {
  try {
    const query = [entreprise.nom, entreprise.commune].filter(Boolean).join(' ');

    // Champs demandés directement dans findplacefromtext pour éviter un 2e appel
    const findParams = new URLSearchParams({
      input:      query,
      inputtype:  'textquery',
      fields:     'place_id,formatted_phone_number,website,rating,user_ratings_total',
      key:        apiKey,
    });

    const findRes  = await fetch(`${GOOGLE_PLACES_FIND_URL}?${findParams}`);
    const findData = await findRes.json();

    const candidate = findData.candidates?.[0];
    if (!candidate || findData.status !== 'OK') {
      return EMPTY_RESULT(entreprise.siren);
    }

    // Si les champs de contact sont déjà présents, pas besoin d'un 2e appel
    if (candidate.formatted_phone_number || candidate.website) {
      return buildGoogleResult(entreprise.siren, candidate);
    }

    // Sinon, appel details pour compléter (place_id requis)
    if (!candidate.place_id) {
      return { ...EMPTY_RESULT(entreprise.siren), gmb_present: true };
    }

    const detailParams = new URLSearchParams({
      place_id: candidate.place_id,
      fields:   'formatted_phone_number,website,rating,user_ratings_total',
      key:      apiKey,
    });

    const detailRes  = await fetch(`${GOOGLE_PLACES_DETAIL_URL}?${detailParams}`);
    const detailData = await detailRes.json();

    if (detailData.status !== 'OK' || !detailData.result) {
      return { ...EMPTY_RESULT(entreprise.siren), gmb_present: true };
    }

    return buildGoogleResult(entreprise.siren, detailData.result, true);
  } catch (err) {
    console.error(`Erreur Google Maps pour SIREN ${entreprise.siren}:`, err);
    return { ...EMPTY_RESULT(entreprise.siren), error: true };
  }
}

/**
 * Construit le résultat d'enrichissement Google Maps depuis une réponse Places.
 */
function buildGoogleResult(siren, placeData, gmb_present = true) {
  return {
    siren,
    gmb_present,
    telephone: placeData.formatted_phone_number ?? null,
    site_web:  placeData.website                ?? null,
    note_gmb:  placeData.rating                 ?? null,
    nb_avis:   placeData.user_ratings_total      ?? 0,
  };
}
