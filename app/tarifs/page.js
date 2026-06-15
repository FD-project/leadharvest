import Link from 'next/link';

export const metadata = {
  title: 'Tarifs — LeadHarvest',
  description: 'Packs de crédits et abonnements LeadHarvest — générez des leads B2B qualifiés',
};

// 1 enrichissement Google Maps = 10 crédits
// 1 enrichissement Scraping email = 5 crédits
// Google Maps + Scraping = 15 crédits
const GOOGLE_COST  = 10;
const SCRAPE_COST  = 5;
const COMBO_COST   = GOOGLE_COST + SCRAPE_COST; // 15

const PACKS = [
  {
    name:         'Starter',
    price:        5,
    credits:      300,
    bonusCredits: 0,
    unitPrice:    '0,17',
    tag:          null,
  },
  {
    name:         'Standard',
    price:        20,
    credits:      1500,
    bonusCredits: 100,
    unitPrice:    '0,13',
    tag:          '-21%',
  },
  {
    name:         'Pro',
    price:        50,
    credits:      4000,
    bonusCredits: 500,
    unitPrice:    '0,13',
    tag:          '-26%',
    highlight:    true,
  },
  {
    name:         'Expert',
    price:        100,
    credits:      7500,
    bonusCredits: 1000,
    unitPrice:    '0,13',
    tag:          '-21%',
  },
];

const SUBSCRIPTIONS = [
  {
    name:         'Starter',
    price:        29,
    credits:      2500,
    bonusCredits: 0,
    unitPrice:    '0,12',
    tag:          null,
  },
  {
    name:         'Pro',
    price:        79,
    credits:      7500,
    bonusCredits: 500,
    unitPrice:    '0,11',
    tag:          'Populaire',
    highlight:    true,
  },
  {
    name:         'Expert',
    price:        149,
    credits:      15000,
    bonusCredits: 1500,
    unitPrice:    '0,10',
    tag:          null,
  },
  {
    name:         'Agency',
    price:        299,
    credits:      35000,
    bonusCredits: 5000,
    unitPrice:    '0,09',
    tag:          'Meilleur tarif',
  },
];

const INCLUDED = [
  { icon: '🏢', label: 'Données SIRENE (nom, SIREN, dirigeant, adresse, NAF)' },
  { icon: '📞', label: 'Enrichissement Google Maps (téléphone, site web, fiche GMB)' },
  { icon: '📧', label: 'Email via scraping site web' },
  { icon: '🎯', label: 'Score de maturité digitale (0-100)' },
  { icon: '📥', label: 'Export CSV / Excel' },
];

// Formate un prix en €/prospect avec 2 décimales significatives
function fmtCpp(euros) {
  if (euros >= 0.10) return euros.toFixed(2) + '€';
  return euros.toFixed(3).replace(/0+$/, '') + '€';
}

// Bloc exemples d'enrichissement + coût de revient
function EnrichExamples({ totalCredits, price }) {
  const googleOnly = Math.floor(totalCredits / GOOGLE_COST);
  const combo      = Math.floor(totalCredits / COMBO_COST);
  const cppGoogle  = googleOnly > 0 ? price / googleOnly : 0;
  const cppCombo   = combo > 0      ? price / combo      : 0;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 flex-1 flex flex-col justify-end">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Avec ces crédits</p>

      {/* Google Maps seul */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-slate-500">
          <span>📍</span><span>Google Maps seul</span>
        </span>
        <span className="font-bold text-slate-800">{googleOnly.toLocaleString('fr-FR')} prospects</span>
      </div>

      {/* Combo */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-slate-500">
          <span>📍📧</span><span>+ Scraping email</span>
        </span>
        <span className="font-bold text-slate-800">{combo.toLocaleString('fr-FR')} prospects</span>
      </div>

      {/* Coût de revient */}
      <div className="mt-2 pt-2 border-t border-dashed border-slate-200 grid grid-cols-2 gap-1.5">
        <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-center">
          <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-tight mb-0.5">Coût / prospect</p>
          <p className="text-xs font-bold text-slate-700">📍 {fmtCpp(cppGoogle)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-center">
          <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-tight mb-0.5">Coût / prospect</p>
          <p className="text-xs font-bold text-slate-700">📍📧 {fmtCpp(cppCombo)}</p>
        </div>
      </div>
    </div>
  );
}

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

        {/* Légende crédits */}
        <div className="bg-[#0D1B2A] rounded-2xl p-5 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">💎</span>
            <span className="text-white font-bold text-sm">Système de crédits</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-base">📍</span>
              <span>Google Maps</span>
              <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full text-xs">{GOOGLE_COST} crédits/prospect</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-base">📧</span>
              <span>Scraping email</span>
              <span className="bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full text-xs">{SCRAPE_COST} crédits/prospect</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-base">✨</span>
              <span>Combo complet</span>
              <span className="bg-green-500/20 text-green-300 font-bold px-2 py-0.5 rounded-full text-xs">{COMBO_COST} crédits/prospect</span>
            </div>
          </div>
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
            {PACKS.map((pack) => {
              const totalCredits = pack.credits + pack.bonusCredits;
              return (
                <div
                  key={pack.name}
                  className={`bg-white rounded-2xl border-2 p-5 shadow-sm flex flex-col ${
                    pack.highlight ? 'border-amber-400 shadow-amber-100' : 'border-slate-200'
                  }`}
                >
                  {pack.highlight && (
                    <div className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-0.5 self-start mb-3">
                      ⭐ Le plus populaire
                    </div>
                  )}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-500 mb-1">{pack.name}</p>
                    <p className="text-3xl font-bold text-slate-900">{pack.price}€</p>
                    <p className="text-sm text-slate-500 mt-0.5">paiement unique</p>
                  </div>

                  {/* Crédits */}
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">💎</span>
                        <span className="text-sm font-bold text-slate-900">{pack.credits.toLocaleString('fr-FR')} crédits</span>
                      </div>
                      {pack.bonusCredits > 0 && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
                          +{pack.bonusCredits.toLocaleString('fr-FR')} offerts
                        </span>
                      )}
                    </div>
                    {pack.bonusCredits > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Total : <strong className="text-slate-700">{totalCredits.toLocaleString('fr-FR')} crédits</strong>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Coût unitaire</span>
                      <span className="font-semibold text-slate-800">{pack.unitPrice}€/prospect</span>
                    </div>
                    {pack.tag && (
                      <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 text-center">
                        Économie {pack.tag} vs Starter
                      </div>
                    )}
                  </div>

                  {/* Exemples enrichissement */}
                  <EnrichExamples totalCredits={totalCredits} price={pack.price} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Abonnements */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-xl font-bold text-slate-900">Abonnements mensuels</h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Résiliable à tout moment · Crédits renouvelés chaque mois</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBSCRIPTIONS.map((sub) => {
              const totalCredits = sub.credits + sub.bonusCredits;
              return (
                <div
                  key={sub.name}
                  className={`bg-white rounded-2xl border-2 p-5 shadow-sm flex flex-col ${
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
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-500 mb-1">{sub.name}</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-3xl font-bold text-slate-900">{sub.price}€</p>
                      <span className="text-sm text-slate-500">/mois</span>
                    </div>
                  </div>

                  {/* Crédits */}
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">💎</span>
                        <span className="text-sm font-bold text-slate-900">{sub.credits.toLocaleString('fr-FR')} crédits</span>
                      </div>
                      {sub.bonusCredits > 0 && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
                          +{sub.bonusCredits.toLocaleString('fr-FR')} offerts
                        </span>
                      )}
                    </div>
                    {sub.bonusCredits > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Total : <strong className="text-slate-700">{totalCredits.toLocaleString('fr-FR')} crédits/mois</strong>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Coût unitaire</span>
                      <span className="font-semibold text-slate-800">{sub.unitPrice}€/prospect</span>
                    </div>
                  </div>

                  {/* Exemples enrichissement */}
                  <EnrichExamples totalCredits={totalCredits} price={sub.price} />
                </div>
              );
            })}
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
              <p className="font-medium text-slate-800 mb-1">Comment fonctionnent les crédits ?</p>
              <p>Chaque enrichissement consomme des crédits selon la source utilisée : <strong>10 crédits</strong> pour Google Maps (téléphone + site web + fiche GMB), <strong>5 crédits</strong> supplémentaires pour le scraping d'email. Vous choisissez les sources au moment de l'enrichissement.</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Puis-je utiliser les données exportées dans mon CRM ?</p>
              <p>Oui. L'export CSV/Excel est inclus dans tous les packs et abonnements. Les données sont issues du registre public SIRENE et de sources publiques. Leur utilisation est soumise au respect du RGPD dans un cadre B2B.</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Y a-t-il un engagement minimum ?</p>
              <p>Les packs sont sans engagement, valables 12 mois. Les abonnements sont résiliables à tout moment avant la prochaine échéance mensuelle.</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Qu'est-ce que les crédits offerts ?</p>
              <p>À partir du pack Standard, des crédits bonus sont ajoutés automatiquement à l'achat — sans surcoût. Ils ont la même durée de validité que les crédits achetés.</p>
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
