# Veille IA Web

Version web React du projet Veille IA, migrée à partir de l'ancien dépôt Flutter `Morgan-Moline/veille-ia-app`.

## Architecture

- `frontend/` : interface React + Vite, responsive desktop/mobile.
- `server/` : API Node.js / Express qui sert de relais vers le dépôt de données et le Worker Cloudflare.
- Source d'actualités : `Morgan-Moline/veille-ia-data`, fichier `data.json`.
- L'application Flutter reste indépendante dans `Morgan-Moline/veille-ia-android`.

## Fonctionnalités reprises / intégrées

- Les trois thèmes historiques : Comptabilité & fiscalité, BTS Comptabilité-Gestion, Secteur professionnel.
- Codes couleur historiques : bleu/orange, bleu, rouge.
- Visuels des trois thèmes réutilisés depuis les assets publics de l'ancien dépôt Flutter.
- Chargement des articles publiés dans `data.json`, tri chronologique et dédoublonnage par lien.
- Résumés IA enregistrés dans les données, affichés sur les cartes.
- Recherche plein texte, filtres Tous / Non lus / Favoris / Lus, compteurs et tri.
- Favoris et lecture persistés dans le navigateur via `localStorage`.
- Ouverture de la source originale et marquage automatique comme lu.
- Actualisation manuelle des articles.
- Déclenchement protégé d'une nouvelle veille avec secret, puis surveillance de la date `updated_at` jusqu'à 8 minutes.
- Module d'entraînement BTS CG avec questions, corrections et score.
- Interface responsive avec navigation latérale, cartes d'articles, tableaux de bord et états de chargement/erreur.

## Prérequis

- Node.js 20 ou supérieur recommandé.
- npm.

## Installation et lancement en développement

```bash
npm install
cp .env.example .env
npm run dev
```

- Interface : http://localhost:5173
- API : http://localhost:3001/api/health

Sous Windows PowerShell, si `cp` n'est pas reconnu :

```powershell
Copy-Item .env.example .env
```

## Construire et démarrer

```bash
npm run build
npm start
```

Le serveur Express sert alors le frontend compilé depuis `dist/` sur le port 3001.

## Configuration

Les valeurs par défaut sont déjà renseignées dans `server/index.js`. Tu peux les remplacer dans `.env` :

```env
PORT=3001
DATA_URL=https://raw.githubusercontent.com/Morgan-Moline/veille-ia-data/main/data.json
TRIGGER_URL=https://veille-ia-trigger.themomo450.workers.dev/
```

Le secret de déclenchement est demandé à l'utilisateur au moment de lancer la veille. Il n'est ni écrit dans le dépôt ni sauvegardé dans le navigateur.

## Notes importantes

- Les images de catégories sont servies depuis les fichiers publics de l'ancien dépôt `veille-ia-app` pour éviter de dupliquer plusieurs mégaoctets d'assets dans ce ZIP. Si l'ancien dépôt est renommé ou rendu privé, il faudra copier les images dans `frontend/public/images/` et modifier les URLs dans `frontend/src/App.jsx`.
- Les favoris et les articles lus sont propres au navigateur utilisé. Une synchronisation multi-appareils nécessitera un stockage utilisateur commun côté API.
- Le module BTS CG reprend les principaux thèmes d'entraînement de l'ancienne application. La banque de questions est volontairement autonome côté web ; elle pourra être enrichie en poursuivant la migration de la banque Flutter complète.
- L'API Node sert de relais pour éviter les problèmes CORS lors de l'accès à GitHub et au Worker depuis le navigateur.
