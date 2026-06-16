/**
 * Génère et télécharge un fichier CSV à partir d'une liste d'entreprises.
 * BOM UTF-8 inclus pour compatibilité Excel.
 *
 * @param {Array<Object>} entreprises
 * @param {{ division?: string, departements?: string[] }} searchMeta  — infos de la recherche pour le nom de fichier
 */
export function exportEntreprisesCSV(entreprises, searchMeta = {}) {
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
    e.telephone                        ?? '',
    e.email                            ?? '',   // collecté par scraping site web uniquement
    e.site_web                         ?? '',
    e.gmb_present ? 'Oui' : 'Non',
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

  const blob = new Blob(['﻿' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  // Nom de fichier : [dept(s)]-[division]-[ddmmyyyy].csv
  // ex : 73-28-16062026.csv  /  73-74-28-16062026.csv (multi-depts)
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const dateStr = `${dd}${mm}${yyyy}`;

  const { division, departements } = searchMeta;
  let filename;
  if (division && departements && departements.length > 0) {
    const deptsStr = departements.join('-');
    filename = `${deptsStr}-${division}-${dateStr}.csv`;
  } else {
    filename = `leadharvest_export_${now.toISOString().slice(0, 10)}.csv`;
  }

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
  // Délai avant révocation : le navigateur lit le blob de façon asynchrone
  // et une révocation immédiate peut annuler le téléchargement sur certains navigateurs.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
