'use client';

import { useState } from 'react';
import {
  DEFAULT_PROFILE,
  DEFAULT_OPTIONS,
  PRESETS,
  EFFECTIF_ORDER,
} from '@/lib/scoring';
import Tooltip from '@/app/components/Tooltip';

export { DEFAULT_PROFILE };

// ─── 4 axes de scoring ────────────────────────────────────────────────────────

const DIMENSIONS = [
  {
    key:   'adequation',
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
    key:   'capacite',
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
    key:   'maturite',
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
    key:   'joignabilite',
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

// Style visuel de chaque état (inactif / actif)
const LEVEL_STYLE = {
  ignorer: {
    idle:   'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
    active: 'bg-slate-200 text-slate-700 font-semibold',
    dot:    'bg-slate-400',
    mark:   '–',
  },
  normal: {
    idle:   'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
    active: 'bg-[#0D1B2A] text-white font-semibold',
    dot:    'bg-slate-700',
    mark:   '●',
  },
  prioriser: {
    idle:   'text-slate-400 hover:text-amber-500 hover:bg-amber-50',
    active: 'bg-amber-500 text-white font-semibold',
    dot:    'bg-amber-500',
    mark:   '↑',
  },
};

const PRESET_EMOJIS = {
  chasse_volume:     '🎯',
  gros_tickets:      '💎',
  terrain_cold_call: '📞',
};

// ─── Libelles effectif ────────────────────────────────────────────────────────

const EFFECTIF_LABELS = {
  NN:   'Non employeur',
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

const EFFECTIF_FILTER_OPTIONS = EFFECTIF_ORDER.slice(0, 12);

// ─── Popup alerte (>1 axe ignore) ────────────────────────────────────────────

function AlertModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4">
        <div className="text-3xl mb-3 text-center">⚠️</div>
        <h3 className="font-bold text-slate-800 text-base mb-2 text-center">Score peu fiable</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Vous ignorez plus d'un axe. Le score repose alors sur trop peu de critères et perd en fiabilité.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors">
            Continuer quand même
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sélecteur d'axe ─────────────────────────────────────────────────────────

function AxisRow({ dim, value, onChange }) {
  const currentStyle = LEVEL_STYLE[value] || LEVEL_STYLE.normal;

  return (
    <div className="flex items-center gap-2 py-1">
      <Tooltip text={dim.hint}>
        <div className="flex items-center gap-1.5 w-28 shrink-0 cursor-help">
          <span className="text-sm">{dim.icon}</span>
          <span className="text-xs text-slate-700 font-medium leading-tight">{dim.label}</span>
        </div>
      </Tooltip>

      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentStyle.dot}`} />

      <div className="flex gap-1 flex-1 justify-end">
        {Object.entries(LEVEL_STYLE).map(([lkey, ls]) => {
          const isActive = value === lkey;
          return (
            <Tooltip key={lkey} text={dim.tooltips[lkey]}>
              <button
                onClick={() => onChange(lkey)}
                className={`
                  text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-150
                  ${isActive
                    ? `${ls.active} border-transparent shadow-sm`
                    : `${ls.idle} border-slate-100`
                  }
                `}
              >
                <span className="mr-0.5 opacity-70">{ls.mark}</span>
                {lkey === 'ignorer' ? 'Ignorer' : lkey === 'normal' ? 'Normal' : 'Prioriser'}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// ─── Accordéon section ────────────────────────────────────────────────────────

function AccordionSection({ label, icon, open, onToggle, active, children }) {
  return (
    <div className={`rounded-lg border transition-colors ${active ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span>{icon}</span>
          <span>{label}</span>
          {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block ml-0.5" />}
        </span>
        <span className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-100 text-xs">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Slider seuil ─────────────────────────────────────────────────────────────

function ThresholdSlider({ label, tooltip, value, min, max, color, onChange }) {
  return (
    <div>
      <Tooltip text={tooltip}>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mb-1.5 cursor-help">
          <span className={`w-2 h-2 rounded-full ${color} inline-block`} />
          {label}
          <strong className="text-slate-700 ml-auto">{value}</strong>
          <span className="text-slate-400">ℹ</span>
        </label>
      </Tooltip>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500 h-1.5 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-slate-300 mt-0.5">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

// ─── Editeur liste NAF ────────────────────────────────────────────────────────

function NafListEditor({ label, tooltip, values, onChange, colorClass }) {
  const [input, setInput] = useState('');
  const add = () => {
    const code = input.trim().toUpperCase();
    if (code && !values.includes(code)) onChange([...values, code]);
    setInput('');
  };
  const remove = (c) => onChange(values.filter((x) => x !== c));
  const isGreen = colorClass === 'text-green-600';

  return (
    <div>
      <Tooltip text={tooltip}>
        <label className={`text-[11px] font-semibold ${colorClass} mb-1 block cursor-help`}>
          {label} ℹ
        </label>
      </Tooltip>
      <div className="flex gap-1 mb-1.5">
        <input
          type="text" value={input} maxLength={6} placeholder="Ex : 43, 4391A"
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="flex-1 text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white text-slate-700"
        />
        <button onClick={add} className="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 transition-colors">+</button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((code) => (
            <span key={code} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${isGreen ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {code}
              <button onClick={() => remove(code)} className="hover:opacity-60">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ScoringProfile({ profile, options, onChange, onOptionsChange }) {
  const [showAlert, setShowAlert]     = useState(false);
  const [pendingProfile, setPending]  = useState(null);
  const [openSection, setOpenSection] = useState(null);

  const opts = options || DEFAULT_OPTIONS;

  const countIgnored = Object.values(profile).filter((v) => v === 'ignorer').length;

  const handleAxisChange = (key, value) => {
    const next = { ...profile, [key]: value };
    const ignored = Object.values(next).filter((v) => v === 'ignorer').length;
    if (ignored > 1) { setPending(next); setShowAlert(true); }
    else onChange(next);
  };

  const applyPreset = (presetKey) => onChange({ ...PRESETS[presetKey].profile });

  const isDefault =
    Object.keys(DEFAULT_PROFILE).every((k) => profile[k] === 'normal') &&
    JSON.stringify(opts) === JSON.stringify(DEFAULT_OPTIONS);

  const setFiltre = (k, v) => onOptionsChange?.({ ...opts, filtres: { ...opts.filtres, [k]: v } });
  const setSeuil  = (k, v) => onOptionsChange?.({ ...opts, seuils:  { ...opts.seuils,  [k]: v } });
  const setGeo    = (k, v) => onOptionsChange?.({ ...opts, geo:     { ...opts.geo,     [k]: v } });
  const setNaf    = (k, v) => onOptionsChange?.({ ...opts, naf:     { ...opts.naf,     [k]: v } });

  const toggle = (key) => setOpenSection((s) => (s === key ? null : key));

  return (
    <>
      {showAlert && (
        <AlertModal
          onConfirm={() => { if (pendingProfile) onChange(pendingProfile); setPending(null); setShowAlert(false); }}
          onCancel={() => { setPending(null); setShowAlert(false); }}
        />
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Profil de scoring</p>
          {!isDefault && (
            <button onClick={() => { onChange({ ...DEFAULT_PROFILE }); onOptionsChange?.({ ...DEFAULT_OPTIONS }); }}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors">
              ↺ Standard
            </button>
          )}
        </div>

        {/* Presets */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Presets métier</p>
          <div className="grid grid-cols-1 gap-1.5">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <Tooltip key={key} text={preset.tooltip}>
                <button
                  onClick={() => applyPreset(key)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 text-left hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition-all text-xs text-slate-600 font-medium group"
                >
                  <span className="text-base leading-none">{PRESET_EMOJIS[key]}</span>
                  <span>{preset.label}</span>
                  <span className="ml-auto text-slate-300 group-hover:text-amber-400 text-[10px]">appliquer →</span>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* 4 axes */}
        <div className="space-y-0.5 border-t border-slate-100 pt-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Pondération des axes</p>
          {DIMENSIONS.map((dim) => (
            <AxisRow
              key={dim.key}
              dim={dim}
              value={profile[dim.key] || 'normal'}
              onChange={(v) => handleAxisChange(dim.key, v)}
            />
          ))}
        </div>

        {countIgnored > 1 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 leading-snug">
            ⚠️ Score reposant sur peu de critères — fiabilité réduite.
          </p>
        )}

        {/* Options avancées */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Options avancées</p>

          {/* Filtres durs */}
          <AccordionSection label="Filtres durs" icon="🚧" open={openSection === 'filtres'} onToggle={() => toggle('filtres')}
            active={opts.filtres.effectif_min != null || opts.filtres.anciennete_min != null}>
            <div className="space-y-3 mt-1">
              <div>
                <Tooltip text="Les entreprises sous ce seuil seront écartées avant calcul, même si elles cochent le reste.">
                  <label className="text-[11px] text-slate-500 font-medium block mb-1 cursor-help">Effectif minimum ℹ</label>
                </Tooltip>
                <select value={opts.filtres.effectif_min ?? ''} onChange={(e) => setFiltre('effectif_min', e.target.value || null)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700">
                  <option value="">Aucun seuil</option>
                  {EFFECTIF_FILTER_OPTIONS.map((code) => (
                    <option key={code} value={code}>{EFFECTIF_LABELS[code] ?? code}</option>
                  ))}
                </select>
              </div>
              <div>
                <Tooltip text="Exclut les entreprises trop récentes — trop fragiles pour investir.">
                  <label className="text-[11px] text-slate-500 font-medium block mb-1 cursor-help">Ancienneté minimum (années) ℹ</label>
                </Tooltip>
                <input type="number" min="0" max="50" value={opts.filtres.anciennete_min ?? ''} placeholder="Ex : 3"
                  onChange={(e) => setFiltre('anciennete_min', e.target.value ? Number(e.target.value) : null)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700" />
              </div>
            </div>
          </AccordionSection>

          {/* Listes NAF */}
          <AccordionSection label="Listes NAF" icon="📋" open={openSection === 'naf'} onToggle={() => toggle('naf')}
            active={opts.naf.whitelist.length > 0 || opts.naf.blacklist.length > 0}>
            <div className="space-y-3 mt-1">
              <NafListEditor label="Liste blanche" tooltip="Ces codes NAF obtiennent automatiquement la note maximale en Adéquation."
                values={opts.naf.whitelist} onChange={(v) => setNaf('whitelist', v)} colorClass="text-green-600" />
              <NafListEditor label="Liste noire" tooltip="Ces codes NAF sont exclus de vos résultats, quels que soient les autres critères."
                values={opts.naf.blacklist} onChange={(v) => setNaf('blacklist', v)} colorClass="text-red-600" />
            </div>
          </AccordionSection>

          {/* Seuils */}
          <AccordionSection label="Seuils HOT / WARM" icon="🌡️" open={openSection === 'seuils'} onToggle={() => toggle('seuils')}
            active={opts.seuils.hot !== DEFAULT_OPTIONS.seuils.hot || opts.seuils.warm !== DEFAULT_OPTIONS.seuils.warm}>
            <div className="space-y-3 mt-1">
              <ThresholdSlider label="Seuil Chaud (HOT)" tooltip="Les prospects au-dessus de ce seuil sont prioritaires — contactez-les en premier."
                value={opts.seuils.hot} min={opts.seuils.warm + 5} max={95} color="bg-red-400"
                onChange={(v) => setSeuil('hot', v)} />
              <ThresholdSlider label="Seuil Tiède (WARM)" tooltip="Les prospects entre ce seuil et le seuil Chaud valent la peine d'être contactés."
                value={opts.seuils.warm} min={5} max={opts.seuils.hot - 5} color="bg-amber-400"
                onChange={(v) => setSeuil('warm', v)} />
            </div>
          </AccordionSection>

          {/* Bonus géo */}
          <AccordionSection label="Bonus géographique" icon="📍" open={openSection === 'geo'} onToggle={() => toggle('geo')}
            active={opts.geo.actif}>
            <div className="mt-1 space-y-2">
              <Tooltip text="Les prospects proches de vous remontent dans le classement. Pratique pour cibler votre zone de chalandise.">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={opts.geo.actif} onChange={(e) => setGeo('actif', e.target.checked)}
                    className="rounded border-slate-300 accent-amber-500" />
                  <span className="text-[11px] text-slate-600 font-medium">Activer le bonus de proximité ℹ</span>
                </label>
              </Tooltip>
              {opts.geo.actif && (
                <div className="space-y-2 pl-1 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">Départements cibles (séparés par des virgules)</label>
                    <input type="text" value={opts.geo.departements_cibles.join(', ')} placeholder="Ex : 73, 74, 01"
                      onChange={(e) => setGeo('departements_cibles', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                      className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-500 font-medium shrink-0">Bonus (pts)</label>
                    <input type="number" min="1" max="30" value={opts.geo.bonus}
                      onChange={(e) => setGeo('bonus', Number(e.target.value))}
                      className="w-20 text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700" />
                  </div>
                </div>
              )}
            </div>
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
