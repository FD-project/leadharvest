import Link from 'next/link';

export const metadata = {
  title: 'Mentions légales — LeadHarvest',
};

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            ← Retour à l'application
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Mentions légales</h1>
          <p className="text-slate-500 text-sm mt-1">Dernière mise à jour : juin 2026</p>
        </div>

        <div className="space-y-8 text-sm text-slate-700 leading-relaxed">

          {/* Éditeur */}
          <section>
            <h2 className="font-semibold text-slate-900 text-base mb-2">1. Éditeur du service</h2>
            <p>
              LeadHarvest est un service édité par <strong>FD-Project</strong>, entreprise individuelle.<br />
              Responsable de publication : Frédéric DUCHER<br />
              Contact : <a href="mailto:contact@fducher.com" className="text-blue-600 hover:underline">contact@fducher.com</a>
            </p>
          </section>

          {/* Hébergeur */}
          <section>
            <h2 className="font-semibold text-slate-900 text-base mb-2">2. Hébergement</h2>
            <p>
              Le service est hébergé par <strong>Vercel Inc.</strong><br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">vercel.com</a>
            </p>
          </section>

          {/* Sources de données */}
          <section>
            <h2 className="font-semibold text-slate-900 text-base mb-2">3. Sources de données</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>API Recherche Entreprises (SIRENE)</strong> — données publiques de l'INSEE, mises à disposition par data.gouv.fr sous licence ODBL.</li>
              <li><strong>Google Maps Places API</strong> — données enrichies via l'API Google, soumises aux <a href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">conditions d'utilisation Google</a>.</li>
              <li><strong>Scraping de sites web publics</strong> — extraction des coordonnées publiées publiquement sur les sites des entreprises.</li>
            </ul>
          </section>

          {/* RGPD */}
          <section>
            <h2 className="font-semibold text-slate-900 text-base mb-2">4. Protection des données personnelles (RGPD)</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Responsable du traitement</h3>
                <p>FD-Project — Frédéric DUCHER (coordonnées ci-dessus).</p>
              </div>

              <div>
                <h3 className="font-medium text-slate-800 mb-1">Données traitées</h3>
                <p>
                  LeadHarvest traite des données issues de registres publics (SIRENE) et de sites web publics,
                  relatives à des personnes morales et à leurs dirigeants dans un cadre professionnel :
                  nom/prénom du dirigeant, adresse professionnelle, téléphone professionnel, email professionnel.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-slate-800 mb-1">Base légale</h3>
                <p>
                  Le traitement repose sur l'<strong>intérêt légitime</strong> (article 6.1.f du RGPD) :
                  faciliter la prospection commerciale B2B entre professionnels, dans le respect des finalités
                  légitimes reconnues par les lignes directrices de la CNIL sur la prospection commerciale.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-slate-800 mb-1">Emails nominatifs générés algorithmiquement</h3>
                <p>
                  LeadHarvest peut générer des suggestions d'adresses email nominatives
                  (ex. : <em>prenom.nom@domaine.fr</em>) à partir du nom du dirigeant issu du registre SIRENE
                  et du nom de domaine du site web de l'entreprise. Ces adresses sont des <strong>suggestions
                  non vérifiées</strong>, fournies à titre indicatif dans une colonne dédiée de l'export.
                  Elles ne constituent pas une donnée certifiée et doivent être utilisées avec discernement,
                  dans un cadre strictement B2B et professionnel.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-slate-800 mb-1">Droits des personnes concernées</h3>
                <p>
                  Conformément au RGPD, toute personne dont les données apparaissent dans LeadHarvest
                  dispose d'un droit d'accès, de rectification, d'opposition et d'effacement.
                  Pour exercer ces droits : <a href="mailto:contact@fducher.com" className="text-blue-600 hover:underline">contact@fducher.com</a>.
                  En cas de réclamation, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">CNIL</a>.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-slate-800 mb-1">Utilisation réservée à la prospection B2B</h3>
                <p>
                  LeadHarvest est un outil réservé à un usage professionnel B2B. L'utilisateur s'engage à
                  n'utiliser les données extraites qu'à des fins de prospection commerciale légale,
                  en respectant le RGPD et l'article L.34-5 du Code des postes et communications électroniques
                  (obligation d'opt-out pour la prospection B2B par email).
                </p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="font-semibold text-slate-900 text-base mb-2">5. Cookies et stockage local</h2>
            <p>
              LeadHarvest utilise le stockage local du navigateur (localStorage) uniquement pour la mise en cache
              des données enrichies et les préférences utilisateur. Aucun cookie de tracking ou publicitaire n'est utilisé.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
