'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';

const ADMIN_SECRET = 'LH_FRED_2024';
import Filters from './components/Filters';
import ResultsTable from './components/ResultsTable';
import Pagination, { PER_PAGE_ALL } from './components/Pagination';
import { withScore, applyScoreFilter, applyEnrichFilter, applySort, DEFAULT_PROFILE } from '@/lib/scoring';
import ScoringProfile from './components/ScoringProfile';
import { applyCacheToResults, getCacheSize, clearCache } from '@/lib/enrichCache';

export default function Home() {
  const [allResults, setAllResults] = useState([]); // TOUS les résultats bruts en mémoire
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCapped, setIsCapped] = useState(false); // true = plafond 1000 résultats atteint
  const [cacheSize,   setCacheSize]   = useState(() => {
    // Initialisé côté client uniquement
    if (typeof window === 'undefined') return 0;
    return getCacheSize();
  });

  // Mode admin — accès libre (bypass paiement)
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unlock = params.get('unlock');
    if (unlock === ADMIN_SECRET) {
      localStorage.setItem('lh_admin', ADMIN_SECRET);
      const url = new URL(window.location.href);
      url.searchParams.delete('unlock');
      window.history.replaceState({}, '', url.toString());
    }
    setIsAdmin(localStorage.getItem('lh_admin') === ADMIN_SECRET);
  }, []);

  // Paramètres avancés — réduit par défaut
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Profil de pondération du score (recalcul temps réel)
  const [scoringProfile, setScoringProfile] = useState(DEFAULT_PROFILE);

  // Sort & filtres — sur l'ensemble des résultats (pas par page)
  const [sortField,     setSortField]     = useState('score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [scoreFilter,   setScoreFilter]   = useState('all');
  const [enrichFilter,  setEnrichFilter]  = useState('all');

  // Pagination — 100% client
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Étape 1 — Scoring : ne recalcule que si les données ou le profil changent.
  // Isolé pour éviter 1 000 recalculs à chaque changement de filtre ou de tri.
  const scoredResults = useMemo(
    () => allResults.map((e) => withScore(e, scoringProfile)),
    [allResults, scoringProfile]
  );

  // Étape 2 — Filtrage + tri : ne retouche pas les scores.
  const processedResults = useMemo(() => {
    const byScore  = applyScoreFilter(scoredResults, scoreFilter);
    const byEnrich = applyEnrichFilter(byScore, enrichFilter);
    return applySort(byEnrich, sortField, sortDirection);
  }, [scoredResults, scoreFilter, enrichFilter, sortField, sortDirection]);

  // PER_PAGE_ALL = Infinity → on retourne tout le tableau
  const totalPages = perPage === PER_PAGE_ALL ? 1 : Math.ceil(processedResults.length / perPage);
  const pageResults = useMemo(() => {
    if (perPage === PER_PAGE_ALL) return processedResults;
    const start = (page - 1) * perPage;
    return processedResults.slice(start, start + perPage);
  }, [processedResults, page, perPage]);

  // Handlers sort/filtre — reset page à chaque changement
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const handleScoreFilter = (filter) => {
    setScoreFilter(filter);
    setPage(1);
  };

  const handleEnrichFilter = (filter) => {
    setEnrichFilter(filter);
    setPage(1);
  };

  // Un seul appel API au lancement de la recherche
  const handleSearch = async ({ nafCodes, departements, tranches }) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setIsCapped(false);
    setPage(1);
    setScoreFilter('all');
    setEnrichFilter('all');
    setSortField('score');
    setSortDirection('desc');

    try {
      const params = new URLSearchParams({
        naf_codes: nafCodes.join(','),
        departements: departements.join(','),
        ...(tranches.length > 0 && { tranches: tranches.join(',') }),
      });

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erreur lors de la recherche');

      const withCache = applyCacheToResults(data.results || []);
      setAllResults(withCache);
      setIsCapped(data.capped === true);
    } catch (err) {
      setError(err.message);
      setAllResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Changement de page — instantané, pas d'appel API
  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Changement résultats par page — instantané
  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  // Mise à jour des résultats après enrichissement (depuis ResultsTable)
  const handleResultsUpdate = (updatedResults) => {
    setAllResults(updatedResults);
    setCacheSize(getCacheSize());
  };

  const handleClearCache = () => {
    clearCache();
    setCacheSize(0);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <header className="bg-[#0D1B2A] border-b border-[#1B4F8A]/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight">LeadHarvest</h1>
              <p className="text-slate-400 text-xs">Génération de leads B2B — vos prospects PME & artisans en 5 minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {allResults.length > 0 && (
              <span className="text-sm text-amber-400 font-semibold">
                {allResults.length} prospect{allResults.length > 1 ? 's' : ''} trouvé{allResults.length > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Beta</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

          {/* Filtres */}
          <div className="lg:sticky lg:top-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Filtres de recherche</h2>
            </div>
            <Filters onSearch={handleSearch} isLoading={isLoading} />

            {/* Paramètres avancés — accordéon */}
            <div className="mt-4">
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 font-medium px-1 py-2 transition-colors"
              >
                <span>⚙️ Paramètres avancés</span>
                <span className="text-slate-400">{showAdvanced ? '▲' : '▼'}</span>
              </button>

              {showAdvanced && (
                <div className="space-y-3 mt-1">
                  {/* Sources */}
                  <div className="bg-[#0D1B2A]/5 rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Sources de données</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-xs text-slate-600">Base SIRENE (INSEE)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span className="text-xs text-slate-600">Google Maps Places</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="text-xs text-slate-600">Scraping site web</span>
                      </div>
                    </div>
                  </div>

                  {/* Cache local */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Données sauvegardées</p>
                      {cacheSize > 0 && (
                        <button
                          onClick={handleClearCache}
                          className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                    {cacheSize > 0 ? (
                      <p className="text-xs text-slate-600">
                        💾 <span className="font-semibold text-green-600">{cacheSize}</span> prospect{cacheSize > 1 ? 's' : ''} enrichi{cacheSize > 1 ? 's' : ''} en mémoire
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Aucune donnée sauvegardée</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Les coordonnées trouvées sont automatiquement restaurées à la prochaine recherche.
                    </p>
                  </div>

                  {/* Profil de scoring */}
                  <ScoringProfile profile={scoringProfile} onChange={setScoringProfile} />
                </div>
              )}
            </div>
          </div>

          {/* Résultats */}
          <div>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            {isCapped && !isLoading && (
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">⚠️ Résultats tronqués — limite de 1 000 atteinte</p>
                <p className="leading-relaxed">
                  Votre sélection génère plus de 1 000 entreprises correspondantes. Conformément aux conditions d'utilisation de l'API recherche-entreprises.gouv.fr, les résultats sont plafonnés à 1 000 par requête.
                  <br />
                  Pour obtenir la totalité des prospects, <strong>réduisez votre sélection</strong> (moins de codes NAF ou moins de départements) et effectuez <strong>plusieurs recherches successives</strong>.
                </p>
              </div>
            )}

            {!hasSearched ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Prêt à prospecter ?</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  Sélectionnez un secteur d'activité, des départements et lancez votre recherche pour obtenir une liste de prospects qualifiés.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-4 max-w-xs mx-auto">
                  {[
                    { icon: '⚡', label: 'Moins de 5 min' },
                    { icon: '🏗️', label: 'PME & artisans' },
                    { icon: '📊', label: 'Scoring intégré' },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {/* KPI cards */}
                {!isLoading && allResults.length > 0 && (() => {
                  const enrichedCount = allResults.filter(r => r.enriched).length;
                  const telCount     = allResults.filter(r => r.telephone).length;
                  const emailCount   = allResults.filter(r => r.email).length;
                  const siteCount    = allResults.filter(r => r.site_web).length;
                  return (
                    <div className="space-y-3 mb-4">
                      {/* Ligne 1 — toujours visible */}
                      <div className="grid grid-cols-4 gap-3">
                        <KpiCard value={allResults.length} label="Prospects trouvés" color="text-[#0d6efd]" />
                        <KpiCard
                          value={scoredResults.filter(r => r.score > 70).length}
                          label="Prospects chauds"
                          sub="score > 70"
                          color="text-[#198754]"
                          hint="Enrichissez vos prospects pour affiner le score"
                        />
                        <KpiCard
                          value={enrichedCount}
                          label="Enrichis"
                          color="text-[#0d6efd]"
                          hint="Sélectionnez des lignes et cliquez Enrichir"
                        />
                        <KpiCard
                          value={allResults.length > 0 ? Math.round(allResults.filter(r => !r.site_web).length / allResults.length * 100) + '%' : '—'}
                          label="Sans site web"
                          color="text-[#fd7e14]"
                        />
                      </div>

                      {/* Ligne 2 — résultats d'enrichissement, visible après enrichissement */}
                      {enrichedCount > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                          <KpiCard value={telCount}   label="Téléphones trouvés" icon="📞" color="text-[#198754]" hint={telCount === 0 ? "Aucun téléphone trouvé" : null} />
                          <KpiCard value={emailCount} label="Emails trouvés"     icon="📧" color="text-[#0d6efd]" hint={emailCount === 0 ? "Aucun email trouvé" : null} />
                          <KpiCard value={siteCount}  label="Sites web trouvés"  icon="🌐" color="text-[#fd7e14]" hint={siteCount === 0 ? "Aucun site trouvé" : null} />
                        </div>
                      )}
                    </div>
                  );
                })()}

                <ResultsTable
                  results={pageResults}
                  allResults={allResults}
                  scoredResults={scoredResults}
                  isAdmin={isAdmin}
                  filteredTotal={processedResults.length}
                  isLoading={isLoading}
                  onResultsUpdate={handleResultsUpdate}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  scoreFilter={scoreFilter}
                  enrichFilter={enrichFilter}
                  onSort={handleSort}
                  onScoreFilter={handleScoreFilter}
                  onEnrichFilter={handleEnrichFilter}
                />
                {!isLoading && allResults.length > 0 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={allResults.length}
                    perPage={perPage}
                    onPageChange={handlePageChange}
                    onPerPageChange={handlePerPageChange}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({ value, label, sub, color, hint, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      {hint && value === 0 && (
        <div className="text-[10px] text-blue-500 mt-1 leading-tight">{hint}</div>
      )}
    </div>
  );
}
