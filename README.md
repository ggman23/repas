# 🥗 Mes Repas — planning diabète, recettes & liste de courses

Un outil **web, gratuit et hébergeable sur GitHub Pages** qui propose, pour chaque jour de l'année,
un repas du midi et du soir **adaptés au diabète** (index glycémique maîtrisé), avec des recettes
**très simples**, des produits courants, les **substitutions**, le **temps**, la **complexité /10**
et les **informations nutritionnelles**. Il inclut une **recherche intelligente**, des **favoris**
et une **liste de courses partagée** entre plusieurs appareils.

➡️ Une fois publié : **https://ggman23.github.io/repas/**

---

## ✨ Fonctionnalités

- **📅 Planning d'un an** — midi + soir pour les 365 jours, varié (jamais le même plat deux fois de suite,
  large rotation). Le planning est **identique sur tous les appareils** (généré de façon déterministe).
- **🍽️ 83 recettes** simples et diabète-friendly : pour chacune → ingrédients + quantités (pour 2),
  préparation pas-à-pas, **produits de substitution**, temps, complexité /10, calories, glucides,
  protéines, lipides, fibres, **index glycémique** et un lien vers des variantes.
- **🔍 Recherche en langage naturel** :
  - par ingrédient·s : `tomate carotte` → recettes contenant **tomate ET carotte** ;
  - par critère : `IG entre 40 et 60`, `glucides moins de 20`, `protéines plus de 30`,
    `moins de 20 min`, `facile`, `calories moins de 300`… (cumulables).
- **⭐ Favoris** — recettes **et** ingrédients ; affichage filtré des favoris.
- **🛒 Liste de courses** pensée pour le magasin :
  - envoi des ingrédients d'une ou **plusieurs recettes** (sélection multiple) ;
  - ajout d'articles libres (café, éponges…) ;
  - **rangée par rayon** ; on **touche un produit pour le cocher/l'enlever** ;
  - **listes enregistrées** réutilisables (vos courses habituelles) ;
  - « **Ajouter mes favoris** » en un geste ;
  - **📷 Photos par article** : prenez en photo le bon produit (ex. « gâteaux granola ») ; la liste
    n'affiche qu'un petit 📷, les images sont regroupées dans l'onglet **Photos**. Synchronisées si la
    synchro est active, mises en cache pour rester visibles hors-ligne (sinon une croix s'affiche).
- **📷 Photos de recettes** : ajoutez la photo de votre plat (synchronisée) ; sinon une jolie icône.
- **☁️ Synchronisation** entre vos appareils et ceux de votre famille (voir plus bas).
- **📱 Responsive + hors-ligne** — s'installe sur l'écran d'accueil du téléphone et fonctionne même
  sans réseau dans les rayons (service worker).

---

## 🚀 Mise en ligne (GitHub Pages) — 2 minutes

1. Fusionnez cette branche dans `main` (bouton *Merge* d'une Pull Request, ou en local).
2. Dépôt **`repas`** → **Settings → Pages**.
3. **Source : _Deploy from a branch_** → **Branch : `main`** → dossier **`/ (root)`** → **Save**.
4. Patientez ~1 min : le site est en ligne sur `https://ggman23.github.io/repas/`.

> Variante sans fusion : à l'étape 3 choisissez directement la branche `claude/loving-mccarthy-5hedzk`.
> Dans ce cas, indiquez cette même branche dans **Réglages → Branche des données**.

---

## ☁️ Activer la synchronisation (pour partager les courses)

Sans réglage, l'app fonctionne déjà en local sur chaque appareil. Pour que les listes/favoris soient
**partagés** (ex : votre épouse ajoute un article depuis son téléphone, vous le voyez dans le magasin),
il faut un **jeton GitHub**, à coller **une fois** sur chaque appareil :

1. **Réglages** (⚙️) dans l'app → suivez les étapes affichées, ou :
2. Créez un *fine-grained token* : <https://github.com/settings/personal-access-tokens/new>
   - *Repository access* → **Only select repositories** → `ggman23/repas`
   - *Permissions → Contents → **Read and write***
3. Collez le jeton dans **Réglages → Jeton GitHub**, vérifiez la **branche** (`main`), **Enregistrer**.
4. Refaites-le sur les autres téléphones/PC (même dépôt) → tout est synchronisé.

Le jeton reste **uniquement dans le navigateur** (jamais publié dans le code). Les données partagées
sont stockées dans `data/state.json`. Sur l'écran **Courses**, l'app se rafraîchit automatiquement.

---

## ➕ Ajouter ou modifier des recettes

Tout est dans `scripts/build_recipes.py` (un bloc `R(...)` par recette). Ajoutez le vôtre puis :

```bash
python3 scripts/build_recipes.py   # régénère data/recipes.json
```

Le planning annuel s'enrichit automatiquement des nouvelles recettes.

---

## 🗂️ Structure

```
index.html              page unique
assets/css/style.css    design (responsive, mobile-first)
assets/js/config.js     réglages (dépôt, graine du planning…)
assets/js/store.js      état + sauvegarde locale + synchro GitHub
assets/js/recipes-plan.js  chargement recettes, planning, recherche, rayons
assets/js/ui.js         écrans + interactions
assets/js/app.js        démarrage
data/recipes.json       les 83 recettes (généré)
data/state.json         données partagées (favoris, courses…)
scripts/build_recipes.py  générateur de recettes
sw.js                   mode hors-ligne
```

---

## ⚠️ Avertissement santé

Les valeurs nutritionnelles et l'index glycémique sont **estimés et approximatifs**, fournis à titre
indicatif. Ils **ne remplacent pas** l'avis d'un médecin ou d'un diététicien. Adaptez les quantités à
votre traitement et à vos besoins. Ressource utile :
[recettes de la Fédération Française des Diabétiques](https://www.federationdesdiabetiques.org/diabete/recettes).
