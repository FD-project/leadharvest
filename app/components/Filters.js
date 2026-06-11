'use client';

import { useState, useEffect } from 'react';
import { NAF_DIVISIONS, getCodesForDivision, TRANCHES_EFFECTIF, DEPARTEMENTS } from './data/naf';

export default function Filters({ onSearch, isLoading }) {
  const [division, setDivision] = useState('');
  const [nafCodes, setNafCodes] = useState([]);
  const [selectedNaf, setSelectedNaf] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedTranches, setSelectedTranches] = useState([]);

  // Quand la division change, on charge les codes NAF correspondants
  useEffect(() => {
    if (division) {
      const codes = getCodesForDivision(division);
      setNafCodes(codes);
      setSelectedNaf(codes.map(c => c.code)); // tout coché par défaut
    } else {
      setNafCodes([]);
      setSelectedNaf([]);
    }
  }, [division]);

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

  const handleSearch = () => {
    if (!division || selectedNaf.length === 0 || selectedDepts.length === 0) return;
    onSearch({
      nafCodes: selectedNaf,
      departements: selectedDepts,
      tranches: selectedTranches,
    });
  };

  const isValid = division && selectedNaf.length > 0 && selectedDepts.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">

      {/* Filtre 1 — Division NAF */}
      <div>
        <label className="block text-sm font-semibold text-navy mb-2">
          Secteur d'activité (Division NAF)
        </label>
        <select
          value={division}
          onChange={e => setDivision(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">— Sélectionnez un secteur —</option>
          {NAF_DIVISIONS.map(d => (
            <option key={d.code} value={d.code}>
              {d.code} — {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filtre 2 — Codes NAF */}
      {nafCodes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-navy">
              Codes NAF ({selectedNaf.length}/{nafCodes.length} sélectionnés)
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

      {/* Filtre 4 — Tranches d'effectif */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-navy">
            Tranche(s) d'effectif ({selectedTranches.length === 0 ? 'toutes' : selectedTranches.length + ' sélectionnée(s)'})
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

      {!isValid && (
        <p className="text-xs text-slate-400 text-center">
          Sélectionnez un secteur et au moins un département pour lancer la recherche
        </p>
      )}
    </div>
  );
}
