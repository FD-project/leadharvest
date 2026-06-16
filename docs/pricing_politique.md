# LeadHarvest — Politique Tarifaire

> **Document de référence** — à relire et mettre à jour à chaque changement de coûts API ou d'offre produit.
> Dernière mise à jour : 2026-06-16 (v1.1)

---

## PROMPT MAÎTRE — Calculer la politique tarifaire LeadHarvest

> Ce prompt est conçu pour être copié-collé dans Claude à tout moment pour recalibrer le pricing.
> Compléter les valeurs entre crochets `[...]` avant de soumettre.

---

```
Tu es un expert en pricing SaaS B2B et en stratégie marketing.

## Contexte produit
LeadHarvest est un outil B2B de génération de leads ciblant les PME/artisans en France.
Il permet de générer une liste de prospects qualifiés, enrichie et scorée.
Modèle économique : système de crédits (jetons) achetés en packs ou inclus dans un abonnement.

## Stack de données et coûts API (sans tranche gratuite — pricing conservateur)

| Opération | Coût unitaire réel | Déclencheur |
|-----------|-------------------|-------------|
| Find Place (ID lookup) | 0 €/appel | Toujours |
| Places Details | [VALEUR ACTUELLE €/1000] | Toujours |
| Contact Data | [VALEUR ACTUELLE €/1000] | Toujours |
| Atmosphere Data | [VALEUR ACTUELLE €/1000] | Option activable |
| Scraping Pages Jaunes | [COÛT INFRA €/appel] | Toujours |

Coût d'un lead enrichi standard (sans Atmosphere) : [COÛT TOTAL CTS]/lead
Coût d'un lead enrichi premium (avec Atmosphere) : [COÛT TOTAL CTS]/lead

## Règles de pricing à respecter

1. **Marge brute minimale** : 65% sur tous les produits, 70% cible, 75%+ idéal
2. **Valeur du crédit** : 1 crédit = 1 lead enrichi standard (Places + Contact + PJ)
3. **Atmosphere Data** = option payante, désactivée par défaut, consomme 0.5 crédit additionnel
4. **Ne jamais tenir compte des tranches gratuites Google** dans le calcul — traiter chaque appel comme payant
5. **Prix psychologiques** : terminer en .90€ (ex : 4.90, 9.90, 44.90, 119.90)
6. **Progression logique** : chaque palier supérieur doit offrir un avantage clair en €/crédit
7. **Pack Découverte < 5€** : toujours prévoir un micro-pack d'entrée pour maximiser les conversions sans friction (pas de CB requise si possible, accès immédiat)
8. **Scoring — différenciation pack vs abonnement** :
   - **Packs (jetons)** : score global unique /100 affiché (résultat agrégé, non décomposé). L'utilisateur voit "ce lead est chaud" mais pas pourquoi.
   - **Abonnements** : scoring détaillé (décomposition des 5 critères avec leur poids individuel) + profil scoring personnalisable (l'utilisateur ajuste les poids selon son ICP, ex : priorité "pas de site web" vs "pas de GMB") + sauvegarde de profils nommés. C'est le principal levier de conversion pack → abonnement : la note globale donne envie, le scoring détaillé crée l'usage récurrent.

## Ce que je veux calculer

### A) 5 packs de crédits (achat one-shot, sans engagement)
Pour chaque pack, calculer et justifier :
- Nombre de crédits inclus
- Prix total HT
- Prix par crédit effectif (en cts)
- Remise vs prix plein (%)
- Marge brute (%)

Les 5 packs doivent couvrir les usages :
- **Découverte < 5€** : micro-pack d'entrée, friction zéro, pour tester sans engagement (~ 30-40 leads)
- Starter (~100 leads)
- Standard (~500 leads)
- Pro (~1500 leads)
- Expert (~5000 leads)

### B) 3 formules d'abonnement mensuel
Pour chaque abonnement, calculer et justifier :
- Nombre de crédits mensuels inclus (renouvelés chaque mois)
- Prix mensuel HT
- Prix par crédit effectif (en cts)
- Avantage financier vs achat de packs équivalents
- Marge brute (%)
- Avantages non-monétaires (rollover, accès, support, features)

Les 3 abonnements doivent couvrir les profils : indépendant/TPE (~350 leads/mois), PME croissance (~1000 leads/mois), agence/scale (~2500 leads/mois).

### C) Option Atmosphere Data (add-on)
- Mode à la volée : X crédits additionnels par lead (consommation directe)
- Mode flat fee mensuelle : prix pour ≤ 1000 leads/mois et prix pour volume illimité
- Justifier la marge sur les deux modes

### D) Règle des crédits supplémentaires
- Quel tarif appliquer pour les crédits achetés en plus d'un abonnement ?
- Formule simple et claire pour le client

## Format de sortie attendu

1. Tableau récap de toute la grille (packs + abonnements + add-on)
2. Pour chaque ligne : coût réel, prix, marge%
3. Une phrase de justification marketing pour chaque niveau (pourquoi ce prix est juste)
4. 3 alertes si une des marges passe sous 60%
5. Recommandation sur la valeur du crédit si elle doit évoluer

## Données actuelles à injecter avant calcul

- Places Details : [VALEUR] €/1000 appels
- Contact Data : [VALEUR] €/1000 appels
- Atmosphere Data : [VALEUR] €/1000 appels
- Scraping PJ estimé : [VALEUR] €/appel
- Nombre de leads générés le mois dernier : [N]
- Facture Google Maps du mois dernier : [X]€
- Valeur actuelle du crédit : [X] cts
```

---

## GRILLE TARIFAIRE EN VIGUEUR — v1.1 (2026-06-16)

### Coûts réels par opération (sans tranche gratuite)

| Opération | €/1000 appels | €/appel | Cts/appel |
|-----------|--------------|---------|-----------|
| Find Place (ID lookup) | 0.00 | 0.000000 | 0.00 |
| Places Details | 14.60 | 0.014604 | 1.46 |
| Contact Data | 2.58 | 0.002577 | 0.26 |
| Atmosphere Data *(option)* | 4.30 | 0.004295 | 0.43 |
| Scraping Pages Jaunes *(infra)* | 5.00 | 0.005000 | 0.50 |

**Coût d'un lead standard** (Places + Contact + PJ) : **2.22 cts/lead**
**Coût additionnel Atmosphere** : +0.43 cts/lead → lead premium = **2.65 cts/lead**

---

### Valeur du crédit

> **1 crédit = 0.10€** (10 centimes)
> 1 crédit = 1 lead enrichi standard
> Marge sur 1 crédit vendu au prix plein : **77.8%**

---

### 5 Packs de crédits (one-shot, sans engagement)

| Pack | Crédits | Prix | €/crédit | Coût réel | Marge | Scoring inclus |
|------|---------|------|----------|-----------|-------|----------------|
| **Pack Découverte** | 30 | **2.90€** | 9.7 cts | 0.67€ | 77.0% | Score global /100 |
| **Pack Starter** | 100 | **9.90€** | 9.9 cts | 2.22€ | 77.6% | Score global /100 |
| **Pack Standard** | 500 | **44.90€** | 9.0 cts | 11.09€ | 75.3% | Score global /100 |
| **Pack Pro** | 1 500 | **119.90€** | 8.0 cts | 33.27€ | 72.3% | Score global /100 |
| **Pack Expert** | 5 000 | **349.90€** | 7.0 cts | 110.90€ | 68.3% | Score global /100 |

**Remises progressives :** prix plein / -1% / -10% / -20% / -30% vs crédit plein tarif

> ⚡ **Pack Découverte** : pensé pour la conversion sans friction. Idéalement proposé sans saisie de CB (prépaiement via lien ou coupon). Objectif : laisser l'utilisateur vivre l'expérience complète sur 30 leads réels, voir le score global, et ressentir la limite du scoring non-détaillé.

**Justifications marketing :**
- Découverte : "Lancez-vous en 2 minutes — 30 leads enrichis pour 2.90€"
- Starter : "Testez sans risque — 100 leads pour moins de 10€"
- Standard : "La référence : 500 leads pour une prospection complète"
- Pro : "Pour les équipes actives : 1500 leads avec 20% d'économie"
- Expert : "Pour les agences et scale-ups : volume maximal, coût minimal"

---

### 3 Abonnements mensuels (crédits renouvelés chaque mois)

| Abonnement | Prix/mois | Crédits | €/crédit | Coût API | Marge | vs Pack équivalent |
|------------|-----------|---------|----------|----------|-------|--------------------|
| **Essentiel** | **29.90€** | 350 | 8.5 cts | 7.76€ | 74.0% | +1.53€ économie |
| **Croissance** | **69.90€** | 1 000 | 7.0 cts | 22.18€ | 68.3% | +19.90€ économie |
| **Scale** | **149.90€** | 2 500 | 6.0 cts | 55.45€ | 63.0% | +74.60€ économie |

#### Avantages inclus par abonnement

| Feature | Packs (jetons) | Essentiel | Croissance | Scale |
|---------|---------------|-----------|------------|-------|
| Crédits mensuels inclus | — | 350 | 1 000 | 2 500 |
| Rollover crédits non utilisés | ✗ (expiration 12 mois) | 1 mois | 2 mois | Illimité |
| **Score global /100** | ✅ | ✅ | ✅ | ✅ |
| **Scoring détaillé (5 critères)** | ✗ | ✅ | ✅ | ✅ |
| **Profil scoring personnalisable** | ✗ | ✅ | ✅ | ✅ |
| **Sauvegarde de profils scoring nommés** | ✗ | 1 profil | 3 profils | Illimité |
| Export Excel | ✗ | ✗ | ✅ | ✅ |
| Accès prioritaire (file de traitement) | ✗ | ✗ | ✅ | ✅ |
| Support par email | ✗ | Standard | Prioritaire | Dédié |
| Accès API (webhooks) | ✗ | ✗ | ✗ | ✅ |
| Multi-utilisateurs | 1 | 1 | 1 | 3 |
| Crédits supp. au tarif | Plein tarif | Standard (-10%) | Pro (-20%) | Pro (-20%) |

> 🎯 **Logique de conversion** : l'utilisateur de pack voit "ce lead score 78/100" → il veut savoir *pourquoi* → il passe à l'abonnement pour voir la décomposition et personnaliser les poids selon son activité cible.

**Justifications marketing :**
- Essentiel : "Pour l'indépendant qui prospecte régulièrement — moins de 1€/jour"
- Croissance : "Pour la TPE qui veut industrialiser sa prospection"
- Scale : "Pour les équipes et agences — volume, API et support dédié"

---

### Option Atmosphere Data

> Fiche GMB enrichie : note Google, nombre d'avis, niveau de prix, heures d'ouverture

**Mode à la volée** (activé par recherche) :
- Consomme **1.5 crédits** par lead au lieu de 1
- Soit +0.5 crédit = +5 cts/lead
- Coût réel : 0.43 cts → **marge 91.4%**

**Mode flat fee mensuelle** (activation permanente) :
- ≤ 1 000 leads/mois : **+9.90€/mois**
- Volume illimité : **+24.90€/mois**

---

### Règle des crédits supplémentaires

Dans tous les abonnements, les crédits additionnels (au-delà du quota mensuel) sont disponibles au tarif :
- **Essentiel** : tarif Pack Standard (9.0 cts/crédit)
- **Croissance** : tarif Pack Pro (8.0 cts/crédit)
- **Scale** : tarif Pack Pro (8.0 cts/crédit)

---

## Alertes et règles de contrôle

| Règle | Seuil | Statut actuel |
|-------|-------|---------------|
| Marge minimale sur packs | ≥ 65% | ✅ Toutes entre 68-78% |
| Marge minimale sur abonnements | ≥ 60% | ✅ Toutes entre 63-74% |
| Marge sur Atmosphere | ≥ 50% | ✅ 91% (à la volée) / 57% (flat fee) |
| Valeur du crédit vs coût réel | Ratio ≥ 4x | ✅ 4.5x (10 cts / 2.22 cts) |

**⚠ Seuil d'alerte :** Si le coût d'un lead standard dépasse **3.5 cts**, réviser la valeur du crédit à 12 cts.

---

## Évolutions tarifaires prévues

- **v1.2** : Introduire un tier "Agence" avec white-label et facturation client intégrée
- **v2.0** : Revoir à la baisse si volume mensuel > 50 000 leads (négociation tarif Google)

---

## Journal des modifications

| Version | Date | Changement |
|---------|------|------------|
| v1.0 | 2026-06-16 | Grille initiale — 4 packs + 3 abonnements |
| v1.1 | 2026-06-16 | Ajout Pack Découverte 2.90€ (30 crédits) + scoring différencié pack vs abonnement (global /100 pour les packs, détaillé + profil custom pour les abonnés) |
