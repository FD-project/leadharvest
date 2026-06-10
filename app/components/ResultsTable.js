'use client';

import { useState } from 'react';
import { TRANCHES_EFFECTIF } from './data/naf';
import {
  getScoreCategory,
  SCORE_CATEGORY_LABELS,
  SCORE_CATEGORY_COLORS,
} from '@/lib/scoring';
import { exportEntreprisesCSV } from '@/lib/export';
import { ENRICH_ROUTES, ENRICH_BATCH_SIZE, postJSON } from '@/lib/api';

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ScoreBadge({ score, enriched }) {
  const category = getScoreCategory(score);
  const { badge, bar } = SCORE_CATEGORY_COLORS[category];
  const label = SCORE_CATEGORY_LABELS[category];

  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <div className="flex items-center gap-1">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>
          {label} {score}
        </span>
        {enriched && <span title="Données enrichies">✨</span>}
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 ${bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function EnrichModal({ count, onClose, onLaunch }) {
  const [sources, setSources] = useState({ google: true, pappers: true });

  const toggle = (key) => setSources((prev) => ({ ...prev, [key]: !prev[key] }));
  const hasSourceSelected = Object.values(sources).some(Boolean);
  const estimatedCost = sources.google ? (count * 0.034).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Enrichir les données</h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {count} entreprise{count > 1 ? 's' : ''} sélectionnée{count > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Sources d'enrichissement
          </p>

          <SourceOption
            checked={sources.google}
            onChange={() => toggle('google')}
            label="Google Maps Places"
            badge={`~${estimatedCost}€`}
            description="Téléphone · Site web · Fiche GMB · Note"
          />

          <SourceOption
            checked={sources.pappers}
            onChange={() => toggle('pappers')}
            label="Pappers.fr"
            badge="Gratuit"
            badgeColor="text-green-600"
            description="Email · Téléphone · Forme juridique"
          />
        </div>

        {sources.google && (
          <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <p className="text-xs text-amber-700">
              💡 Coût estimé : <strong>~{estimatedCost}€</strong> pour {count}{' '}
              entreprise{count > 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onLaunch(sources)}
            disabled={!hasSourceSelected}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              hasSourceSelected
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Lancer l'enrichissement
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceOption({ checked, onChange, label, badge, badgeColor = 'text-slate-500', description }) {
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
        checked ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-blue-600"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800 text-sm">{label}</span>
          <span className={`text-xs font-medium ${badgeColor}`}>{badge}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

function ProgressModal({ current, total, source }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const sourceLabel = source === 'google' ? '🗺️ Google Maps' : '📋 Pappers.fr';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="text-4xl mb-4">⚡</div>
        <h2 className="font-bold text-slate-900 text-lg mb-1">Enrichissement en cours</h2>
        <p className="text-slate-500 text-sm mb-6">
          {sourceLabel} — {current}/{total}
        </p>
        <div className="w-full bg-slate-200 rounded-full h-3 mb-3">
          <div
            className="h-3 rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm font-semibold text-slate-700">{pct}%</p>
      </div>
    </div>
  );
}

function EnrichErrorBanner({ message, onDismiss }) {
  return (
    <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
      <p className="text-xs text-red-700">⚠️ {message}</p>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-sm ml-4">✕</button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_FILTER_OPTIONS = [
  { key: 'all',  label: 'Tous' },
  { key: 'hot',  label: '🔥 Chaud' },
  { key: 'warm', label: '🟡 Tiède' },
  { key: 'cold', label: '🟢 Froid' },
];

const ENRICH_FILTER_OPTIONS = [
  { key: 'all',   label: 'Tous' },
  { key: 'phone', label: '📞 Tél.' },
  { key: 'email', label: '✉️ Email' },
  { key: 'both',  label: '📞 + ✉️ Les deux' },
];

function getTrancheLabel(code) {
  return TRANCHES_EFFECTIF.find((t) => t.code === code)?.label ?? code ?? '—';
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ResultsTable({
  results: pageResults,
  allResults,
  filteredTotal,
  isLoading,
  onResultsUpdate,
  // Sort & filtres contrôlés par page.js (s'appliquent sur allResults)
  sortField,
  sortDirection,
  scoreFilter,
  enrichFilter,
  onSort,
  onScoreFilter,
  onEnrichFilter,
}) {
  const [selected,        setSelected]        = useState(new Set());
  const [showEnrichModal, setShowEnrichModal]  = useState(false);
  const [enrichProgress,  setEnrichProgress]   = useState(null);
  const [enrichError,     setEnrichError]      = useState(null);

  // ── Enrichissement ──────────────────────────────────────────────────────────

  const handleEnrich = async (sources) => {
    setShowEnrichModal(false);
    setEnrichError(null);

    const toEnrich = allResults.filter((r) => selected.has(r.siren));
    let updated    = [...allResults];
    let hasError   = false;

    const applyEnrichResults = (enrichResults) => {
      for (const enriched of enrichResults) {
        updated = updated.map((r) =>
          r.siren === enriched.siren
            ? { ...r, ...enriched, enriched: true, score: calculateScore({ ...r, ...enriched }) }
            : r
        );
      }
    };

    const runSource = async (sourceKey, routeUrl) => {
      for (let i = 0; i < toEnrich.length; i += ENRICH_BATCH_SIZE) {
        setEnrichProgress({ current: i, total: toEnrich.length, source: sourceKey });
        const batch = toEnrich.slice(i, i + ENRICH_BATCH_SIZE);
        try {
          const data = await postJSON(routeUrl, { entreprises: batch });
          if (data.results) applyEnrichResults(data.results);
        } catch (err) {
          console.error(`Enrichissement ${sourceKey} échoué:`, err);
          hasError = true;
        }
        setEnrichProgress({
          current: Math.min(i + ENRICH_BATCH_SIZE, toEnrich.length),
          total: toEnrich.length,
          source: sourceKey,
        });
        onResultsUpdate([...updated]);
      }
    };

    if (sources.google)  await runSource('google',  ENRICH_ROUTES.google);
    if (sources.pappers) await runSource('pappers', ENRICH_ROUTES.pappers);

    setEnrichProgress(null);
    setSelected(new Set());

    if (hasError) {
      setEnrichError('Certaines entreprises n\'ont pas pu être enrichies. Les autres ont été mises à jour.');
    }
  };

  // ── Sélection ───────────────────────────────────────────────────────────────

  const toggleSelect = (siren) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(siren) ? next.delete(siren) : next.add(siren);
      return next;
    });
  };

  const togglePageSelection = () => {
    const pageSirens   = new Set(pageResults.map((r) => r.siren));
    const allSelected  = pageResults.every((r) => selected.has(r.siren));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageSirens.forEach((s) => next.delete(s));
      } else {
        pageSirens.forEach((s) => next.add(s));
      }
      return next;
    });
  };

  // ── Tri ─────────────────────────────────────────────────────────────────────

  const SortIcon = ({ field }) =>
    sortField !== field ? (
      <span className="text-slate-300 ml-1">↕</span>
    ) : (
      <span className="text-amber-500 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
    );

  // ── Données affichées ────────────────────────────────────────────────────────
  // pageResults est déjà filtré + trié + paginé par page.js

  const allPageSelected  = pageResults.length > 0 && pageResults.every((r) => selected.has(r.siren));
  const somePageSelected = pageResults.some((r) => selected.has(r.siren)) && !allPageSelected;

  // ── États vides ──────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingState />;
  if (!pageResults?.length) return <EmptyState />;

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <>
      {showEnrichModal && (
        <EnrichModal
          count={selected.size}
          onClose={() => setShowEnrichModal(false)}
          onLaunch={handleEnrich}
        />
      )}
      {enrichProgress && (
        <ProgressModal
          current={enrichProgress.current}
          total={enrichProgress.total}
          source={enrichProgress.source}
        />
      )}

      <div className="bg-white rounded-t-xl border border-slate-200 shadow-sm overflow-hidden">
        <TableHeader
          total={allResults.length}
          filteredTotal={filteredTotal}
          selectedCount={selected.size}
          scoreFilter={scoreFilter}
          enrichFilter={enrichFilter}
          onScoreFilter={onScoreFilter}
          onEnrichFilter={onEnrichFilter}
          onEnrich={() => setShowEnrichModal(true)}
          onExport={() => exportEntreprisesCSV(allResults)}
        />

        {enrichError && (
          <EnrichErrorBanner
            message={enrichError}
            onDismiss={() => setEnrichError(null)}
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                    onChange={togglePageSelection}
                    className="accent-amber-500 cursor-pointer w-4 h-4"
                  />
                </th>
                <SortableHeader label="Entreprise" field="nom"      onSort={onSort} SortIcon={SortIcon} />
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dirigeant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Adresse</th>
                <SortableHeader label="NAF"        field="naf_code" onSort={onSort} SortIcon={SortIcon} />
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Effectif</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Téléphone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Web / GMB</th>
                <SortableHeader label="Score"      field="score"    onSort={onSort} SortIcon={SortIcon} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageResults.map((e, i) => (
                <EntrepriseRow
                  key={e.siren || i}
                  entreprise={e}
                  selected={selected.has(e.siren)}
                  onToggle={() => toggleSelect(e.siren)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {selected.size > 0 && (
          <SelectionFooter
            count={selected.size}
            onEnrich={() => setShowEnrichModal(true)}
          />
        )}
      </div>
    </>
  );
}

// ─── Sous-composants tableau ──────────────────────────────────────────────────

function TableHeader({ total, filteredTotal, selectedCount, scoreFilter, enrichFilter, onScoreFilter, onEnrichFilter, onEnrich, onExport }) {
  const isFiltered = filteredTotal !== total;
  return (
    <div className="px-6 py-4 border-b border-slate-100 space-y-3">
      {/* Ligne 1 : compteur + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">
            {isFiltered
              ? <>{filteredTotal} résultat{filteredTotal > 1 ? 's' : ''} <span className="text-slate-400 font-normal">sur {total} entreprises</span></>
              : <>{total} entreprise{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''}</>
            }
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {selectedCount > 0
              ? `${selectedCount} sélectionnée${selectedCount > 1 ? 's' : ''} (toutes pages)`
              : 'Triées par score décroissant'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCount > 0 && (
            <button
              onClick={onEnrich}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow transition-all"
            >
              ✨ Enrichir {selectedCount} entreprise{selectedCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            📥 Export CSV ({total})
          </button>
        </div>
      </div>

      {/* Ligne 2 : filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium">Score</span>
          <ScoreFilterBar value={scoreFilter} onChange={onScoreFilter} />
        </div>
        <div className="w-px h-4 bg-slate-200" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium">Contact</span>
          <EnrichFilterBar value={enrichFilter} onChange={onEnrichFilter} />
        </div>
      </div>
    </div>
  );
}

function FilterBar({ options, value, onChange }) {
  return (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
      {options.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-3 py-1.5 transition-colors ${
            value === f.key ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function ScoreFilterBar({ value, onChange }) {
  return <FilterBar options={SCORE_FILTER_OPTIONS} value={value} onChange={onChange} />;
}

function EnrichFilterBar({ value, onChange }) {
  return <FilterBar options={ENRICH_FILTER_OPTIONS} value={value} onChange={onChange} />;
}

function SortableHeader({ label, field, onSort, SortIcon }) {
  return (
    <th
      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800"
      onClick={() => onSort(field)}
    >
      {label} <SortIcon field={field} />
    </th>
  );
}

function EntrepriseRow({ entreprise: e, selected, onToggle }) {
  const telephone = e.telephone ?? e.telephone_pappers;

  return (
    <tr
      onClick={onToggle}
      className={`cursor-pointer transition-colors ${
        selected ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'
      }`}
    >
      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="accent-amber-500 cursor-pointer w-4 h-4"
        />
      </td>

      <td className="px-4 py-3">
        <div className="font-medium text-slate-900 max-w-[180px] truncate" title={e.nom}>
          {e.nom || '—'}
        </div>
        <div className="text-xs text-slate-400 font-mono mt-0.5">{e.siren}</div>
      </td>

      <td className="px-4 py-3">
        {e.dirigeant?.nom ? (
          <div>
            <div className="text-slate-800 text-xs font-medium">
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

      <td className="px-4 py-3">
        <div className="text-slate-600 text-xs max-w-[150px] truncate" title={e.adresse}>
          {e.adresse || '—'}
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
          {e.naf_code}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-xs text-slate-600">{getTrancheLabel(e.tranche_effectif)}</span>
      </td>

      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
        {telephone ? (
          <a href={`tel:${telephone}`} className="text-blue-600 hover:underline text-xs font-mono">
            {telephone}
          </a>
        ) : (
          <span className="text-slate-300 text-xs">{e.enriched ? '—' : 'Non enrichi'}</span>
        )}
      </td>

      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
        {e.email ? (
          <a
            href={`mailto:${e.email}`}
            className="text-blue-600 hover:underline text-xs truncate max-w-[140px] block"
          >
            {e.email}
          </a>
        ) : (
          <span className="text-slate-300 text-xs">{e.enriched ? '—' : 'Non enrichi'}</span>
        )}
      </td>

      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex flex-col gap-1">
          {e.site_web ? (
            <a
              href={e.site_web}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs truncate max-w-[120px]"
            >
              🌐 Site web
            </a>
          ) : (
            <span className={`text-xs ${e.enriched ? 'text-slate-400' : 'text-slate-300'}`}>
              🌐 {e.enriched ? 'Pas de site' : '—'}
            </span>
          )}
          <span className={`text-xs ${e.gmb_present ? 'text-green-600' : e.enriched ? 'text-slate-400' : 'text-slate-300'}`}>
            {e.gmb_present ? '📍 GMB ✓' : e.enriched ? '📍 Pas de GMB' : '📍 —'}
          </span>
          {e.note_gmb && (
            <span className="text-xs text-amber-600">⭐ {e.note_gmb}</span>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        <ScoreBadge score={e.score} enriched={e.enriched} />
      </td>
    </tr>
  );
}

function SelectionFooter({ count, onEnrich }) {
  return (
    <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
      <span className="text-sm text-amber-800 font-medium">
        {count} entreprise{count > 1 ? 's' : ''} sélectionnée{count > 1 ? 's' : ''}
      </span>
      <button
        onClick={onEnrich}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow"
      >
        ✨ Enrichir la sélection
      </button>
    </div>
  );
}

function LoadingState() {
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

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
      <div className="text-4xl mb-3">🎯</div>
      <p className="text-slate-600 font-medium">Aucun résultat</p>
      <p className="text-slate-400 text-sm mt-1">Modifiez vos filtres et relancez la recherche</p>
    </div>
  );
}
