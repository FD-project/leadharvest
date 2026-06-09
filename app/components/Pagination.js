'use client';

// Valeur sentinelle pour "Tous" — on passe total comme perPage côté page.js
export const PER_PAGE_ALL = Infinity;

export default function Pagination({ page, totalPages, total, perPage, onPageChange, onPerPageChange }) {
  if (total === 0) return null;

  const isAll  = perPage === PER_PAGE_ALL;
  const start  = isAll ? 1 : (page - 1) * perPage + 1;
  const end    = isAll ? total : Math.min(page * perPage, total);

  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-4 border-t border-slate-100 bg-white rounded-b-xl">
      {/* Info résultats */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{start}–{end}</span> sur <span className="font-semibold text-slate-800">{total}</span> entreprises
        </span>

        {/* Résultats par page */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Par page :</span>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            {[10, 25, 50, 100].map(n => (
              <button
                key={n}
                onClick={() => onPerPageChange(n)}
                className={`px-2.5 py-1.5 transition-colors ${perPage === n ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => onPerPageChange(PER_PAGE_ALL)}
              className={`px-2.5 py-1.5 transition-colors ${isAll ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              title="Afficher toutes les entreprises — permet la sélection complète"
            >
              Tous
            </button>
          </div>
        </div>
      </div>

      {/* Navigation pages — masquée en mode "Tous" */}
      {totalPages > 1 && !isAll && (
        <div className="flex items-center gap-1">
          {/* Première page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="px-2 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Première page"
          >
            ««
          </button>

          {/* Page précédente */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-2 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ‹
          </button>

          {/* Pages numérotées */}
          {pages[0] > 1 && (
            <>
              <button onClick={() => onPageChange(1)} className="px-3 py-1.5 text-xs rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">1</button>
              {pages[0] > 2 && <span className="px-1 text-slate-300 text-xs">…</span>}
            </>
          )}

          {pages.map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${p === page ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {p}
            </button>
          ))}

          {pages[pages.length - 1] < totalPages && (
            <>
              {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-slate-300 text-xs">…</span>}
              <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 text-xs rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">{totalPages}</button>
            </>
          )}

          {/* Page suivante */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-2 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ›
          </button>

          {/* Dernière page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Dernière page"
          >
            »»
          </button>
        </div>
      )}
    </div>
  );
}
