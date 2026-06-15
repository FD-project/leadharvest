import Link from 'next/link';

export const metadata = {
  title: 'Tarifs — LeadHarvest',
  description: 'Packs de crédits et abonnements LeadHarvest — générez des leads B2B qualifiés',
};

const PACKS = [
  {
    name: 'Starter',
    price: 5,
    prospects: 30,
    unitPrice: '0,17',
    tag: null,
  },
  {
    name: 'Standard',
    price: 20,
    prospects: 150,
    unitPrice: '0,13',
    tag: '-21%',
  },
  {
    name: 'Pro',
    price: 50,
    prospects: 400,
    unitPrice: '0,13',
    tag: '-26%',
    highlight: true,
  },
  {
    name: 'Expert',
    price: 100,
    prospects: 750,
    unitPrice: '0,13',
    tag: '-21%',
  },
];

const SUBSCRIPTIONS = [
  {
    name: 'Starter',
    price: 29,
    prospects: 250,
    unitPrice: '0,12',
    tag: null,
  },
  {
    name: 'Pro',
    price: 79,
    prospects: 750,
    unitPrice: '0,11',
    tag: 'Populaire',
    highlight: true,
  },
  {
    name: 'Expert',
    price: 149,
    prospects: 1500,
    unitPrice: '0,10',
    tag: null,
  },
  {
    name: 'Agency',
    price: 299,
    prospects: 3500,
    unitPrice: '0,09',
    tag: 'Meilleur tarif',
  },
];

const INCLUDED = [
  { icon: '🏢', label: 'Données SIRENE (nom, SIREN, dirigeant, adresse, NAF)' },
  { icon: '📞', label: 'Enrichissement Google Maps (téléphone, site web, fiche GMB)' },
  { icon: '📧', label: 'Email via scraping site web' },
  { icon: '🎯', label: 'Score de maturité digitale (0-100)' },
  { icon: '📥', label: 'Export CSV / Excel' },
];

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-[#F0F4F8]">

      {/* Header */}
      <header className="bg-[#0D1B2A] border-b border-[#1B4F8A]/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight">LeadHarvest</h1>
              <p className="text-slate-400 text-xs">Génération de leads B2B — PME & artisans en France</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/tarifs" className="text-amber-400 text-sm font-semibold">Tarifs</Link>
            <Link href="/" className="text-slate-300 hover:text-white text-sm">Application</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Tarifs simples et transparents</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Payez uniquement ce que vous utilisez. Pas d'abonnement obligatoire, pas de frais cachés.
          </p>
        </div>

        {/* Ce qui est inclus */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-10 shadow-sm">
          <h3 className="font-semibold text-slate-900 text-base mb-4">Ce qui est inclus dans chaque prospect enrichi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INCLUDED.map((item) => (
              <div key={item.label} className="flex items-start gap-2.5 text-sm text-slate-600">
                <span className="text-base mt-0.5">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Packs de crédits */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-xl font-bold text-slate-900">Packs de crédits</h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Sans engagement · Valables 12 mois</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PACKS.map((pack) => (
              <div
                key={pack.name}
                className={`bg-white rounded-2xl border-2 p-6 shadow-sm flex flex-col ${
                  pack.highlight ? 'border-amber-400 shadow-amber-100' : 'border-slate-200'
                }`}
              >
                {pack.highlight && (
                  <div className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-0.5 self-start mb-3">
                    ⭐ Le plus populaire
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-500 mb-1">{pack.name}</p>
                  <p className="text-3xl font-bold text-slate-900">{pack.price}€</p>
                  <p className="text-sm text-slate-500 mt-1">paiement unique</p>
                </div>
                <div className="border-t border-slate-100 pt-4 space-y-2 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Prospects</span>
                    <span className="font-bold text-slate-900">{pack.prospects}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Coût unitaire</span>
                    <span className="font-semibold text-slate-800">{pack.unitPrice}€/prospect</span>
                  </div>
                  {pack.tag && (
                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 text-center mt-2">
                      Économie {pack.tag} vs Starter
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Abonnements */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-xl font-bold text-slate-900">Abonnements mensuels</h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Résiliable à tout moment · Crédits renouvelés chaque mois</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBSCRIPTIONS.map((sub) => (
              <div
                key={sub.name}
                className={`bg-white rounded-2xl border-2 p-6 shadow-sm flex flex-col ${
                  sub.highlight ? 'border-blue-500 shadow-blue-100' : 'border-slate-200'
                }`}
              >
                {sub.tag && (
                  <div className={`text-xs font-bold rounded-full px-3 py-0.5 self-start mb-3 ${
                    sub.highlight
                      ? 'text-blue-700 bg-blue-50 border border-blue-200'
                      : sub.tag === 'Meilleur tarif'
                        ? 'text-green-700 bg-green-50 border border-green-200'
                        : 'text-slate-600 bg-slate-100 border border-slate-200'
                  }`}>
                    {sub.tag === 'Populaire' ? '⭐ ' : sub.tag === 'Meilleur tarif' ? '💰 ' : ''}{sub.tag}
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-500 mb-1">{sub.name}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-slate-900">{sub.price}€</p>
                    <span className="text-sm text-slate-500">/mois</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4 space-y-2 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Prospects/mois</span>
                    <span className="font-bold text-slate-900">{sub.prospects.toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Coût unitaire</span>
                    <span className="font-semibold text-slate-800">{sub.unitPrice}€/prospect</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            Les crédits non utilisés en fin de mois ne sont pas reportés sur le mois suivant.
          </p>
        </section>

        {/* FAQ rapide */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
          <h3 className="font-semibold text-slate-900 text-base mb-4">Questions fréquentes</h3>
          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-800 mb-1">Qu'est-ce qu'un « prospect enrichi » ?</p>
              <p>Un prospect = une entreprise dont les données SIRENE ont été enrichies via Google Maps Places (téléphone, site web, fiche GMB) et, si disponible, l'email récupéré par scraping du site web.</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Puis-je utiliser les données exportées dans mon CRM ?</p>
              <p>Oui. L'export CSV/Excel est inclus dans tous les packs et abonnements. Les données sont issues du registre public SIRENE et de sources publiques. Leur utilisation est soumise au respect du RGPD dans un cadre B2B.</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Y a-t-il un engagement minimum ?</p>
              <p>Les packs sont sans engagement, valables 12 mois. Les abonnements sont résiliables à tout moment avant la prochaine échéance mensuelle.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3.5 rounded-xl shadow-md transition-all"
          >
            Commencer gratuitement →
          </Link>
          <p className="text-xs text-slate-400 mt-3">
            Les premières recherches SIRENE sont gratuites et illimitées. L'enrichissement est payant.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">© 2026 FD-Project — LeadHarvest</span>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/mentions-legales" className="hover:text-slate-600 underline underline-offset-2">Mentions légales & RGPD</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
