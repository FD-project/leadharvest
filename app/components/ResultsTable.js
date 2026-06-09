'use client';

import { useState } from 'react';
import { TRANCHES_EFFECTIF } from './data/naf';

function calculateScore(entreprise) {
  let score = 0;
  if (!entreprise.site_web) score += 30;
  if (!entreprise.gmb_present) score += 25;
  if (!entreprise.pj_present) score += 15;
  const tranchesCibles = ['NN', '00', '01', '02', '03', '11', '12'];
  if (tranchesCibles.includes(entreprise.tranche_effectif)) score += 20;
  if (entreprise.date_creation) {
    const diffAns = (new Date() - new Date(entreprise.date_creation)) / (1000 * 60 * 60 * 24 * 365);
    if (diffAns < 3) score += 10;
  }
  return Math.min(score, 100);
}

function ScoreBadge({ score, enriched }) {
  const color = score >= 70 ? 'bg-red-100 text-red-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  const bar = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-green-500';
  const label = score >= 70 ? 'Chaud' : score >= 40 ? 'Tiède' : 'Froid';
  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <div className="flex items-center gap-1">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{label} {score}</span>
        {enriched && <span title="Enrichi">✨</span>}
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-700 ${bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function EnrichModal({ count, onClose, onLaunch }) {
  const [sources, setSources] = useState({ google: true, pappers: true });
  const toggle = (key) => setSources(prev => ({ ...prev, [key]: !prev[key] }));
  const selectedCount = Object.values(sources).filter(Boolean).length;
  const estimatedCost = sources.google ? (count * 0.034).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Enrichir les données</h2>
              <p className="text-slate-500 text-sm mt-0.5">{count} entreprise{count > 1 ? 's' : ''} sélectionnée{count > 1 ? 's' : ''}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center">✕</button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sources d'enrichissement</p>
          <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${sources.google ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
            <input type="checkbox" checked={sources.google} onChange={() => toggle('google')} className="mt-0.5 accent-blue-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">Google Maps Places</span>
                <span className="text-xs text-slate-500">~{estimatedCost}€</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Téléphone · Site web · Fiche GMB · Note</p>
            </div>
          </label>
          <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${sources.pappers ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
            <input type="checkbox" checked={sources.pappers} onChange={() => toggle('pappers')} className="mt-0.5 accent-blue-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">Pappers.fr</span>
                <span className="text-xs text-green-600 font-medium">Gratuit</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Email · Téléphone · Forme juridique</p>
            </div>
          </label>
        </div>
        {sources.google && (
          <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <p className="text-xs text-amber-700">💡 Coût estimé : <strong>~{estimatedCost}€</strong> pour {count} entreprise{count > 1 ? 's' : ''}</p>
          </div>
        )}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Annuler</button>
          <button onClick={() => onLaunch(sources)} disabled={selectedCount === 0} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedCount > 0 ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            Lancer l'enrichissement
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressModal({ current, total, source }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="text-4xl mb-4">⚡</div>
        <h2 className="font-bold text-slate-900 text-lg mb-1">Enrichissement en cours</h2>
        <p className="text-slate-500 text-sm mb-6">{source === 'google' ? '🗺️ Google Maps' : '📋 Pappers.fr'} — {current}/{total}</p>
        <div className="w-full bg-slate-200 rounded-full h-3 mb-3">
          <div className="h-3 rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm font-semibold text-slate-700">{pct}%</p>
      </div>
    </div>
  );
}

function getTrancheLabel(code) {
  const t = TRANCHES_EFFECTIF.find(t => t.code === code);
  return t ? t.label : code || '—';
}

function exportCSV(data) {
  const headers = ['Nom', 'SIREN', 'Prénom dirigeant', 'Nom dirigeant', 'Qualité', 'Adresse', 'NAF', 'Libellé NAF', 'Effectif', 'Téléphone', 'Email', 'Site web', 'GMB', 'Pappers', 'Note GMB', 'Score'];
  const rows = data.map(e => [e.nom, e.siren, e.dirigeant?.prenom || '', e.dirigeant?.nom || '', e.dirigeant?.qualite || '', e.adresse, e.naf_code, e.naf_libelle, e.tranche_effectif, e.telephone || e.telephone_pappers || '', e.email || '', e.site_web || '', e.gmb_present ? 'Oui' : 'Non', e.pj_present ? 'Oui' : 'Non', e.note_gmb || '', e.score || 0]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leadharvest_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ResultsTable({ results: pageResults, allResults, isLoading, onResultsUpdate }) {
  const [selected, setSelected] = useState(new Set());
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [filterScore, setFilterScore] = useState('all');
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(null);

  // Enrichir les données dans allResults et propager vers page.js
  const handleEnrich = async (sources) => {
    setShowEnrichModal(false);
    const toEnrich = allResults.filter(r => selected.has(r.siren));
    let updated = [...allResults];

    const applyResults = (enrichResults) => {
      enrichResults.forEach(enriched => {
        updated = updated.map(r =>
          r.siren === enriched.siren
            ? { ...r, ...enriched, enriched: true, score: calculateScore({ ...r, ...enriched }) }
            : r
        );
      });
    };

    const BATCH = 5;

    if (sources.google) {
      for (let i = 0; i < toEnrich.length; i += BATCH) {
        setEnrichProgress({ current: i, total: toEnrich.length, source: 'google' });
        try {
          const res = await fetch('/api/enrich/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entreprises: toEnrich.slice(i, i + BATCH) }),
          });
          const data = await res.json();
          if (data.results) applyResults(data.results);
        } catch (err) { console.error('Google error:', err); }
        setEnrichProgress({ current: Math.min(i + BATCH, toEnrich.length), total: toEnrich.length, source: 'google' });
        onResultsUpdate([...updated]);
      }
    }

    if (sources.pappers) {
      for (let i = 0; i < toEnrich.length; i += BATCH) {
        setEnrichProgress({ current: i, total: toEnrich.length, source: 'pappers' });
        try {
          const res = await fetch('/api/enrich/pappers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entreprises: toEnrich.slice(i, i + BATCH) }),
          });
          const data = await res.json();
          if (data.results) applyResults(data.results);
        } catch (err) { console.error('Pappers error:', err); }
        setEnrichProgress({ current: Math.min(i + BATCH, toEnrich.length), total: toEnrich.length, source: 'pappers' });
        onResultsUpdate([...updated]);
      }
    }

    setEnrichProgress(null);
    setSelected(new Set());
  };

  const toggleSelect = (siren) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(siren) ? next.delete(siren) : next.add(siren);
      return next;
    });
  };

  const toggleAll = () => {
    // Sélectionner/désélectionner TOUTE la page visible
    const pageRSirens = new Set(pageResults.map(r => r.siren));
    const allPageSelected = pageResults.every(r => selected.has(r.siren));
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageRSirens.forEach(s => next.delete(s));
      } else {
        pageRSirens.forEach(s => next.add(s));
      }
      return next;
    });
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => sortField !== field
    ? <span className="text-slate-300 ml-1">↕</span>
    : <span className="text-amber-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;

  // Enrichir les résultats de la page avec les scores
  const enrichedPage = pageResults.map(r => ({
    ...r,
    score: r.score ?? calculateScore(r),
  }));

  const filtered = enrichedPage.filter(r => {
    if (filterScore === 'chaud') return r.score >= 70;
    if (filterScore === 'tiede') return r.score >= 40 && r.score < 70;
    if (filterScore === 'froid') return r.score < 40;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortField] ?? '';
    const vb = b[sortField] ?? '';
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const allPageSelected = pageResults.length > 0 && pageResults.every(r => selected.has(r.siren));
  const somePageSelected = pageResults.some(r => selected.has(r.siren)) && !allPageSelected;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <svg className="animate-spin h-10 w-10 text-amber-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-600 font-medium">Recherche en cours...</p>
        <p className="text-slate-400 text-sm mt-1">Récupération de toutes les entreprises, merci de patienter</p>
      </div>
    );
  }

  if (!pageResults || pageResults.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-slate-600 font-medium">Aucun résultat</p>
        <p className="text-slate-400 text-sm mt-1">Modifiez vos filtres et relancez la recherche</p>
      </div>
    );
  }

  return (
    <>
      {showEnrichModal && <EnrichModal count={selected.size} onClose={() => setShowEnrichModal(false)} onLaunch={handleEnrich} />}
      {enrichProgress && <ProgressModal current={enrichProgress.current} total={enrichProgress.total} source={enrichProgress.source} />}

      <div className="bg-white rounded-t-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">
                {allResults.length} entreprise{allResults.length > 1 ? 's' : ''} trouvée{allResults.length > 1 ? 's' : ''}
                {filtered.length !== pageResults.length && <span className="text-slate-400 font-normal"> · {filtered.length} sur cette page</span>}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {selected.size > 0 ? `${selected.size} sélectionnée${selected.size > 1 ? 's' : ''} (toutes pages)` : 'Triées par score décroissant'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtres score */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                {[{ key: 'all', label: 'Tous' }, { key: 'chaud', label: '🔥 Chaud' }, { key: 'tiede', label: '🟡 Tiède' }, { key: 'froid', label: '🟢 Froid' }].map(f => (
                  <button key={f.key} onClick={() => setFilterScore(f.key)} className={`px-3 py-1.5 transition-colors ${filterScore === f.key ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{f.label}</button>
                ))}
              </div>
              {selected.size > 0 && (
                <button onClick={() => setShowEnrichModal(true)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow transition-all">
                  ✨ Enrichir {selected.size} entreprise{selected.size > 1 ? 's' : ''}
                </button>
              )}
              <button onClick={() => exportCSV(allResults)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                📥 Export CSV ({allResults.length})
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allPageSelected} ref={el => { if (el) el.indeterminate = somePageSelected; }} onChange={toggleAll} className="accent-amber-500 cursor-pointer w-4 h-4" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort('nom')}>Entreprise <SortIcon field="nom" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dirigeant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Adresse</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort('naf_code')}>NAF <SortIcon field="naf_code" /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Effectif</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Téléphone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Web / GMB</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort('score')}>Score <SortIcon field="score" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((e, i) => (
                <tr key={e.siren || i} onClick={() => toggleSelect(e.siren)} className={`cursor-pointer transition-colors ${selected.has(e.siren) ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(e.siren)} onChange={() => toggleSelect(e.siren)} className="accent-amber-500 cursor-pointer w-4 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 max-w-[180px] truncate" title={e.nom}>{e.nom || '—'}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{e.siren}</div>
                  </td>
                  <td className="px-4 py-3">
                    {e.dirigeant?.nom ? (
                      <div>
                        <div className="text-slate-800 text-xs font-medium">{[e.dirigeant.prenom, e.dirigeant.nom].filter(Boolean).join(' ')}</div>
                        {e.dirigeant.qualite && <div className="text-xs text-slate-400">{e.dirigeant.qualite}</div>}
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><div className="text-slate-600 text-xs max-w-[150px] truncate" title={e.adresse}>{e.adresse || '—'}</div></td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{e.naf_code}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-600">{getTrancheLabel(e.tranche_effectif)}</span></td>
                  <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                    {(e.telephone || e.telephone_pappers) ? (
                      <a href={`tel:${e.telephone || e.telephone_pappers}`} className="text-blue-600 hover:underline text-xs font-mono">{e.telephone || e.telephone_pappers}</a>
                    ) : <span className="text-slate-300 text-xs">{e.enriched ? '—' : 'Non enrichi'}</span>}
                  </td>
                  <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                    {e.email ? (
                      <a href={`mailto:${e.email}`} className="text-blue-600 hover:underline text-xs truncate max-w-[140px] block">{e.email}</a>
                    ) : <span className="text-slate-300 text-xs">{e.enriched ? '—' : 'Non enrichi'}</span>}
                  </td>
                  <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                    <div className="flex flex-col gap-1">
                      {e.site_web ? (
                        <a href={e.site_web} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs truncate max-w-[120px]">🌐 Site web</a>
                      ) : <span className={`text-xs ${e.enriched ? 'text-slate-400' : 'text-slate-300'}`}>🌐 {e.enriched ? 'Pas de site' : '—'}</span>}
                      <span className={`text-xs ${e.gmb_present ? 'text-green-600' : e.enriched ? 'text-slate-400' : 'text-slate-300'}`}>
                        {e.gmb_present ? '📍 GMB ✓' : e.enriched ? '📍 Pas de GMB' : '📍 —'}
                      </span>
                      {e.note_gmb && <span className="text-xs text-amber-600">⭐ {e.note_gmb}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><ScoreBadge score={e.score} enriched={e.enriched} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer sélection */}
        {selected.size > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
            <span className="text-sm text-amber-800 font-medium">{selected.size} entreprise{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}</span>
            <button onClick={() => setShowEnrichModal(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow">✨ Enrichir la sélection</button>
          </div>
        )}
      </div>
    </>
  );
}
