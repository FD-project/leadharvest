'use client';

import { useState } from 'react';
import { TRANCHES_EFFECTIF } from './data/naf';

function ScoreBadge({ score }) {
  const color = score >= 70
    ? 'bg-red-100 text-red-700'
    : score >= 40
    ? 'bg-amber-100 text-amber-700'
    : 'bg-green-100 text-green-700';

  const label = score >= 70 ? 'Chaud' : score >= 40 ? 'Tiède' : 'Froid';

  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
          {label} {score}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function getTrancheLabel(code) {
  const t = TRANCHES_EFFECTIF.find(t => t.code === code);
  return t ? t.label : code || '—';
}

function calculateScore(entreprise) {
  let score = 0;
  if (!entreprise.site_web) score += 30;
  if (!entreprise.gmb_present) score += 25;
  if (!entreprise.pj_present) score += 15;

  const tranchesCibles = ['00', '01', '02', '03', '11', '12'];
  if (tranchesCibles.includes(entreprise.tranche_effectif)) score += 20;

  if (entreprise.date_creation) {
    const creation = new Date(entreprise.date_creation);
    const maintenant = new Date();
    const diffAns = (maintenant - creation) / (1000 * 60 * 60 * 24 * 365);
    if (diffAns < 3) score += 10;
  }

  return Math.min(score, 100);
}

export default function ResultsTable({ results, isLoading }) {
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-amber-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-slate-600 font-medium">Recherche des entreprises en cours...</p>
          <p className="text-slate-400 text-sm">Interrogation de la base SIRENE</p>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-slate-600 font-medium">Aucun résultat pour l'instant</p>
        <p className="text-slate-400 text-sm mt-1">Configurez vos filtres et lancez une recherche</p>
      </div>
    );
  }

  // Calcul du score pour chaque entreprise
  const enrichedResults = results.map(r => ({
    ...r,
    score: calculateScore(r),
  }));

  // Tri
  const sorted = [...enrichedResults].sort((a, b) => {
    const va = a[sortField] ?? '';
    const vb = b[sortField] ?? '';
    if (sortDir === 'asc') return va > vb ? 1 : -1;
    return va < vb ? 1 : -1;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-amber-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header tableau */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">
            {results.length} entreprise{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Triées par score de maturité digitale décroissant</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(sorted)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            📥 CSV
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800" onClick={() => handleSort('nom')}>
                Entreprise <SortIcon field="nom" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Dirigeant
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Adresse
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800" onClick={() => handleSort('naf_code')}>
                NAF <SortIcon field="naf_code" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800" onClick={() => handleSort('tranche_effectif')}>
                Effectif <SortIcon field="tranche_effectif" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Téléphone
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Web / GMB / PJ
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800" onClick={() => handleSort('score')}>
                Score <SortIcon field="score" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((e, i) => (
              <tr key={e.siren || i} className="hover:bg-slate-50 transition-colors">
                {/* Entreprise */}
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 max-w-[180px] truncate" title={e.nom}>
                    {e.nom || '—'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{e.siren}</div>
                </td>

                {/* Dirigeant */}
                <td className="px-4 py-3">
                  {e.dirigeant?.nom ? (
                    <div>
                      <div className="text-slate-800 font-medium">
                        {[e.dirigeant.prenom, e.dirigeant.nom].filter(Boolean).join(' ')}
                      </div>
                      {e.dirigeant.qualite && (
                        <div className="text-xs text-slate-400">{e.dirigeant.qualite}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* Adresse */}
                <td className="px-4 py-3">
                  <div className="text-slate-600 text-xs max-w-[160px]" title={e.adresse}>
                    {e.adresse || '—'}
                  </div>
                </td>

                {/* NAF */}
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                    {e.naf_code}
                  </span>
                  {e.naf_libelle && (
                    <div className="text-xs text-slate-400 mt-0.5 max-w-[120px] truncate" title={e.naf_libelle}>
                      {e.naf_libelle}
                    </div>
                  )}
                </td>

                {/* Effectif */}
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-600">
                    {getTrancheLabel(e.tranche_effectif)}
                  </span>
                </td>

                {/* Téléphone */}
                <td className="px-4 py-3">
                  {e.telephone ? (
                    <a href={`tel:${e.telephone}`} className="text-blue-600 hover:underline text-xs font-mono">
                      {e.telephone}
                    </a>
                  ) : (
                    <span className="text-slate-300 text-xs">Non enrichi</span>
                  )}
                </td>

                {/* Web / GMB / PJ */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {e.site_web ? (
                      <a href={e.site_web} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs truncate max-w-[120px]" title={e.site_web}>
                        🌐 Site web
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">🌐 Pas de site</span>
                    )}
                    <span className={`text-xs ${e.gmb_present ? 'text-green-600' : 'text-slate-300'}`}>
                      {e.gmb_present ? '📍 GMB ✓' : '📍 Pas de GMB'}
                    </span>
                    <span className={`text-xs ${e.pj_present ? 'text-green-600' : 'text-slate-300'}`}>
                      {e.pj_present ? '📒 PJ ✓' : '📒 Pas sur PJ'}
                    </span>
                  </div>
                </td>

                {/* Score */}
                <td className="px-4 py-3">
                  <ScoreBadge score={e.score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exportCSV(data) {
  const headers = [
    'Nom entreprise', 'SIREN', 'Prénom dirigeant', 'Nom dirigeant', 'Qualité dirigeant',
    'Adresse', 'Code NAF', 'Libellé NAF', 'Tranche effectif',
    'Téléphone', 'Site web', 'GMB', 'Pages Jaunes', 'Score maturité'
  ];

  const rows = data.map(e => [
    e.nom, e.siren,
    e.dirigeant?.prenom || '', e.dirigeant?.nom || '', e.dirigeant?.qualite || '',
    e.adresse, e.naf_code, e.naf_libelle, e.tranche_effectif,
    e.telephone || '', e.site_web || '',
    e.gmb_present ? 'Oui' : 'Non',
    e.pj_present ? 'Oui' : 'Non',
    e.score
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leadharvest_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
