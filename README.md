# Kambuyam Home

Plateforme de location et de vente immobilière à Douala et Yaoundé, « l'Airbnb camerounais ».
Le site est en HTML/CSS/JavaScript simple, hébergé sur **Netlify**. Les données (comptes, annonces, photos, réservations) sont dans **Supabase**.

## Ce que fait le site

- **Visiteurs** : recherche par ville, type, séjour/location/achat et budget, fiche détaillée avec photos.
- **Clients** : inscription, réservation de séjours (dates, prix calculé par le serveur), demandes de visite, suivi et annulation dans « Mes réservations ».
- **Propriétaires** : espace pour publier et modifier leurs biens avec photos, accepter ou refuser les demandes, suivre leurs revenus après la commission de 3 %.
- **Administrateur** : validation des annonces avant publication, mise à la une, suivi de toutes les réservations, des commissions et des utilisateurs.
- **Paiement** : Orange Money / MTN MoMo est **simulé** pour l'instant (étape 3 du projet : CinetPay, Notch Pay ou Campay).

Sans configuration Supabase (`config.js` vide), le site tourne en **mode démonstration** : une base locale ([`demo-backend.js`](demo-backend.js)) imite Supabase dans le navigateur du visiteur, avec trois comptes de test en un clic (client, propriétaire, admin, mot de passe `demo123`). Rien n'est envoyé ni partagé entre visiteurs.

## Mise en route (une seule fois)

### 1. Créer la base dans Supabase
1. Ouvre ton projet sur supabase.com, puis **SQL Editor** › **New query**.
2. Copie tout le contenu de [`supabase/schema.sql`](supabase/schema.sql), colle-le et clique sur **Run**.

### 2. Régler les adresses du site
**Authentication** › **URL Configuration** :
- *Site URL* : `https://kambuyam.com`
- *Redirect URLs* : ajoute `https://kambuyam.com/**` et `https://gleaming-dango-85cd77.netlify.app/**`

### 3. Brancher le site
**Project Settings** › **API** (ou **Data API**) : copie **Project URL** et la clé **anon public** dans [`config.js`](config.js).
Ces deux valeurs sont faites pour être publiques. Ne mets **jamais** la clé `service_role` ni le mot de passe de la base dans le site.

### 4. Devenir administrateur et ajouter les annonces Soft Time
1. Sur le site, crée ton compte (Connexion › Créer un compte) et confirme ton e-mail.
2. Dans **SQL Editor**, exécute en remplaçant l'e-mail :
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'TON_EMAIL@exemple.com');
   ```
3. Exécute ensuite [`supabase/seed.sql`](supabase/seed.sql) : il ajoute les 6 logements de la Résidence Soft Time.

### 5. Mise en ligne automatique
Dans Netlify : **Site configuration** › **Build & deploy** › **Link repository** › GitHub › `kambuyam-home`.
Laisse la commande de build vide et le dossier de publication à `.`. Chaque modification poussée sur GitHub sera en ligne en une minute.

## Bon à savoir

- **E-mails** : Supabase envoie peu d'e-mails par heure avec son service par défaut. Avant le lancement public, branche un service d'envoi (par exemple Brevo, gratuit jusqu'à 300 e-mails par jour) dans **Authentication** › **Emails** › **SMTP Settings**.
- **Sécurité** : les règles sont dans la base. Un client ne peut pas modifier un prix ni confirmer sa propre réservation. Un propriétaire ne voit que ses biens et ses clients. Une annonce modifiée repasse en validation. Deux réservations confirmées ne peuvent pas se chevaucher.
- **Commission** : 3 % calculés automatiquement sur chaque réservation, à la charge du propriétaire (à confirmer).

## Structure

```
index.html        pages du site
styles.css        apparence
app.js            fonctionnement (annonces, comptes, réservations, espaces)
config.js         connexion à Supabase
demo-backend.js   base de démonstration locale (utilisée si config.js est vide)
vendor/           bibliothèque Supabase (copie locale, version 2.119.2)
img/              logo et photos
supabase/         schema.sql (base et sécurité), seed.sql (annonces de départ)
```
