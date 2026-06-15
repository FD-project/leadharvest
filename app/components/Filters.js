'use client';

import { useState, useEffect } from 'react';
import { NAF_DIVISIONS, getCodesForDivision, TRANCHES_EFFECTIF, DEPARTEMENTS } from './data/naf';

// Seuils de volumétrie (combinaisons NAF × département — cas théorique max)
// En pratique, SIRENE_MAX_RESULTS=1000 côté serveur arrête l'itération bien avant.
const WARN_THRESHOLD  = 500;   // avertissement : recherche potentiellement longue
const BLOCK_THRESHOLD = 2000;  // blocage : volume vraiment excessif (rare)

export default function Filters({ onSearch, isLoading }) {
  const [selectedDivisions, setSelectedDivisions] = useState([]);
  const [nafCodes, setNafCodes] = useState([]);
  const [selectedNaf, setSelectedNaf] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedTranches, setSelectedTranches] = useState([]);

  // Quand les divisions changent, on agrège les codes NAF de toutes les divisions cochées
  useEffect(() => {
    if (selectedDivisions.length > 0) {
      // Fusionner les codes de toutes les divisions sélectionnées (dédupliquer par code)
      const allCodes = selectedDivisions.flatMap(div => getCodesForDivision(div));
      const unique = Array.from(new Map(allCodes.map(c => [c.code, c])).values());
      // Trier par code NAF
      unique.sort((a, b) => a.code.localeCompare(b.code));
      setNafCodes(unique);
      setSelectedNaf(unique.map(c => c.code)); // tout coché par défaut
    } else {
      setNafCodes([]);
      setSelectedNaf([]);
    }
  }, [selectedDivisions]);

  const toggleItem = (list, setList, value) => {
    if (list.includes(value)) {
      setList(list.filter(v => v !== value));
    } else {
      setList([...list, value]);
    }
  };

  const toggleAll = (list, setList, allValues) => {
    if (list.length === allValues.length) {
      setList([]);
    } else {
      setList(allValues);
    }
  };

  // Estimation du nombre de requêtes SIRENE qui seront émises
  const estimatedCalls = selectedNaf.length * selectedDepts.length;
  const isOverLimit = estimatedCalls > BLOCK_THRESHOLD;
  const isWarning   = estimatedCalls > WARN_THRESHOLD && !isOverLimit;

  const handleSearch = () => {
    if (selectedDivisions.length === 0 || selectedNaf.length === 0 || selectedDepts.length === 0 || isOverLimit) return;
    onSearch({
      nafCodes: selectedNaf,
      departements: selectedDepts,
      tranches: selectedTranches,
    });
  };

  const isValid = selectedDivisions.length > 0 && selectedNaf.length > 0 && selectedDepts.length > 0 && !isOverLimit;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">

      {/* Zone scrollable des filtres */}
      <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>

      {/* Filtre 1 — Secteur d'activité */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-navy">
            Secteur(s) d'activité ({selectedDivisions.length}/{NAF_DIVISIONS.length} sélectionné{selectedDivisions.length > 1 ? 's' : ''})
          </label>
          <button
            onClick={() => toggleAll(selectedDivisions, setSelectedDivisions, NAF_DIVISIONS.map(d => d.code))}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedDivisions.length === NAF_DIVISIONS.length ? 'Tout décocher' : 'Tout cocher'}
          </button>
        </div>
        <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
          {NAF_DIVISIONS.map(d => (
            <label key={d.code} className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
              <input
                type="checkbox"
                checked={selectedDivisions.includes(d.code)}
                onChange={() => toggleItem(selectedDivisions, setSelectedDivisions, d.code)}
                className="mt-0.5 accent-blue-600"
              />
              <span className="text-xs text-slate-700">
                <span className="font-mono font-semibold text-slate-900">{d.code}</span>
                {' — '}{d.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtre 2 — Codes d'activité */}
      {nafCodes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-navy">
              Codes d'activité ({selectedNaf.length}/{nafCodes.length} sélectionnés)
            </label>
            <button
              onClick={() => toggleAll(selectedNaf, setSelectedNaf, nafCodes.map(c => c.code))}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedNaf.length === nafCodes.length ? 'Tout décocher' : 'Tout cocher'}
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
            {nafCodes.map(c => (
              <label key={c.code} className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
                <input
                  type="checkbox"
                  checked={selectedNaf.includes(c.code)}
                  onChange={() => toggleItem(selectedNaf, setSelectedNaf, c.code)}
                  className="mt-0.5 accent-blue-600"
                />
                <span className="text-xs text-slate-700">
                  <span className="font-mono font-semibold text-slate-900">{c.code}</span>
                  {' — '}{c.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filtre 3 — Départements */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-navy">
            Département(s) ({selectedDepts.length} sélectionné{selectedDepts.length > 1 ? 's' : ''})
          </label>
          <button
            onClick={() => toggleAll(selectedDepts, setSelectedDepts, DEPARTEMENTS.map(d => d.code))}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedDepts.length === DEPARTEMENTS.length ? 'Tout décocher' : 'Tout cocher'}
          </button>
        </div>
        <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
          {DEPARTEMENTS.map(d => (
            <label key={d.code} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
              <input
                type="checkbox"
                checked={selectedDepts.includes(d.code)}
                onChange={() => toggleItem(selectedDepts, setSelectedDepts, d.code)}
                className="accent-blue-600"
              />
              <span className="text-xs text-slate-700">{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtre 4 — Taille d'entreprise */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-navy">
            Taille d'entreprise ({selectedTranches.length === 0 ? 'toutes' : selectedTranches.length + ' sélectionnée(s)'})
          </label>
          <button
            onClick={() => toggleAll(selectedTranches, setSelectedTranches, TRANCHES_EFFECTIF.map(t => t.code))}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedTranches.length === TRANCHES_EFFECTIF.length ? 'Tout décocher' : 'Tout cocher'}
          </button>
        </div>
        <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
          {TRANCHES_EFFECTIF.map(t => (
            <label key={t.code || 'null'} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
              <input
                type="checkbox"
                checked={selectedTranches.includes(t.code)}
                onChange={() => toggleItem(selectedTranches, setSelectedTranches, t.code)}
                className="accent-blue-600"
              />
              <span className="text-xs text-slate-700">{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      </div>{/* fin zone scrollable */}

      {/* Section bouton — toujours visible en bas */}
      <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-white rounded-b-xl space-y-2">

        {/* Indicateur volumétrie */}
        {estimatedCalls > 0 && (
          <div className={`rounded-lg px-3 py-2 text-xs flex items-start gap-2 ${
            isOverLimit
              ? 'bg-red-50 border border-red-200 text-red-700'
              : isWarning
              ? 'bg-amber-50 border border-amber-200 text-amber-700'
              : 'bg-slate-50 border border-slate-200 text-slate-500'
          }`}>
            <span className="text-base leading-none mt-0.5">
              {isOverLimit ? '🚫' : isWarning ? '⚠️' : 'ℹ️'}
            </span>
            <div>
              <span className="font-semibold">
                {estimatedCalls} combinaison{estimatedCalls > 1 ? 's' : ''} max
              </span>
              {' '}({selectedNaf.length} code{selectedNaf.length > 1 ? 's' : ''} × {selectedDepts.length} dept.)
              {' — '}limités à 1 000 résultats.
              {isOverLimit && <p className="mt-1">Volume trop important — réduisez la sélection.</p>}
              {isWarning && <p className="mt-1">La recherche peut prendre quelques minutes.</p>}
            </div>
          </div>
        )}

        {/* Bouton recherche */}
        <button
          onClick={handleSearch}
          disabled={!isValid || isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all duration-200 ${
            isValid && !isLoading
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Recherche en cours...
            </span>
          ) : (
            `🔍 Rechercher des prospects${selectedDepts.length > 0 ? ` (${selectedDepts.length} dept.)` : ''}`
          )}
        </button>

        {!isValid && !isOverLimit && (
          <p className="text-xs text-slate-400 text-center">
            Sélectionnez au moins un secteur et un département
          </p>
        )}
      </div>
    </div>
  );
}
