'use client';

import { useState } from 'react';
import {
  DEFAULT_PROFILE,
  DEFAULT_OPTIONS,
  PRESETS,
  EFFECTIF_ORDER,
  MULTIPLIER_VALUES,
} from '@/lib/scoring';

export { DEFAULT_PROFILE };

// ─── Configuration des 4 axes ─────────────────────────────────────────────────

const DIMENSIONS = [
  {
    key:  'adequation',
    label: 'Adéquation',
    icon:  '🎯',
    hint:  'Pertinence du secteur d\'activité (code NAF)',
    tooltips: {
      ignorer:   'Ce critère ne compte pas dans la note. Les points sont répartis sur les autres axes.',
      normal:    'Prend en compte la pertinence du secteur d\'activité de l\'entreprise.',
      prioriser: 'Le secteur d\'activité pèsera deux fois plus lourd dans la note finale.',
    },
  },
  {
    key:  'capacite',
    label: 'Capacité',
    icon:  '💰',
    hint:  'Effectif · Forme juridique · CA',
    tooltips: {
      ignorer:   'La taille et les finances de l\'entreprise ne comptent pas dans la note.',
      normal:    'Prend en compte l\'effectif et la capacité financière de l\'entreprise.',
      prioriser: 'L\'effectif et les finances pèsent deux fois plus lourd dans la note finale.',
    },
  },
  {
    key:  'maturite',
    label: 'Maturité',
    icon:  '📅',
    hint:  'Ancienneté — zone idéale 3-15 ans',
    tooltips: {
      ignorer:   'L\'ancienneté de l\'entreprise ne compte pas dans la note.',
      normal:    'Favorise les entreprises créées depuis 3 à 15 ans — stables sans être figées.',
      prioriser: 'L\'ancienneté de l\'entreprise pèsera deux fois plus lourd dans la note finale.',
    },
  },
  {
    key:  'joignabilite',
    label: 'Joignabilité',
    icon:  '📞',
    hint:  'Dirigeant identifié · Téléphone · Email',
    tooltips: {
      ignorer:   'La capacité à contacter le prospect ne compte pas dans la note.',
      normal:    'Prend en compte la présence d\'un dirigeant, d\'un téléphone et d\'un email.',
      prioriser: 'Les coordonnées de contact pèsent deux fois plus lourd dans la note finale.',
    },
  },
];

const LEVELS = [
  { key: 'ignorer',   label: 'Ignorer'   },
  { key: 'normal',    label: 'Normal'    },
  { key: 'prioriser', label: 'Prioriser' },
];

// ─── Libelles des tranches d'effectif pour le filtre dur ─────────────────────

const EFFECTIF_LABELS = {
  NN:  'Non employeur',
  '00': '0 salarié',
  '01': '1-2 salariés',
  '02': '3-5 salariés',
  '03': '6-9 salariés',
  '11': '10-19 salariés',
  '12': '20-49 salariés',
  '21': '50-99 salariés',
  '22': '100-199 salariés',
  '31': '200-249 salariés',
  '32': '250-499 salariés',
};

const EFFECTIF_FILTER_OPTIONS = EFFECTIF_ORDER.slice(0, 12); // NN -> 32

// ─── Tooltip universel ────────────────────────────────────────────────────────

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 leading-snug shadow-xl pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}

// ─── Popup d'alerte (>1 axe ignore) ──────────────────────────────────────────

function AlertModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4">
        <div className="text-3xl mb-3 text-center">⚠️</div>
        <h3 className="font-bold text-slate-800 text-base mb-2 text-center">
          Score peu fiable
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Vous ignorez plus d'un axe. Le score repose alors sur trop peu de critères
          et perd en fiabilité — par exemple, ignorer Capacité et Adéquation fait
          reposer la note presque entièrement sur la Joignabilité.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
          >
            Continuer quand même
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ScoringProfile({ profile, options, onChange, onOptionsChange }) {
  const [showAlert, setShowAlert] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(null);

  const [openSection, setOpenSection] = useState(null); // 'filtres' | 'naf' | 'seuils' | 'geo'

  const opts = options || DEFAULT_OPTIONS;

  // Nombre d'axes sur "ignorer"
  const countIgnored = Object.values(profile).filter((v) => v === 'ignorer').length;

  // Changement d'un axe individuel
  const handleAxisChange = (key, value) => {
    const newProfile = { ...profile, [key]: value };
    const newIgnored = Object.values(newProfile).filter((v) => v === 'ignorer').length;
    if (newIgnored > 1) {
      setPendingProfile(newProfile);
      setShowAlert(true);
    } else {
      onChange(newProfile);
    }
  };

  // Application d'un preset (sans declencher l'alerte)
  const applyPreset = (presetKey) => {
    onChange({ ...PRESETS[presetKey].profile });
  };

  // Confirmation alerte
  const confirmAlert = () => {
    if (pendingProfile) onChange(pendingProfile);
    setPendingProfile(null);
    setShowAlert(false);
  };

  const cancelAlert = () => {
    setPendingProfile(null);
    setShowAlert(false);
  };

  // Reset complet
  const isDefault =
    Object.keys(DEFAULT_PROFILE).every((k) => profile[k] === 'normal') &&
    JSON.stringify(opts) === JSON.stringify(DEFAULT_OPTIONS);

  const handleReset = () => {
    onChange({ ...DEFAULT_PROFILE });
    onOptionsChange?.({ ...DEFAULT_OPTIONS });
  };

  // Helpers options
  const setFiltre = (key, value) =>
    onOptionsChange?.({ ...opts, filtres: { ...opts.filtres, [key]: value } });
  const setSeuil = (key, value) =>
    onOptionsChange?.({ ...opts, seuils: { ...opts.seuils, [key]: value } });
  const setGeo = (key, value) =>
    onOptionsChange?.({ ...opts, geo: { ...opts.geo, [key]: value } });
  const setNaf = (key, value) =>
    onOptionsChange?.({ ...opts, naf: { ...opts.naf, [key]: value } });

  const toggleSection = (key) => setOpenSection((s) => (s === key ? null : key));

  return (
    <>
      {showAlert && <AlertModal onConfirm={confirmAlert} onCancel={cancelAlert} />}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Profil de scoring
          </p>
          {!isDefault && (
            <button
              onClick={handleReset}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
              title="Remettre le profil standard"
            >
              ↺ Standard
            </button>
          )}
        </div>

        {/* Presets */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Presets métier</p>
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <Tooltip key={key} text={preset.tooltip}>
                <button
                  onClick={() => applyPreset(key)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors font-medium"
                >
                  {preset.icon} {preset.label}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* 4 axes */}
        <div className="space-y-2">
          {DIMENSIONS.map(({ key, label, icon, hint, tooltips }) => (
            <div key={key} className="flex items-center gap-2">
              <Tooltip text={hint}>
                <span className="text-xs text-slate-600 w-24 shrink-0 cursor-help">
                  {icon} {label}
                </span>
              </Tooltip>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium flex-1">
                {LEVELS.map(({ key: lkey, label: llabel }) => (
                  <Tooltip key={lkey} text={tooltips[lkey]}>
                    <button
                      onClick={() => handleAxisChange(key, lkey)}
                      className={`flex-1 py-1.5 transition-colors ${
                        profile[key] === lkey
                          ? lkey === 'prioriser'
                            ? 'bg-amber-500 text-white'
                            : lkey === 'ignorer'
                              ? 'bg-slate-400 text-white'
                              : 'bg-slate-700 text-white'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {llabel}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>

        {countIgnored > 1 && (
          <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 leading-snug">
            ⚠️ Score reposant sur peu de critères — fiabilité réduite.
          </p>
        )}

        {/* Accordeons options avancees */}
        <div className="border-t border-slate-100 pt-3 space-y-1">

          {/* Filtres durs */}
          <AccordionSection
            label="Filtres durs"
            icon="🚧"
            open={openSection === 'filtres'}
            onToggle={() => toggleSection('filtres')}
            active={opts.filtres.effectif_min != null || opts.filtres.anciennete_min != null}
          >
            {/* Effectif minimum */}
            <div className="space-y-1">
              <Tooltip text="Les entreprises sous ce seuil seront écartées avant calcul, même si elles cochent le reste.">
                <label className="text-[11px] text-slate-500 font-medium cursor-help">
                  Effectif minimum ℹ
                </label>
              </Tooltip>
              <select
                value={opts.filtres.effectif_min ?? ''}
                onChange={(e) => setFiltre('effectif_min', e.target.value || null)}
                className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700"
              >
                <option value="">Aucun seuil</option>
                {EFFECTIF_FILTER_OPTIONS.map((code) => (
                  <option key={code} value={code}>
                    {EFFECTIF_LABELS[code] ?? code}
                  </option>
                ))}
              </select>
            </div>

            {/* Anciennete minimum */}
            <div className="space-y-1 mt-2">
              <Tooltip text="Exclut les entreprises trop récentes — trop fragiles pour investir.">
                <label className="text-[11px] text-slate-500 font-medium cursor-help">
                  Ancienneté minimum (années) ℹ
                </label>
              </Tooltip>
              <input
                type="number"
                min="0"
                max="50"
                value={opts.filtres.anciennete_min ?? ''}
                onChange={(e) => setFiltre('anciennete_min', e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex : 3"
                className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700"
              />
            </div>
          </AccordionSection>

          {/* Listes NAF */}
          <AccordionSection
            label="Listes NAF"
            icon="📋"
            open={openSection === 'naf'}
            onToggle={() => toggleSection('naf')}
            active={opts.naf.whitelist.length > 0 || opts.naf.blacklist.length > 0}
          >
            <NafListEditor
              label="Liste blanche"
              tooltip="Ces codes NAF obtiennent automatiquement la note maximale en Adéquation."
              values={opts.naf.whitelist}
              onChange={(v) => setNaf('whitelist', v)}
              colorClass="text-green-600"
            />
            <NafListEditor
              label="Liste noire"
              tooltip="Ces codes NAF sont exclus de vos résultats, quels que soient les autres critères."
              values={opts.naf.blacklist}
              onChange={(v) => setNaf('blacklist', v)}
              colorClass="text-red-600"
              className="mt-2"
            />
          </AccordionSection>

          {/* Seuils HOT/WARM */}
          <AccordionSection
            label="Seuils HOT / WARM"
            icon="🌡️"
            open={openSection === 'seuils'}
            onToggle={() => toggleSection('seuils')}
            active={
              opts.seuils.hot  !== DEFAULT_OPTIONS.seuils.hot ||
              opts.seuils.warm !== DEFAULT_OPTIONS.seuils.warm
            }
          >
            <ThresholdSlider
              label="Seuil Chaud (HOT)"
              tooltip="Les prospects au-dessus de ce seuil sont prioritaires — contactez-les en premier."
              value={opts.seuils.hot}
              min={opts.seuils.warm + 5}
              max={95}
              color="bg-red-500"
              onChange={(v) => setSeuil('hot', v)}
            />
            <ThresholdSlider
              label="Seuil Tiède (WARM)"
              tooltip="Les prospects entre ce seuil et le seuil Chaud valent la peine d'être contactés."
              value={opts.seuils.warm}
              min={5}
              max={opts.seuils.hot - 5}
              color="bg-amber-500"
              onChange={(v) => setSeuil('warm', v)}
              className="mt-3"
            />
          </AccordionSection>

          {/* Bonus geo */}
          <AccordionSection
            label="Bonus géographique"
            icon="📍"
            open={openSection === 'geo'}
            onToggle={() => toggleSection('geo')}
            active={opts.geo.actif}
          >
            <Tooltip text="Les prospects proches de vous remontent dans le classement. Pratique pour cibler votre zone de chalandise.">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={opts.geo.actif}
                  onChange={(e) => setGeo('actif', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Activer le bonus de proximité ℹ
                </span>
              </label>
            </Tooltip>

            {opts.geo.actif && (
              <div className="space-y-2 pl-1">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Départements cibles (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={opts.geo.departements_cibles.join(', ')}
                    onChange={(e) =>
                      setGeo(
                        'departements_cibles',
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="Ex : 73, 74, 01"
                    className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Bonus (points)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={opts.geo.bonus}
                    onChange={(e) => setGeo('bonus', Number(e.target.value))}
                    className="w-24 text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700"
                  />
                </div>
              </div>
            )}
          </AccordionSection>
        </div>

        {!isDefault && (
          <p className="text-[10px] text-slate-400 leading-tight">
            Profil personnalisé actif — scores recalculés en temps réel.
          </p>
        )}
      </div>
    </>
  );
}

// ─── Sous-composants locaux ────────────────────────────────────────────────────

function AccordionSection({ label, icon, open, onToggle, active, children }) {
  return (
    <div className="rounded-lg border border-slate-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {icon} {label}
          {active && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          )}
        </span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 text-xs bg-slate-50/60 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

function ThresholdSlider({ label, tooltip, value, min, max, color, onChange, className = '' }) {
  return (
    <div className={className}>
      <Tooltip text={tooltip}>
        <label className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mb-1 cursor-help">
          <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
          {label} : <strong className="text-slate-700 ml-1">{value}</strong> ℹ
        </label>
      </Tooltip>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function NafListEditor({ label, tooltip, values, onChange, colorClass, className = '' }) {
  const [input, setInput] = useState('');

  const add = () => {
    const code = input.trim().toUpperCase();
    if (code && !values.includes(code)) {
      onChange([...values, code]);
    }
    setInput('');
  };

  const remove = (code) => onChange(values.filter((c) => c !== code));

  return (
    <div className={className}>
      <Tooltip text={tooltip}>
        <label className={`text-[11px] font-medium ${colorClass} mb-1 block cursor-help`}>
          {label} ℹ
        </label>
      </Tooltip>
      <div className="flex gap-1 mb-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Ex : 43, 4391A"
          maxLength={6}
          className="flex-1 text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white text-slate-700"
        />
        <button
          onClick={add}
          className="text-xs px-2 py-1 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors font-medium"
        >
          +
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((code) => (
            <span
              key={code}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                colorClass === 'text-green-600'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              } flex items-center gap-1`}
            >
              {code}
              <button
                onClick={() => remove(code)}
                className="hover:opacity-70 ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
