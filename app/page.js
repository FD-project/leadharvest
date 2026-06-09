'use client';

import { useState } from 'react';
import Filters from './components/Filters';
import ResultsTable from './components/ResultsTable';
import Pagination from './components/Pagination';

export default function Home() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Derniers filtres utilisés (pour repaginer sans refaire la recherche)
  const [lastFilters, setLastFilters] = useState(null);

  const fetchResults = async (filters, currentPage, currentPerPage) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        naf_codes: filters.nafCodes.join(','),
        departements: filters.departements.join(','),
        page: String(currentPage),
        per_page: String(currentPerPage),
        ...(filters.tranches.length > 0 && { tranches: filters.tranches.join(',') }),
      });

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erreur lors de la recherche');

      setResults(data.results || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 0);
    } catch (err) {
      setError(err.message);
      setResults([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (filters) => {
    setHasSearched(true);
    setPage(1);
    setLastFilters(filters);
    await fetchResults(filters, 1, perPage);
  };

  const handlePageChange = async (newPage) => {
    setPage(newPage);
    if (lastFilters) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await fetchResults(lastFilters, newPage, perPage);
    }
  };

  const handlePerPageChange = async (newPerPage) => {
    setPerPage(newPerPage);
    setPage(1);
    if (lastFilters) {
      await fetchResults(lastFilters, 1, newPerPage);
    }
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
              <p className="text-slate-400 text-xs">Génération de leads B2B — PME & Artisans France</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {total > 0 && (
              <span className="text-sm text-amber-400 font-semibold">
                {total} prospect{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
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

            {/* Sources */}
            <div className="mt-4 bg-[#0D1B2A]/5 rounded-xl border border-slate-200 p-4">
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
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-xs text-slate-600">Pappers.fr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Résultats */}
          <div>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                ⚠️ {error}
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
                  {[{ icon: '⚡', label: 'Moins de 5 min' }, { icon: '🏗️', label: 'PME & artisans' }, { icon: '📊', label: 'Scoring intégré' }].map(item => (
                    <div key={item.label} className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <ResultsTable results={results} isLoading={isLoading} />
                {!isLoading && total > 0 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
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
