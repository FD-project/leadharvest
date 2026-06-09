# LeadHarvest — Roadmap Produit & Technique

> Document de référence pour les sessions de développement futures.
> Dernière mise à jour : 9 juin 2026

---

## Phase 1 — Stabilisation (en cours)

### Bugs connus à corriger
- [ ] Encodage UTF-8 `naf.js` — caractères spéciaux mal affichés (fix : re-sauvegarder en UTF-8 dans VS Code)
- [ ] `pj_present` renommé en `pappers_present` dans le scoring — mettre à jour `lib/scoring.js` en conséquence
- [ ] Timeout Vercel sur les recherches larges (>10 NAF × >5 départements) — la fonction edge a une limite à 10s en Hobby plan

### Améliorations immédiates
- [ ] Indicateur visuel pendant le chargement SIRENE (compteur d'entreprises collectées en temps réel)
- [ ] Message d'erreur explicite si aucun résultat SIRENE (distinguer "0 résultat" vs "erreur API")
- [ ] Bouton "Nouvelle recherche" qui réinitialise proprement tous les états

---

## Phase 2 — Enrichissement & Scoring

### Nouvelles sources de données
- [ ] **Hunter.io** — email pro du dirigeant à partir du nom + domaine du site web
  - API gratuite : 25 recherches/mois, ~49$/mois ensuite
  - Intégration : `app/api/enrich/hunter/route.js`
  - Signal fort pour la prospection email directe

- [ ] **Societe.com / Infogreffe** — données financières (CA, résultat, effectif réel)
  - Permet de scorer sur la santé financière en plus de la maturité digitale
  - Utile pour cibler les entreprises en croissance

### Amélioration du scoring
- [ ] Scoring configurable par l'utilisateur (sliders pour ajuster les poids)
- [ ] Score "potentiel commercial" distinct du score "maturité digitale"
- [ ] Historique du score — voir si une entreprise progresse ou régresse
- [ ] Scoring sur la note GMB (note < 4 = opportunité d'amélioration pour eux)

### Export enrichi
- [ ] Export Excel `.xlsx` natif (colonnes formatées, couleurs par score)
- [ ] Export JSON pour intégration CRM directe
- [ ] Export personnalisable — choisir les colonnes à inclure

---

## Phase 3 — Authentification & Freemium

### Système de comptes
- [ ] Authentification via **Clerk** ou **NextAuth** (Google / email)
- [ ] Profil utilisateur avec clé API Google Maps personnelle (optionnel)
- [ ] Historique des recherches par utilisateur

### Modèle Freemium
- [ ] Plan Free : résultats SIRENE bruts uniquement, 3 recherches/jour
- [ ] Plan Pro : enrichissement illimité, export, scoring avancé
- [ ] Paywall sur le bouton "Enrichir" pour les utilisateurs Free
- [ ] Compteur d'utilisation visible dans l'interface

### Facturation
- [ ] Intégration **Stripe** — abonnement mensuel Pro
- [ ] Tableau de bord consommation Google Maps avec alertes de budget
- [ ] Mode "Pay as you go" — crédits d'enrichissement à l'unité

---

## Phase 4 — UX & Performance

### Interface
- [ ] Vue "Carte" — afficher les entreprises sur une carte Google Maps
- [ ] Vue "Kanban" — pipeline de prospection (À contacter / Contacté / En cours / Signé)
- [ ] Filtres avancés sauvegardables ("mes filtres BTP Savoie")
- [ ] Recherche par mot-clé dans le nom de l'entreprise
- [ ] Tri multi-colonnes (ex: par département puis par score)
- [ ] Colonne "Note interne" — annotation manuelle par prospect

### Performance
- [ ] Cache Redis des résultats SIRENE (même recherche = réponse instantanée pendant 24h)
- [ ] Streaming des résultats — afficher au fur et à mesure sans attendre la fin
- [ ] Web Worker pour le calcul du scoring sur de gros volumes (>500 entreprises)

---

## Phase 5 — SaaS & Intégrations

### CRM & Outreach
- [ ] Export direct vers **HubSpot** (API HubSpot Contacts)
- [ ] Export direct vers **Pipedrive**
- [ ] Export direct vers **Notion** (base de données prospects)
- [ ] Intégration **Lemlist** / **LaGrowthMachine** pour séquences email automatiques

### Workflow Automatisation
- [ ] Webhook sortant — déclencher un workflow Make/n8n à chaque nouveau prospect
- [ ] Alerte email/Slack quand de nouvelles entreprises correspondent à des filtres sauvegardés
- [ ] Recherche planifiée — "toutes les semaines, chercher de nouveaux électriciens en Savoie"

### API publique LeadHarvest
- [ ] Endpoint REST public avec clé API
- [ ] Documentation Swagger
- [ ] Rate limiting par clé
- [ ] Permet de revendre l'accès à des agences ou développeurs tiers

---

## Phase 6 — Scale & Monétisation avancée

### Multi-tenant
- [ ] Espaces de travail partagés (agences avec plusieurs commerciaux)
- [ ] Rôles : Admin / Manager / Commercial
- [ ] Listes partagées et annotations collaboratives

### Données propriétaires
- [ ] Construction d'une base enrichie maison (cache des enrichissements passés)
- [ ] Moins de dépendance à Google Maps au fil du temps
- [ ] Revente de données enrichies (sous conditions RGPD)

### RGPD & Conformité
- [ ] Mentions légales et CGU adaptées au scraping B2B
- [ ] Politique de données conforme RGPD (données publiques d'entreprises)
- [ ] Droit à l'effacement sur les données stockées
- [ ] Audit trail des enrichissements

---

## Stack technique cible (Phase 5+)

| Besoin | Solution recommandée |
|---|---|
| Auth | Clerk (le plus simple pour Next.js) |
| BDD | Supabase (PostgreSQL managé) |
| Cache | Upstash Redis (serverless) |
| Paiement | Stripe |
| Email | Resend |
| Monitoring | Sentry + Vercel Analytics |
| Tests | Vitest + Playwright |

---

## Priorités recommandées pour la prochaine session

1. **Fix encodage UTF-8** `naf.js` — 5 minutes, bloquant visuellement
2. **Timeout Vercel** — passer sur Vercel Pro OU limiter les combinaisons NAF×Dept côté UI
3. **Indicateur de progression SIRENE** — UX essentielle pour les longues recherches
4. **Export Excel .xlsx** — demandé depuis le début, différenciateur fort
5. **Carte Google Maps** — vue visuelle des prospects, très impactant commercialement

