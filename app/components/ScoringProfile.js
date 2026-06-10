'use client';

import { DEFAULT_PROFILE, MULTIPLIER_VALUES } from '@/lib/scoring';

// ─── Composant ScoringProfile ─────────────────────────────────────────────────
// Permet d'ajuster les pondérations des 3 dimensions du score.
// Chaque dimension peut être Ignorée (×0.5), Normale (×1.0) ou Priorisée (×1.5).

const DIMENSIONS = [
  { key: 'adequation',   label: 'Adéquation',   icon: '🎯', hint: 'Âge de l\'entreprise' },
  { key: 'capacite',     label: 'Capacité',      icon: '💰', hint: 'Effectif · Forme juridique · CA' },
  { key: 'joignabilite', label: 'Joignabilité',  icon: '📞', hint: 'Dirigeant · Tél · Email' },
];

const LEVELS = [
  { key: 'ignorer',   label: 'Ignorer',   title: `×${MULTIPLIER_VALUES.ignorer}` },
  { key: 'normal',    label: 'Normal',    title: `×${MULTIPLIER_VALUES.normal}`  },
  { key: 'prioriser', label: 'Prioriser', title: `×${MULTIPLIER_VALUES.prioriser}` },
];

export { DEFAULT_PROFILE };

export default function ScoringProfile({ profile, onChange }) {
  const isDefault = Object.keys(DEFAULT_PROFILE).every((k) => profile[k] === 'normal');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Profil de scoring
        </p>
        {!isDefault && (
          <button
            onClick={() => onChange({ ...DEFAULT_PROFILE })}
            className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
            title="Remettre les pondérations par défaut"
          >
            ↺ Standard
          </button>
        )}
      </div>

      <div className="space-y-2">
        {DIMENSIONS.map(({ key, label, icon, hint }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-24 shrink-0" title={hint}>
              {icon} {label}
            </span>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium flex-1">
              {LEVELS.map(({ key: lkey, label: llabel, title }) => (
                <button
                  key={lkey}
                  onClick={() => onChange({ ...profile, [key]: lkey })}
                  title={title}
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
              ))}
            </div>
          </div>
        ))}
      </div>

      {!isDefault && (
        <p className="text-[10px] text-slate-400 mt-3 leading-tight">
          Profil personnalisé actif — les scores sont recalculés en temps réel.
        </p>
      )}
    </div>
  );
}
