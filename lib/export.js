/**
 * Génère et télécharge un fichier CSV à partir d'une liste d'entreprises.
 * BOM UTF-8 inclus pour compatibilité Excel.
 *
 * @param {Array<Object>} entreprises
 */
export function exportEntreprisesCSV(entreprises) {
  const headers = [
    'Nom entreprise',
    'SIREN',
    'Prénom dirigeant',
    'Nom dirigeant',
    'Qualité dirigeant',
    'Adresse',
    'Code NAF',
    'Libellé NAF',
    'Tranche effectif',
    'Forme juridique',
    'CA (€)',
    'Téléphone',
    'Email',
    'Site web',
    'Fiche GMB',
    'Présence Pappers',
    'Score global',
    'Sous-score Adéquation',
    'Sous-score Capacité',
    'Sous-score Joignabilité',
  ];

  const rows = entreprises.map((e) => [
    e.nom                              ?? '',
    e.siren                            ?? '',
    e.dirigeant?.prenom                ?? '',
    e.dirigeant?.nom                   ?? '',
    e.dirigeant?.qualite               ?? '',
    e.adresse                          ?? '',
    e.naf_code                         ?? '',
    e.naf_libelle                      ?? '',
    e.tranche_effectif                 ?? '',
    e.nature_juridique                 ?? '',
    e.ca                               ?? '',
    e.telephone ?? e.telephone_pappers ?? '',
    e.email                            ?? '',
    e.site_web                         ?? '',
    e.gmb_present ? 'Oui' : 'Non',
    e.pappers_present ? 'Oui' : 'Non',
    e.score                            ?? 0,
    e.subscores?.adequation            ?? '',
    e.subscores?.capacite              ?? '',
    e.subscores?.joignabilite          ?? '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const filename = `leadharvest_export_${new Date().toISOString().slice(0, 10)}.csv`;

  triggerDownload(blob, filename);
}

/**
 * Déclenche le téléchargement d'un Blob dans le navigateur.
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
