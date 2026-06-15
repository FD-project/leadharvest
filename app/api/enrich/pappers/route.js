// Source Pappers supprimée — route désactivée
export async function POST() {
  return Response.json({ error: 'Source Pappers désactivée' }, { status: 410 });
}
