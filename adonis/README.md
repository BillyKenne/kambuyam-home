# Kambuyam Home, version AdonisJS

Le même site que Kambuyam Home (même design, mêmes rubriques), mais avec un **vrai serveur** en [AdonisJS](https://adonisjs.com) :
les comptes, les annonces, les photos et les réservations sont enregistrés sur le serveur, plus dans le navigateur du visiteur.

> Le site actuellement en ligne (kambuyam.com, GitHub Pages) reste dans le dossier parent et **n'est pas modifié**.

## Ce que fait le serveur

| Partie | Où |
| --- | --- |
| Page du site (Edge) | `resources/views/pages/home.edge`, styles et images dans `public/` |
| Script du site | `public/app.js` (identique à l'ancien, mais parle au serveur via `/api/…`) |
| Adresses de l'API | `start/routes.ts` |
| Comptes, connexion (sessions) | `app/controllers/auth_controller.ts`, `app/models/user.ts` |
| Annonces (validation par l'admin, mise à la une) | `app/controllers/listings_controller.ts` |
| Réservations, prix et commission de 3 % calculés par le serveur | `app/controllers/bookings_controller.ts`, `app/services/rules.ts` |
| Photos des annonces | `app/controllers/uploads_controller.ts` (rangées dans `public/uploads`) |
| Tables de la base (SQLite) | `database/migrations/` |
| Données de démonstration (Soft Time + exemples, comptes de test) | `app/services/demo_data.ts` |

Les règles sont les mêmes qu'avant : un client ne voit que ses réservations, un propriétaire ne gère que ses biens,
toute modification d'annonce par un propriétaire repasse « en attente de validation », seul l'admin publie et met à la une,
on ne peut pas réserver des dates déjà prises. Le paiement Orange Money / MTN MoMo est toujours **simulé**.

## Mode démonstration

Avec `DEMO_MODE=true`, la page Connexion propose trois comptes de test en un clic (mot de passe `demo123`) :
`client@demo.cm`, `proprio@demo.cm`, `admin@demo.cm`, et un bouton « Remettre à zéro ».
Les données de test sont **partagées entre visiteurs**. Mettre `DEMO_MODE=false` pour le vrai lancement.

## Lancer sur un ordinateur

Il faut Node.js 22 ou plus récent.

```bash
cd adonis
npm install
cp .env.example .env
node ace generate:key
node ace migration:run
npm run dev            # puis ouvrir http://localhost:3333
```

## Mettre en ligne

- **Render** (gratuit pour essayer) : le fichier [`../render.yaml`](../render.yaml) décrit tout.
  Sur render.com : *New* › *Blueprint* › choisir le dépôt `kambuyam-home`. Render construit et lance le site, et donne une adresse en `onrender.com`.
  Sur l'offre gratuite, le serveur s'endort après 15 minutes sans visite (premier chargement lent) et la base repart de zéro à chaque redémarrage :
  parfait pour une démonstration, pas pour le vrai lancement.
- **N'importe quel hébergeur Docker** : le [`Dockerfile`](Dockerfile) est prêt. Variables à donner : `APP_KEY` (secrète, `node ace generate:key`),
  et pour garder les données, un disque permanent avec `DB_PATH` pointant dessus.

Pour le vrai lancement il faudra un serveur payant (quelques dollars par mois) avec un disque permanent, puis faire pointer kambuyam.com dessus.

## Commandes utiles

- `node ace db:seed` : remet les données de démonstration.
- `npm run typecheck` : vérifie le code TypeScript.
