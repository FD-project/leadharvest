import { PAPPERS_API_URL } from '@/lib/api';

export async function POST(request) {
  const apiKey = process.env.PAPPERS_API_KEY; // Optionnel

  const body = await request.json().catch(() => null);
  if (!body?.entreprises || !Array.isArray(body.entreprises)) {
    return Response.json({ error: 'Format invalide' }, { status: 400 });
  }
  if (body.entreprises.length > 10) {
    return Response.json({ error: 'Batch trop grand (max 10 par appel)' }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      body.entreprises.map((e) => enrichWithPappers(e, apiKey))
    );
    return Response.json({ results });
  } catch (error) {
    console.error('Erreur enrichissement Pappers:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_RESULT = (siren) => ({
  siren,
  pappers_present:   false,
  telephone_pappers: null,
  email:             null,
  forme_juridique:   null,
  capital:           null,
});

/**
 * Enrichit une entreprise via l'API Pappers.
 * `pappers_present` indique que l'entreprise est référencée dans Pappers
 * (distinct de "présence Pages Jaunes" — voir scoring).
 */
async function enrichWithPappers(entreprise, apiKey) {
  try {
    const params = new URLSearchParams({ siren: entreprise.siren });
    if (apiKey) params.set('api_token', apiKey);

    const res = await fetch(`${PAPPERS_API_URL}?${params}`);

    if (!res.ok) return EMPTY_RESULT(entreprise.siren);

    const data = await res.json();

    // Consolidation des contacts : siège en priorité, puis premier représentant
    const telephone =
      data.siege?.telephone         ??
      data.representants?.[0]?.telephone ??
      null;

    const email =
      data.siege?.email             ??
      data.representants?.[0]?.email ??
      null;

    return {
      siren:             entreprise.siren,
      pappers_present:   !!data.siren,
      telephone_pappers: telephone,
      email,
      forme_juridique:   data.forme_juridique ?? null,
      capital:           data.capital         ?? null,
    };
  } catch (err) {
    console.error(`Erreur Pappers pour SIREN ${entreprise.siren}:`, err);
    return { ...EMPTY_RESULT(entreprise.siren), error: true };
  }
}
