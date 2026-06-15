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
    // Quota dépassé ou clé invalide — signaler explicitement au client
    if (error.message?.includes('OVER_QUERY_LIMIT')) {
      return Response.json(
        { error: 'Quota Google Maps dépassé — réessayez dans quelques secondes' },
        { status: 429 }
      );
    }
    if (error.message?.includes('REQUEST_DENIED')) {
      return Response.json(
        { error: 'Clé Google Maps invalide ou restreinte' },
        { status: 503 }
      );
    }
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_RESULT = (siren) => ({
  siren,
  gmb_present: false,
  telephone:   null,
  site_web:    null,
});

/**
 * Enrichit une entreprise via Google Maps Places.
 *
 * Appel 1 — findplacefromtext → récupère place_id (Basic Data).
 *   Note : formatted_phone_number et website ne sont PAS disponibles dans
 *   findplacefromtext, seulement dans place/details (Contact Data).
 *
 * Appel 2 — place/details → récupère téléphone et site web (Contact Data uniquement).
 *   rating/user_ratings_total exclus → évite la facturation Atmosphere Data (-62% coût).
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

    // Quota dépassé ou clé invalide : lever une erreur pour interrompre le batch
    if (findData.status === 'OVER_QUERY_LIMIT') {
      throw new Error('OVER_QUERY_LIMIT');
    }
    if (findData.status === 'REQUEST_DENIED') {
      throw new Error('REQUEST_DENIED — vérifiez la clé GOOGLE_MAPS_API_KEY');
    }

    if (!placeId || findData.status !== 'OK') {
      return { ...EMPTY_RESULT(entreprise.siren), gmb_absent: true };
    }

    // Appel 2 : récupérer les données de contact (Contact Data + Basic Data)
    const detailParams = new URLSearchParams({
      place_id: placeId,
      fields:   'formatted_phone_number,website',
      key:      apiKey,
    });

    const detailRes  = await fetch(`${GOOGLE_PLACES_DETAIL_URL}?${detailParams}`);
    const detailData = await detailRes.json();

    if (detailData.status === 'OVER_QUERY_LIMIT') {
      throw new Error('OVER_QUERY_LIMIT');
    }

    if (detailData.status !== 'OK' || !detailData.result) {
      // Fiche GMB trouvée mais pas de détails de contact disponibles
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
  };
}
