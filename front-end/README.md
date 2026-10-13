# ConciliaBulle · Front-end

Prise de rendez-vous avec un **conciliateur de justice**, « à la Doctolib », pensée pour
un public qui comprend beaucoup de personnes âgées peu à l'aise avec l'informatique.
Deux espaces : le **justiciable** (recherche, réservation, suivi de son dossier) et le
**conciliateur** (tableau de bord, agenda, paramétrage, dossiers, réglages du service).

Next.js 16 (App Router, `cacheComponents`), React 19, Tailwind CSS 4. Aucune autre dépendance.

## Démarrer

Il faut l'API Django (voir le [README racine](../README.md)) : `python manage.py runserver` dans `backend/`,
après `seed_demo` pour avoir des comptes et des créneaux.

```bash
cp .env.example .env.local   # API_URL (défaut : http://localhost:8000/api/v1), SESSION_SECRET, FAKE_LATENCY
npm install
npm run dev                  # http://localhost:3000
```

En production, **`SESSION_SECRET`** est obligatoire (longue chaîne aléatoire) : elle signe le cookie de
session, et la connexion échoue sans elle. Node 20.9 ou plus.

Avant de pousser : `npx next typegen && npx tsc --noEmit && npm run lint && npm run build`.

## Comptes de démonstration

Ce sont ceux de `python manage.py seed_demo` côté API, mot de passe **`Demo-pass-2026!`**
(la commande affiche la liste) :

| Email                      | Statut         | Ce qu'il voit                                  |
| -------------------------- | -------------- | ---------------------------------------------- |
| `alice.durand@demo.fr`     | `justiciable`  | Recherche, rendez-vous déjà pris               |
| `jean.martin@demo.fr`      | `conciliateur` | Espace conciliateur `/pro` (Lyon, vérifié)     |

## Ce qui vient de l'API, et ce qui est encore fictif

Branché sur l'API (`src/lib/api/`, `src/lib/auth/`) : comptes et connexion (JWT gardé dans le cookie de
session signé, jamais dans le navigateur), annuaire et créneaux, réservation / changement / annulation,
rendez-vous du conciliateur, horaires récurrents, profil, notifications, lien d'agenda `.ics`, candidatures.

**Encore en mémoire** (`src/lib/api/store.ts`, perdu au redémarrage du serveur) car l'API n'a pas ces
fonctions : dossiers de conciliation et leurs codes, demandes de rappel, réglages du service, présence
et notes sur un rendez-vous. Les écrans correspondants ne reflètent donc pas la base réelle.

## Côté justiciable

| Page                              | Rôle                                                                  | Connexion |
| --------------------------------- | --------------------------------------------------------------------- | --------- |
| `/conciliateurs`                  | Recherche par nom ou ville, région, type de litige, disponibilité     | Non       |
| `/conciliateurs/[id]`             | Fiche (lieu de permanence, gratuité) et créneaux par semaine          | Non       |
| `/rendez-vous/nouveau?creneau=…`  | Réservation en 3 étapes : motif → type de rendez-vous → vérification  | Oui       |
| `/mes-rendez-vous`                | Rendez-vous à venir / passés et annulés                               | Oui       |
| `/mes-rendez-vous/[id]`           | Détail, agenda (.ics), impression, changer la date, annuler           | Oui       |
| `/mon-dossier`                    | Dossier rejoint avec un code, réunions de conciliation                | Oui       |
| `/etre-rappele`                   | Demande de rappel, sans prendre rendez-vous                           | Non       |

## Côté conciliateur (`/pro`)

| Page                                | Rôle                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `/pro`                              | Tableau de bord : aujourd'hui, à renseigner (venu / absent), à venir, chiffres    |
| `/pro/agenda?semaine=N`             | Agenda semaine par semaine, absences signalées                                    |
| `/pro/rendez-vous/[id]`             | Coordonnées du justiciable, présence, note privée, ouvrir un dossier, annuler     |
| `/pro/parametres`                   | Réservation ouverte / en pause, horaires par demi-journée, durée, délai, horizon  |
| `/pro/parametres/absences`          | Congés et absences, avec les rendez-vous déjà pris pendant ces jours              |
| `/pro/parametres/profil`            | Fiche publique : lieu, adresse, téléphone, présentation, litiges, types de RDV    |
| `/pro/demandes`                     | Personnes à rappeler, demandes de changement de réunion                           |
| `/pro/dossiers`, `/pro/dossiers/[id]` | Dossiers : codes des parties à imprimer, réunions (ajout, déplacement), clôture |

Tout ce que le conciliateur règle s'applique immédiatement côté public : horaires, durée,
absences, pause des réservations, fiche.

## Réglages du service (`/pro/parametres/reglages`)

Dernier onglet des paramètres du conciliateur. Ces réglages valent pour tout le service
(tous les conciliateurs et l'espace justiciable) ; un bouton rétablit les valeurs par défaut.

| Réglage                                   | Par défaut          | Effet                                                         |
| ----------------------------------------- | ------------------- | ------------------------------------------------------------- |
| Durée maximale d'une session              | 8 heures            | Reconnexion obligatoire au-delà                               |
| Déconnexion après inactivité              | 30 minutes          | « Jamais » possible ; message explicite à la reconnexion      |
| Essais du code dossier                    | 5                   | Au-delà, le justiciable doit contacter son conciliateur       |
| Modifier / annuler en ligne jusqu'à       | 24 h avant          | Après, seul le téléphone du conciliateur est proposé          |
| Rendez-vous à venir par personne          | 3                   | « Sans limite » possible ; message clair si la limite est atteinte |
| Durées de rendez-vous proposées           | 30, 45, 60 min      | Choix offerts dans l'onglet Horaires                          |
| Durée d'une réunion de conciliation       | 1 h                 | Réunions ajoutées aux dossiers                                |
| Rappels SMS                               | la veille           | Texte affiché au justiciable à la réservation                 |
| Délai promis pour rappeler                | 2 jours ouvrés      | Pages « Être rappelé »                                        |
| Numéro d'aide                             | 0 800 000 000       | Pied de page, connexion, réservation                          |
| Bandeau d'information                     | désactivé           | Message en haut de toutes les pages                           |

Les limites de session sont **inscrites dans le cookie signé à la connexion** : une
modification s'applique aux connexions suivantes. Le proxy (`src/proxy.ts`) vérifie la
signature, la durée maximale et l'inactivité à chaque requête, et met à jour l'heure de
dernière activité (au plus une fois par minute).

## Règles métier choisies (modifiables)

- La conciliation est **gratuite** ; elle porte sur le voisinage, le logement, la
  consommation, les sommes dues, les travaux et les litiges entre professionnels
  (pas le droit de la famille ni le droit du travail).
- Un rendez-vous se modifie ou s'annule en ligne jusqu'à **24 h** avant (réglable dans
  les réglages du service).
- Les **réunions de conciliation** d'un dossier ne s'annulent jamais en ligne : le
  justiciable envoie une **demande**, le conciliateur le rappelle et déplace la réunion.
  Ainsi, l'autre partie ne peut rien annuler à la place du justiciable.
- Pour rejoindre un dossier, il faut être connecté **et** saisir le code
  personnel remis par le conciliateur. Chaque partie a le sien ; un justiciable ne voit
  jamais l'autre partie. Le justiciable du rendez-vous d'origine est rattaché d'office.
- Quand le conciliateur annule un rendez-vous, le justiciable voit son message et un lien
  pour reprendre un créneau.
- À la connexion, un email inconnu et un mauvais mot de passe donnent le même message,
  pour qu'on ne puisse pas savoir si quelqu'un a un compte.

## Structure

```
src/
  app/                   Routes (pages, actions serveur, route .ics)
    actions/             Actions serveur : auth, rendez-vous, dossiers, rappels, pro
    pro/                 Espace conciliateur
  components/
    ui/                  Briques de base : Button, Input, Card, Badge, Alert, Icon, tones…
    layout/              En-tête, menus, pied de page, Container, PageHeading, BackLink
    conciliateurs/       Recherche, carte, grille de disponibilités, navigation par semaine
    booking/             Étapes de réservation, cartes de choix, récapitulatif
    appointments/        Carte de rendez-vous, « À préparer », bouton imprimer
    dashboard/           Accueil justiciable
    pro/                 Ligne d'agenda, statuts, bandeau, tuiles, onglets, choix d'heure
  lib/
    api/                 Faux backend + types = contrat d'API
      store.ts           Base en mémoire et jeu de démonstration
      schedule.ts        Horaires → créneaux (fonctions pures)
    auth/                Session signée (token.ts), faux backend d'auth, gardes requireClient / requirePro
    format.ts            Dates en toutes lettres (« mardi 24 octobre à 14 h 30 »)
  proxy.ts               Redirige vers /login les pages privées sans cookie de session
```

## Brancher la vraie API

Tout appel au backend passe par `src/lib/api/` et `src/lib/auth/fake-api.ts`. Chaque
fonction indique en commentaire l'appel HTTP qu'elle remplace : il suffit d'en réécrire le
corps avec `fetch`, sans toucher aux pages. Les types partagés sont dans
`src/lib/api/types.ts`. Les erreurs sont levées en `ApiError(status, message)`.

**Authentification et justiciable**

| Fonction                 | Appel HTTP                                          | Erreurs                      |
| ------------------------ | --------------------------------------------------- | ---------------------------- |
| `apiLogin`               | `POST /auth/login { email, password }`              | identifiants incorrects      |
| `apiGetMe`               | `GET /auth/me`                                      | –                            |
| `searchConciliateurs`    | `GET /conciliateurs?q=&region=&domaine=&mode=&dispo=` | –                          |
| `getConciliateur`        | `GET /conciliateurs/:id`                            | 404                          |
| `getWeekSlots`           | `GET /conciliateurs/:id/slots?from=&to=`            | –                            |
| `getSlot`                | `GET /slots/:id`                                    | 404                          |
| `createAppointment`      | `POST /appointments { slotId, mode, motif }`        | 409 créneau pris ou limite atteinte (`code: "limite"`) |
| `listMyAppointments`     | `GET /me/appointments?scope=upcoming\|past`         | –                            |
| `getAppointment`         | `GET /appointments/:id`                             | 404                          |
| `rescheduleAppointment`  | `PATCH /appointments/:id { slotId }`                | 403 hors délai, 409          |
| `cancelAppointment`      | `POST /appointments/:id/cancel { motif? }`          | 403 hors délai               |
| `joinDossier`            | `POST /dossiers/join { code }`                      | 404 code inconnu, 403 essais |
| `listMyDossiers`         | `GET /me/dossiers`                                  | –                            |
| `getDossier`             | `GET /dossiers/:id`                                 | 404                          |
| `requestSeanceChange`    | `POST /dossiers/:id/seances/:sid/change-requests`   | 409 demande déjà en cours    |
| `createCallbackRequest`  | `POST /callbacks`                                   | –                            |

**Réglages du service** (`src/lib/api/reglages.ts`)

| Fonction                                       | Appel HTTP                     | Erreurs                  |
| ---------------------------------------------- | ------------------------------ | ------------------------ |
| `getPlatformSettings` / `savePlatformSettings` | `GET` / `PUT /reglages`        | 400 valeur non autorisée |
| `resetPlatformSettings`                        | `POST /reglages/reset`         | –                        |

**Conciliateur** (`src/lib/api/pro.ts` — l'identifiant vient toujours de la session)

| Fonction                                 | Appel HTTP                                         | Erreurs                 |
| ---------------------------------------- | -------------------------------------------------- | ----------------------- |
| `getDashboard`                           | `GET /pro/dashboard`                               | –                       |
| `getAgenda`                              | `GET /pro/agenda?from=&to=`                        | –                       |
| `getProAppointment`                      | `GET /pro/appointments/:id`                        | 404                     |
| `setPresence`                            | `POST /pro/appointments/:id/presence`              | 409 pas encore eu lieu  |
| `cancelByConciliateur`                   | `POST /pro/appointments/:id/cancel { message }`    | 409                     |
| `saveNote`                               | `PUT /pro/appointments/:id/note`                   | 404                     |
| `getParametres` / `saveParametres`       | `GET` / `PUT /pro/settings`                        | 400 plage trop courte   |
| `setReservationOuverte`                  | `PUT /pro/profile { reservationOuverte }`          | –                       |
| `addAbsence` / `removeAbsence`           | `POST` / `DELETE /pro/absences`                    | 400 dates               |
| `getProfil` / `saveProfil`               | `GET` / `PUT /pro/profile`                         | 400 aucun litige / mode |
| `listDemandes` / `markRappelTraite`      | `GET /pro/requests`, `POST /pro/callbacks/:id/done` | 404                    |
| `listProDossiers` / `getProDossier`      | `GET /pro/dossiers[/:id]`                          | 404                     |
| `openDossier`                            | `POST /pro/dossiers { rendezVousId, autrePartie, objet }` | 409 déjà ouvert  |
| `addSeance` / `moveSeance`               | `POST` / `PATCH /pro/dossiers/:id/seances[/:sid]`  | 400 date passée         |
| `closeDossier`                           | `POST /pro/dossiers/:id/close { issue }`           | 404                     |

## Conventions

- **Next 16 avec `cacheComponents`** : tout ce qui lit la session, l'URL ou les données se
  trouve dans un composant sous `<Suspense>`. Les pages passent `params` / `searchParams`
  (des promesses) à ce composant. Le faux backend appelle `connection()` (voir
  `src/lib/api/latency.ts`) pour ne jamais être exécuté au pré-rendu. La doc de cette
  version est dans `node_modules/next/dist/docs/`.
- **Sécurité** : chaque action serveur revérifie la session (`requireClient()`
  ou `requirePro()`). Le proxy applique les limites de session ; les
  pages vérifient à nouveau signature et dates.
- **État dans l'URL** : critères de recherche, semaine affichée, étape de réservation,
  messages de succès ou d'erreur après une action. Les formulaires fonctionnent sans
  JavaScript (sauf connexion, rappel et code dossier, voir limites).
- **Accessibilité** (à respecter dans les nouvelles pages) :
  - texte courant en 18 px (`text-base`), jamais en dessous de `text-xs` (14 px) ;
  - boutons d'au moins 40 px, 48 px pour l'action principale (`size="lg"`) ;
  - dates en toutes lettres via `src/lib/format.ts`, jamais « 24/10 14:30 » ;
  - une action principale par écran, libellés visibles au-dessus des champs ;
  - pas de `className` qui change la couleur d'un `buttonClasses(...)` : ajoutez plutôt
    une variante dans `button.tsx` (deux classes de couleur entrent en conflit) ;
  - SMS, agenda et notifications restent neutres : pas de nom de l'autre partie.
- Mode clair uniquement (les classes `dark:` ne s'activent qu'avec une classe `.dark`).

## Limites connues

- Données en mémoire, réinitialisées au redémarrage.
- Si JavaScript est désactivé, les messages d'erreur des formulaires de connexion, de
  rappel et de code dossier ne s'affichent pas (l'envoi réussi fonctionne).
- Les SMS (confirmation, rappel, annulation) sont annoncés à l'écran mais pas envoyés.
- FranceConnect n'est pas intégré : il demande une convention avec l'État.
- Numéro d'aide « 0 800 000 000 » à remplacer.
- Un conciliateur gère une seule fiche ; pas encore de compte « tribunal » qui
  administrerait plusieurs conciliateurs.
