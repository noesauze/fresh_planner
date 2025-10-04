# Fresh Planner Hub

Une application web pour gérer ses recettes, planifier ses repas, et générer automatiquement la liste de courses.

## 🚀 Fonctionnalités

- **📖 Recettes** : Import automatique depuis des URLs (schema.org/Recipe), CRUD complet
- **📅 Planning** : Planification des repas par date et type de repas, ajustement des portions
- **🛒 Panier intelligent** : Calcul automatique avec arrondi aux packs vendus, estimation des coûts
- **📦 Inventaire** : Gestion du stock d'ingrédients pour optimiser les achats
- **⚙️ Préférences** : Régime alimentaire, budget, ingrédients exclus, magasins favoris
- **🔍 Recherche produits** : Intégration Open Food Facts (gratuit) + GS1 (optionnel)

## 🛠️ Stack technique

- **Frontend** : Vite + React + TypeScript, Tailwind CSS, shadcn/ui
- **Data** : Supabase (PostgreSQL + Storage). Fallback localStorage quand non configuré
- **State/Async** : TanStack Query
- **Validation** : Zod

## 📋 Prérequis

- Node.js 18+
- Compte Supabase (project URL + keys)

## 🚀 Installation

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd fresh-planner-hub
   npm install
   ```

2. **Configuration Supabase (optionnelle mais recommandée)**
   - Crée un fichier `.env.local` à la racine avec:
   ```bash
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Démarrer l'application**
   ```bash
   npm run dev
   ```

L'application sera accessible sur le port 5173 (par défaut Vite).

---

## 🗄️ Supabase: Schéma, Bucket, Seed (tout depuis le repo)

Ce projet inclut tout ce qu'il faut pour initialiser la bdd et les données de démo.

- Schéma: `supabase/schema.sql`
- Données d'exemple: `supabase/sampleRecipes.json`
- Script de seed: `scripts/seedSupabase.mjs`

### 1) Appliquer le schéma

Option A (recommandé): ouvre l'éditeur SQL Supabase et colle le contenu de `supabase/schema.sql` puis exécute.

Option B (via script, si fonction RPC SQL dispo): le script essaiera d'exécuter le SQL, sinon affichera une note pour le faire manuellement.

### 2) Créer le bucket Storage

- Crée un bucket public nommé `images` (via l'UI Storage). Le script de seed vérifiera sa présence et t'alertera si absent.

### 3) Seed des recettes d'exemple

Définis les variables et lance le script:
```bash
export SUPABASE_URL=your_project_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npm run supabase:seed
```

- Le script insère `sampleRecipes.json` si la table `recipes` est vide.

### 4) Variables d'environnement (runtime frontend)

Dans `.env.local` (Vite):
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Avec ces variables, l'app:
- Charge les recettes depuis Supabase (table `recipes`).
- Si la table est vide au premier run, l'app seed automatiquement à partir de `sampleRecipes` embarquées.
- Upload les images dans le bucket `images` si tu ajoutes une recette avec une photo (base64 → upload → URL publique).
- À défaut de config Supabase, l'app fonctionne en local-only via localStorage (sans images volumineuses persistées).

### 5) Politiques RLS (pour dev)

`schema.sql` active la RLS et définit des policies permissives pour `select/insert` (et `update` pour le catalogue d'ingrédients) sur le rôle `anon`. Adapte ces policies pour la prod (Auth, row ownership, etc.).

## 📚 Utilisation

### Première utilisation

1. **Configurer les préférences** : Régime alimentaire, budget, magasins favoris
2. **Importer une recette** : Colle l'URL d'une recette en ligne
3. **Planifier des repas** : Ajoute des repas au planning avec portions
4. **Calculer le panier** : Génère automatiquement la liste de courses

### Ajout d'une recette

- Bouton "Add New Recipe" → formulaire avec: image (URL ou upload), nom, description, temps, portions, difficulté, tags, instructions, ingrédients.
- Les ingrédients sont suggérés depuis un catalogue (Supabase). S'ils n'existent pas, ils sont ajoutés automatiquement au catalogue.

### Calcul du panier

Le système calcule automatiquement :
- Les besoins totaux par ingrédient
- La déduction du stock existant
- L'arrondi aux formats vendus (packs)
- L'estimation des coûts
- Les restes après utilisation

## 🔧 Notes techniques

- Les images uploadées côté formulaire sont compressées côté client pour réduire la taille avant l'upload/localStorage.
- `crypto.randomUUID()` est utilisé pour les identifiants côté client.
- Sans Supabase, les nouvelles recettes sont stockées en localStorage et fusionnées avec les recettes d'exemple.

## 📖 Documentation

- [SETUP.md](./SETUP.md) - Configuration détaillée
- [Architecture](./hello_fresh_perso_next_js_supabase_app_mvp.md) - Blueprint complet du projet

## 🤝 Contribution

Ce projet est un MVP. Les améliorations futures incluent :
- Interface utilisateur plus riche (shadcn/ui)
- Gestion des unités de mesure avancées
- Suggestions de recettes basées sur les restes
- Intégration multi-magasins avancée
- Export vers d'autres formats

## 📄 Licence

Projet personnel - utilisation libre