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
  if (body.entreprises.length > 10) {
    return Response.json({ error: 'Batch trop grand (max 10 par appel)' }, { status: 400 });
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
 *
 * Appel 1 — findplacefromtext → récupère place_id (Basic Data).
 *   Note : formatted_phone_number et website ne sont PAS disponibles dans
 *   findplacefromtext, seulement dans place/details (Contact Data).
 *
 * Appel 2 — place/details → récupère téléphone, site, note, nb avis.
 */
async function enrichWithGoogleMaps(entreprise, apiKey) {
  try {
    const query = [entreprise.nom, entreprise.commune].filter(Boolean).join(' ');

    // Appel 1 : trouver le place_id
    const findParams = new URLSearchParams({
      input:     query,
      inputtype: 'textquery',
      fields:    'place_id',
      key:       apiKey,
    });

    const findRes  = await fetch(`${GOOGLE_PLACES_FIND_URL}?${findParams}`);
    const findData = await findRes.json();

    const placeId = findData.candidates?.[0]?.place_id;
    if (!placeId || findData.status !== 'OK') {
      return EMPTY_RESULT(entreprise.siren);
    }

    // Appel 2 : récupérer les données de contact (Contact Data + Basic Data)
    const detailParams = new URLSearchParams({
      place_id: placeId,
      fields:   'formatted_phone_number,website,rating,user_ratings_total',
      key:      apiKey,
    });

    const detailRes  = await fetch(`${GOOGLE_PLACES_DETAIL_URL}?${detailParams}`);
    const detailData = await detailRes.json();

    if (detailData.status !== 'OK' || !detailData.result) {
      // Fiche GMB existe mais pas de détails récupérables
      return { ...EMPTY_RESULT(entreprise.siren), gmb_present: true };
    }

    return buildGoogleResult(entreprise.siren, detailData.result);
  } catch (err) {
    console.error(`Erreur Google Maps pour SIREN ${entreprise.siren}:`, err);
    return { ...EMPTY_RESULT(entreprise.siren), error: true };
  }
}

/**
 * Construit le résultat d'enrichissement Google Maps depuis une réponse Places.
 * gmb_present = true dès qu'on a trouvé un place_id.
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
