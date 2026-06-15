'use client';

import { useState, useRef, memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TRANCHES_EFFECTIF } from './data/naf';
import {
  getScoreCategory,
  SCORE_CATEGORY_LABELS,
  SCORE_CATEGORY_COLORS,
} from '@/lib/scoring';
import { exportEntreprisesCSV } from '@/lib/export';
import { ENRICH_ROUTES, ENRICH_BATCH_SIZE, postJSON } from '@/lib/api';
import { saveToCache } from '@/lib/enrichCache';

// ─── Helpers tooltip scoring ──────────────────────────────────────────────────

function getAgeLabel(dateCreation) {
  if (!dateCreation) return { label: 'Date inconnue', detail: '—' };
  const years = (Date.now() - new Date(dateCreation).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const y = years.toFixed(1);
  if (years < 1.5)  return { label: `${y} an${years >= 1 ? 's' : ''}`,  detail: 'Trop jeune — fragile' };
  if (years < 3)    return { label: `${y} ans`, detail: 'En développement' };
  if (years < 15)   return { label: `${y} ans`, detail: '✓ Zone idéale (3-15 ans)' };
  return              { label: `${y} ans`, detail: 'Ancienne — peut être résistante' };
}

function getEffectifDetail(code) {
  const map = {
    '03': '6-9 salariés', '11': '10-19 sal.', '02': '3-5 sal.',
    '12': '20-49 sal.',   '01': '1-2 sal.',   '21': '50-99 sal.',
    '22': '100-199 sal.', '00': '0 salarié',  'NN': 'Non employeur',
  };
  return map[code] ?? (code ? code : 'Inconnu');
}

function getFormeLabel(code) {
  if (!code) return 'Inconnue';
  const map = {
    '5499': 'SARL', '5308': 'EURL', '5710': 'SAS', '5720': 'SASU',
    '5800': 'SA',   '5815': 'SA (directoire)',
  };
  if (map[code]) return map[code];
  if (String(code).startsWith('1') || String(code).startsWith('9')) return `EI / Micro (${code})`;
  if (String(code).startsWith('5')) return `Société (${code})`;
  return code;
}

function ScoreTooltip({ entreprise, subscores, position }) {
  const age = getAgeLabel(entreprise.date_creation);
  const hasPhone = !!entreprise.telephone;

  // Code NAF (division 2 chiffres) pour l'affichage adequation
  const nafCode = (entreprise.activite_principale || entreprise.code_naf || '').replace(/\./g, '');

  return (
    <div
      className="fixed z-[9999] bg-slate-900 text-white rounded-xl p-4 shadow-2xl text-xs pointer-events-none"
      style={{ bottom: position.bottom, right: position.right, width: '272px' }}
    >
      {/* Flèche */}
      <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-slate-900 rotate-45" />

      <p className="font-bold text-center text-sm mb-3 text-slate-100">Détail du score</p>

      {/* Adéquation (NAF) */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-blue-300">🎯 Adéquation</span>
          <span className="font-bold text-blue-200">{subscores.adequation ?? '—'}/100</span>
        </div>
        <div className="bg-slate-800 rounded-lg px-3 py-2 space-y-0.5 text-slate-400">
          <div className="flex justify-between">
            <span>Code NAF</span>
            <span className="text-slate-300 font-mono">{nafCode || 'Inconnu'}</span>
          </div>
          <div className="text-slate-500 text-[10px]">Score selon la division sectorielle</div>
        </div>
      </div>

      {/* Capacité */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-teal-300">💰 Capacité</span>
          <span className="font-bold text-teal-200">{subscores.capacite ?? '—'}/100</span>
        </div>
        <div className="bg-slate-800 rounded-lg px-3 py-2 space-y-1 text-slate-400">
          <div className="flex justify-between">
            <span>Effectif</span>
            <span className="text-slate-300">{getEffectifDetail(entreprise.tranche_effectif)}</span>
          </div>
          <div className="flex justify-between">
            <span>Forme juridique</span>
            <span className="text-slate-300">{getFormeLabel(entreprise.nature_juridique)}</span>
          </div>
          <div className="flex justify-between">
            <span>Chiffre d'affaires</span>
            <span className={entreprise.ca ? 'text-slate-300' : 'text-slate-500'}>
              {entreprise.ca != null ? `${entreprise.ca.toLocaleString('fr-FR')} €` : 'Non disponible'}
            </span>
          </div>
        </div>
      </div>

      {/* Maturité */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-purple-300">📅 Maturité</span>
          <span className="font-bold text-purple-200">{subscores.maturite ?? '—'}/100</span>
        </div>
        <div className="bg-slate-800 rounded-lg px-3 py-2 space-y-0.5 text-slate-400">
          <div className="flex justify-between">
            <span>Ancienneté</span>
            <span className="text-slate-300 font-medium">{age.label}</span>
          </div>
          <div className="text-slate-500 text-[10px]">{age.detail}</div>
        </div>
      </div>

      {/* Joignabilité */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-amber-300">📞 Joignabilité</span>
          <span className="font-bold text-amber-200">{subscores.joignabilite ?? '—'}/100</span>
        </div>
        <div className="bg-slate-800 rounded-lg px-3 py-2 space-y-1 text-slate-400">
          <div className="flex justify-between">
            <span>Dirigeant identifié</span>
            <span className={entreprise.dirigeant?.nom ? 'text-green-400' : 'text-red-400'}>
              {entreprise.dirigeant?.nom ? '✓ Oui (+30)' : '✗ Non (+0)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Téléphone</span>
            <span className={hasPhone ? 'text-green-400' : entreprise.enriched ? 'text-red-400' : 'text-slate-500'}>
              {hasPhone ? '✓ Trouvé (+40)' : entreprise.enriched ? '✗ Absent (+0)' : '? Non enrichi'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Email</span>
            <span className={entreprise.email ? 'text-green-400' : entreprise.enriched ? 'text-red-400' : 'text-slate-500'}>
              {entreprise.email ? '✓ Trouvé (+30)' : entreprise.enriched ? '✗ Absent (+0)' : '? Non enrichi'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

const SUBSCORE_STYLES = [
  { key: 'adequation',   label: 'Adéq', color: 'bg-blue-400'   },
  { key: 'capacite',     label: 'Cap.',  color: 'bg-teal-400'   },
  { key: 'maturite',     label: 'Mat.',  color: 'bg-purple-400' },
  { key: 'joignabilite', label: 'Joi.',  color: 'bg-amber-400'  },
];

function ScoreBadge({ score, subscores, enriched, entreprise, disqualifie, raison_dq }) {
  const [tooltipPos, setTooltipPos] = useState(null);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef(null);
  const category = disqualifie ? 'disqualifie' : getScoreCategory(score);
  const { badge, bar } = SCORE_CATEGORY_COLORS[category] ?? SCORE_CATEGORY_COLORS.cold;
  const label = SCORE_CATEGORY_LABELS[category] ?? '—';

  useEffect(() => { setMounted(true); }, []);

  const handleMouseEnter = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltipPos({
      bottom: window.innerHeight - rect.top + 10,
      right:  Math.max(8, window.innerWidth - rect.right),
    });
  };

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col gap-1 min-w-[110px] cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltipPos(null)}
    >
      {mounted && tooltipPos && subscores && entreprise && !disqualifie && createPortal(
        <ScoreTooltip entreprise={entreprise} subscores={subscores} position={tooltipPos} />,
        document.body
      )}

      {disqualifie ? (
        /* Lead exclu — affichage simplifie */
        <div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>
            Exclu
          </span>
          {raison_dq && (
            <p className="text-[10px] text-slate-400 mt-1 leading-tight" title={raison_dq}>
              {raison_dq}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Badge principal */}
          <div className="flex items-center gap-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>
              {!enriched && <span className="opacity-50 mr-0.5 text-[10px]">~</span>}
              {label} {score}
            </span>
            {entreprise?.from_cache && <span title="Données restaurées depuis le cache" className="text-xs">💾</span>}
            {enriched && !entreprise?.from_cache && <span title="Données enrichies" className="text-xs">✨</span>}
          </div>

          {/* Barre principale */}
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${bar}`}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Sous-scores (4 axes) */}
          {subscores && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {SUBSCORE_STYLES.map(({ key, label: slabel, color }) => {
                const val = subscores[key] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400 w-6 shrink-0">{slabel}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-1 rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 w-5 text-right shrink-0">{val}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Coût en crédits par entreprise
const GOOGLE_CREDITS_UNIT = 10;
const SCRAPE_CREDITS_UNIT = 5;

function EnrichModal({ count, sitesCount, onClose, onLaunch, isAdmin, credits = 0, onDeductCredits }) {
  const [sources, setSources] = useState({ google: true, scrape: false });

  const toggle = (key) => setSources((prev) => ({ ...prev, [key]: !prev[key] }));
  const hasSourceSelected = Object.values(sources).some(Boolean);

  const googleCredits = sources.google ? count * GOOGLE_CREDITS_UNIT : 0;
  const scrapeCredits = sources.scrape ? count * SCRAPE_CREDITS_UNIT : 0;
  const totalCredits  = googleCredits + scrapeCredits;
  const canAfford     = isAdmin ? credits >= totalCredits : true;
  const afterCredits  = Math.max(0, credits - totalCredits);

  const handleConfirm = () => {
    if (onDeductCredits) onDeductCredits(totalCredits);
    onLaunch(sources);
  };

  // Scraping disponible si : des sites sont déjà connus, OU si Google est coché (trouvera des sites)
  const scrapeAvailable = sitesCount > 0 || sources.google;

  const scrapeDescription = sources.google && sitesCount === 0
    ? 'Email extrait du site web · Les sites seront récupérés via Google Maps'
    : sources.google && sitesCount > 0
      ? `Email extrait du site web · ${sitesCount} site${sitesCount > 1 ? 's' : ''} connu${sitesCount > 1 ? 's' : ''} + nouveaux via Google`
      : sitesCount > 0
        ? `Email extrait du site web · ${sitesCount} site${sitesCount > 1 ? 's' : ''} disponible${sitesCount > 1 ? 's' : ''}`
        : 'Email extrait du site web · Cochez Google Maps pour activer';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Enrichir les données</h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {count} entreprise{count > 1 ? 's' : ''} sélectionnée{count > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Solde disponible — toujours visible */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${canAfford ? 'bg-slate-50 border border-slate-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2">
              <span className="text-base">💎</span>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Votre solde</p>
                <p className={`text-sm font-bold ${canAfford ? 'text-slate-800' : 'text-red-600'}`}>
                  {credits.toLocaleString('fr-FR')} crédits
                </p>
              </div>
            </div>
            {hasSourceSelected && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Après opération</p>
                <p className={`text-sm font-bold ${afterCredits < 100 ? 'text-red-500' : afterCredits < 1000 ? 'text-amber-600' : 'text-slate-600'}`}>
                  {afterCredits.toLocaleString('fr-FR')} crédits
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sources */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Sources d'enrichissement
          </p>

          <SourceOption
            checked={sources.google}
            onChange={() => toggle('google')}
            label="Google Maps Places"
            badge={`${count} × ${GOOGLE_CREDITS_UNIT} crédits`}
            description="Téléphone · Site web · Fiche GMB"
          />

          <SourceOption
            checked={sources.scrape}
            onChange={() => !scrapeAvailable ? null : toggle('scrape')}
            label="Scraping email"
            badge={`${count} × ${SCRAPE_CREDITS_UNIT} crédits`}
            description={scrapeDescription}
            disabled={!scrapeAvailable}
          />
        </div>

        {/* Récap crédits */}
        {(sources.google || sources.scrape) && (
          <div className="mx-6 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-1">Coût en crédits</p>
            {sources.google && (
              <div className="flex items-center justify-between text-xs text-amber-700">
                <span>Google Maps Places</span>
                <span>{count} × {GOOGLE_CREDITS_UNIT} = <strong>{googleCredits} crédits</strong></span>
              </div>
            )}
            {sources.scrape && (
              <div className="flex items-center justify-between text-xs text-amber-700">
                <span>Scraping email</span>
                <span>{count} × {SCRAPE_CREDITS_UNIT} = <strong>{scrapeCredits} crédits</strong></span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-amber-900 font-bold border-t border-amber-200 pt-1.5 mt-1">
              <span>Total</span>
              <span>💎 {totalCredits} crédits</span>
            </div>
            {/* Alerte solde insuffisant */}
            {!canAfford && (
              <p className="text-[11px] text-red-600 font-semibold pt-0.5">
                ⚠️ Solde insuffisant — rechargez vos crédits.
              </p>
            )}
          </div>
        )}

        {sources.scrape && (
          <div className="mx-6 mb-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              ⚠️ Les emails nominatifs générés (prénom.nom@domaine) sont des <strong>suggestions non vérifiées</strong> issues du registre SIRENE. Ils apparaissent dans une colonne dédiée de l'export. L'enrichissement est réservé à la prospection B2B conformément au RGPD.
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
            onClick={handleConfirm}
            disabled={!hasSourceSelected || (isAdmin && !canAfford)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              hasSourceSelected && canAfford
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isAdmin
              ? `Utiliser ${totalCredits} crédits & Enrichir`
              : `Enrichir (${totalCredits} crédits)`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceOption({ checked, onChange, label, badge, badgeColor = 'text-slate-500', description, disabled = false }) {
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
        disabled
          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
          : checked
            ? 'border-blue-500 bg-blue-50 cursor-pointer'
            : 'border-slate-200 hover:border-slate-300 cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
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

function StatCard({ icon, label, value }) {
  return (
    <div className={`rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${
      value > 0 ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'
    }`}>
      <span className="text-xl">{icon}</span>
      <span className={`text-xl font-bold ${value > 0 ? 'text-green-700' : 'text-slate-400'}`}>
        {value}
      </span>
      <span className="text-[10px] text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

function ProgressModal({ current, total, source, stats = {}, isDone = false, onClose }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  const sourceLabel =
    source === 'google' ? '🗺️ Google Maps en cours...' :
    source === 'scrape' ? '🌐 Scraping sites web...' : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

        {/* En-tête */}
        <div className="text-center mb-5">
          {isDone ? (
            <div className="text-4xl mb-3">✅</div>
          ) : (
            <svg className="animate-spin h-10 w-10 text-amber-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <h2 className="font-bold text-slate-900 text-lg">
            {isDone ? 'Enrichissement terminé' : 'Enrichissement en cours'}
          </h2>
          {!isDone && (
            <p className="text-slate-500 text-sm mt-1">{sourceLabel}</p>
          )}
        </div>

        {/* Barre de progression — masquée quand terminé */}
        {!isDone && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>{current} / {total} entreprise{total > 1 ? 's' : ''}</span>
              <span className="font-semibold text-slate-600">{pct}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Compteurs en temps réel */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatCard icon="📞" label="Téléphones"  value={stats.telephone ?? 0} />
          <StatCard icon="✉️" label="Emails"       value={stats.email     ?? 0} />
          <StatCard icon="🌐" label="Sites web"    value={stats.site_web  ?? 0} />
        </div>

        {/* Bouton fermer — uniquement quand terminé */}
        {isDone && (
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Fermer
          </button>
        )}
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

/**
 * Retourne l'URL uniquement si elle commence par http(s)://.
 * Protège contre les XSS via javascript: ou data: dans site_web.
 */
function safeSiteUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

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
  scoredResults,
  filteredTotal,
  isLoading,
  onResultsUpdate,
  isAdmin,
  credits = 0,
  onDeductCredits,
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

    // Compteurs cumulatifs sur toutes les sources
    const stats = { telephone: 0, email: 0, site_web: 0 };

    const applyEnrichResults = (enrichResults) => {
      for (const enriched of enrichResults) {
        updated = updated.map((r) => {
          if (r.siren !== enriched.siren) return r;
          const before = { ...r };
          const merged = { ...r, ...enriched, enriched: true };
          if (enriched.email_website && !r.email) {
            merged.email = enriched.email_website;
          }
          // Tracker les nouvelles données trouvées
          const hadPhone = !!(before.telephone ?? before.telephone_pappers);
          const hasPhone = !!(merged.telephone ?? merged.telephone_pappers);
          if (!hadPhone && hasPhone)             stats.telephone++;
          if (!before.email && merged.email)     stats.email++;
          if (!before.site_web && merged.site_web) stats.site_web++;
          // Score recalculé par page.js via processedResults
          return merged;
        });
      }
    };

    const runSource = async (sourceKey, routeUrl, items = toEnrich) => {
      if (items.length === 0) return;

      for (let i = 0; i < items.length; i += ENRICH_BATCH_SIZE) {
        setEnrichProgress({ current: i, total: items.length, source: sourceKey, stats: { ...stats } });
        const batch = items.slice(i, i + ENRICH_BATCH_SIZE);
        try {
          const data = await postJSON(routeUrl, { entreprises: batch });
          if (data.results) applyEnrichResults(data.results);
        } catch (err) {
          console.error(`Enrichissement ${sourceKey} échoué:`, err);
          hasError = true;
        }
        setEnrichProgress({
          current: Math.min(i + ENRICH_BATCH_SIZE, items.length),
          total:   items.length,
          source:  sourceKey,
          stats:   { ...stats },
        });
        // Sauvegarder les données enrichies dans le cache localStorage
        saveToCache(updated.filter((r) => r.enriched));
        onResultsUpdate([...updated]);
      }
    };

    if (sources.google) await runSource('google', ENRICH_ROUTES.google);
    if (sources.scrape) {
      // Utiliser `updated` pour capturer les sites trouvés par Google dans cette même session
      const enrichedSirens = new Set(toEnrich.map((r) => r.siren));
      const withSite = updated.filter((r) => enrichedSirens.has(r.siren) && r.site_web);
      await runSource('scrape', ENRICH_ROUTES.scrape, withSite);
    }

    // Afficher le récap — l'utilisateur ferme lui-même la modale
    setEnrichProgress({ isDone: true, stats: { ...stats } });
    setSelected(new Set());

    if (hasError) {
      setEnrichError('Certaines entreprises n\'ont pas pu être enrichies. Les autres ont été mises à jour.');
    }
  };

  // ── Sélection ───────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((siren) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(siren) ? next.delete(siren) : next.add(siren);
      return next;
    });
  }, []);

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

  // ── Rendu ────────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingState />;

  // Aucun résultat du tout (search vide ou API sans résultats)
  if (!allResults.length) return <EmptyState />;

  // Des résultats existent mais le filtre actif donne 0 → afficher le header + message
  const hasFilteredResults = pageResults.length > 0;

  return (
    <>
      {showEnrichModal && (
        <EnrichModal
          count={selected.size}
          sitesCount={allResults.filter((r) => selected.has(r.siren) && r.site_web).length}
          onClose={() => setShowEnrichModal(false)}
          onLaunch={handleEnrich}
          isAdmin={isAdmin}
          credits={credits}
          onDeductCredits={onDeductCredits}
        />
      )}
      {enrichProgress && (
        <ProgressModal
          current={enrichProgress.current ?? 0}
          total={enrichProgress.total ?? 0}
          source={enrichProgress.source}
          stats={enrichProgress.stats ?? {}}
          isDone={enrichProgress.isDone ?? false}
          onClose={() => setEnrichProgress(null)}
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
          onExport={() => {
              const base = scoredResults ?? allResults;
              const toExport = selected.size > 0
                ? base.filter((r) => selected.has(r.siren))
                : base;
              exportEntreprisesCSV(toExport);
            }}
        />

        {enrichError && (
          <EnrichErrorBanner
            message={enrichError}
            onDismiss={() => setEnrichError(null)}
          />
        )}

        {!hasFilteredResults ? (
          <FilterEmptyState />
        ) : (
          <>
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
                    <SortableHeader label="Entreprise" field="nom"   onSort={onSort} SortIcon={SortIcon} />
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dirigeant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Adresse</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Présence en ligne</th>
                    <SortableHeader label="Score"      field="score" onSort={onSort} SortIcon={SortIcon} />
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
          </>
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
            {selectedCount > 0
              ? `📥 Exporter la sélection (${selectedCount})`
              : `📥 Exporter tout (${total})`}
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

const EntrepriseRow = memo(function EntrepriseRow({ entreprise: e, selected, onToggle }) {
  const telephone = e.telephone;
  const [showTooltip, setShowTooltip] = useState(false);

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

      {/* Colonne ENTREPRISE — tooltip au hover avec détails NAF, effectif, SIREN */}
      <td className="px-4 py-3">
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="font-medium text-slate-900 max-w-[180px] truncate" title={e.nom}>
            {e.nom || '—'}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
            <span>{e.siren}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">{e.naf_code}</span>
          </div>

          {showTooltip && (
            <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-slate-900 text-white rounded-xl p-3 text-xs shadow-2xl pointer-events-none">
              <p className="font-semibold text-slate-100 mb-2">{e.nom}</p>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">SIREN</span>
                  <span className="font-mono">{e.siren}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Secteur NAF</span>
                  <span className="text-right max-w-[160px]">{e.naf_code}{e.naf_libelle ? ` — ${e.naf_libelle}` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Effectif</span>
                  <span>{getTrancheLabel(e.tranche_effectif)}</span>
                </div>
                {e.nature_juridique && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Forme juridique</span>
                    <span>{getFormeLabel(e.nature_juridique)}</span>
                  </div>
                )}
                {e.ca != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chiffre d'affaires</span>
                    <span>{e.ca.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
                {e.date_creation && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Créée en</span>
                    <span>{new Date(e.date_creation).getFullYear()}</span>
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-[10px] mt-2 border-t border-slate-700 pt-2">
                Tous ces champs sont inclus dans l'export CSV
              </p>
            </div>
          )}
        </div>
      </td>

      {/* Colonne DIRIGEANT — tronquée */}
      <td className="px-4 py-3">
        {e.dirigeant?.nom ? (
          <div>
            <div
              className="text-slate-800 text-xs font-medium max-w-[130px] truncate"
              title={[e.dirigeant.prenom, e.dirigeant.nom].filter(Boolean).join(' ')}
            >
              {[e.dirigeant.prenom, e.dirigeant.nom].filter(Boolean).join(' ')}
            </div>
            {e.dirigeant.qualite && (
              <div className="text-xs text-slate-400 max-w-[130px] truncate" title={e.dirigeant.qualite}>
                {e.dirigeant.qualite}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* Colonne ADRESSE */}
      <td className="px-4 py-3">
        <div className="text-slate-600 text-xs max-w-[150px] truncate" title={e.adresse}>
          {e.adresse || '—'}
        </div>
      </td>

      {/* Colonne CONTACT — téléphone + email fusionnés */}
      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()} onContextMenu={(e) => e.preventDefault()} style={{ userSelect: 'none' }}>
        <div className="flex flex-col gap-1">
          {telephone ? (
            <a href={`tel:${telephone}`} className="text-blue-600 hover:underline text-xs font-mono">
              {telephone}
            </a>
          ) : (
            <span className="text-slate-300 text-xs">{e.enriched ? '—' : 'Non enrichi'}</span>
          )}
          {e.email ? (
            <div className="flex flex-col gap-0.5">
              <a
                href={`mailto:${e.email}`}
                className="text-blue-600 hover:underline text-xs truncate max-w-[150px] block"
                title={e.email}
              >
                {e.email}
              </a>
              {/* Badge source email */}
              {e.email_source === 'scraped' && (
                <span className="text-[10px] text-green-600" title="Email trouvé sur le site web">🌐 scraping</span>
              )}
              {e.email_source === 'algorithmic_nominative' && (
                <span className="text-[10px] text-blue-600" title="Email nominatif généré depuis SIRENE (prénom.nom@domaine) — à vérifier">👤 généré</span>
              )}
              {e.email_source === 'algorithmic_generic' && (
                <span className="text-[10px] text-amber-600" title="Adresse générique générée (contact@domaine) — à vérifier">💡 généré</span>
              )}
              {/* Candidats nominatifs à tester */}
              {e.email_candidates_nominative?.length > 0 && (
                <span
                  className="text-[10px] text-blue-500 cursor-help underline decoration-dotted"
                  title={`Emails nominatifs à tester :\n${e.email_candidates_nominative.join('\n')}`}
                >
                  👤 {e.email_candidates_nominative.length} nominatif{e.email_candidates_nominative.length > 1 ? 's' : ''} à tester
                </span>
              )}
            </div>
          ) : e.enriched ? (
            <span className="text-slate-300 text-xs">—</span>
          ) : null}
        </div>
      </td>

      {/* Colonne PRÉSENCE EN LIGNE */}
      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex flex-col gap-1">
          {safeSiteUrl(e.site_web) ? (
            <a
              href={safeSiteUrl(e.site_web)}
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
            {e.gmb_present ? '📍 Fiche Google ✓' : e.enriched ? '📍 Pas de fiche' : '📍 —'}
          </span>
        </div>
      </td>

      {/* Colonne SCORE */}
      <td className="px-4 py-3">
        <ScoreBadge
          score={e.score}
          subscores={e.subscores}
          enriched={e.enriched}
          entreprise={e}
          disqualifie={e.disqualifie}
          raison_dq={e.raison_dq}
        />
      </td>
    </tr>
  );
}, (prev, next) =>
  prev.selected === next.selected &&
  prev.entreprise === next.entreprise &&
  prev.onToggle === next.onToggle
);

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

function FilterEmptyState() {
  return (
    <div className="p-12 text-center">
      <div className="text-3xl mb-3">🔍</div>
      <p className="text-slate-600 font-medium">Aucune entreprise ne correspond à ces filtres</p>
      <p className="text-slate-400 text-sm mt-1">
        Essayez de desactiver un filtre Score ou Contact ci-dessus
      </p>
    </div>
  );
}
