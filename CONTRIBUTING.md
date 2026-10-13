# Contribuer à ConciliaBulle

Merci de vouloir aider ! Les contributions passent toutes par une **Pull Request vers `main`**.

## 1. Mettre en place
Suis « Démarrer l'API » dans le [README](README.md) (sans oublier `cp backend/.env.example backend/.env`). Vérifie que tout est vert avant de commencer :

```bash
cd backend && python manage.py test
```

## 2. Workflow
1. Mets `main` à jour, puis crée une branche depuis `main` :
   ```bash
   git switch main && git pull
   git switch -c feat/ma-fonctionnalite
   ```
   Préfixes de branche : `feat/`, `fix/`, `docs/`, `chore/`, `test/`, `refactor/`.
2. Fais des **commits petits et fréquents** (un changement logique = un commit).
3. Pousse et ouvre une PR vers `main` en remplissant le modèle de PR.
4. Quand la CI est verte, tu peux fusionner (**squash** de préférence). Aucune relecture n'est obligatoire, mais n'hésite pas à en demander une pour un changement délicat.

`main` est protégée : on ne pousse jamais dessus directement, tout passe par une PR, et les jobs `backend` et `docker image builds` de la CI doivent être verts avant de pouvoir fusionner.

## 3. Messages de commit : Conventional Commits
Format : `type(portée): description à l'impératif, en minuscules, sans point final`

| Type | Quand |
|---|---|
| `feat` | nouvelle fonctionnalité |
| `fix` | correction de bug |
| `docs` | documentation uniquement |
| `test` | ajout/modification de tests |
| `refactor` | changement de code sans changement de comportement |
| `chore` | outillage, dépendances, config |

La portée est le module touché : `accounts`, `conciliateurs`, `appointments`, `health`, `docs`… Exemples :

```
feat(appointments): allow conciliateurs to cancel an appointment
fix(conciliateurs): hide slots of unverified conciliateurs
docs: explain how to generate a TypeScript client
```

Changement cassant (route renommée, champ retiré) : ajoute `!` (`feat(accounts)!: ...`) et explique-le dans le corps du commit.

## 4. Avant d'ouvrir la PR : checklist
La **CI** (GitHub Actions) rejoue tout ça sur chaque PR et bloque si quelque chose casse, mais mieux vaut le voir en local. Depuis `backend/` :

```bash
pip install -r requirements-dev.txt                       # une fois (ajoute ruff)
ruff check .                                              # lint (ruff check --fix corrige l'essentiel)
python manage.py test                                     # tout passe
python manage.py makemigrations --check --dry-run         # "No changes detected" (sinon commite la migration)
python manage.py spectacular --validate --fail-on-warn    # le schéma OpenAPI reste valide
```

Pour que le lint tourne tout seul à chaque commit : `pip install pre-commit && pre-commit install` (à la racine).

Et aussi :
- **Tests** : toute nouvelle règle ou route a ses tests (voir `apps/*/tests.py` pour le style).
- **Swagger** : toute nouvelle vue a `@extend_schema(tags=[...])` ; un test échoue sinon.
- **Docs à jour** : route ou règle changée → [`.claude/CLAUDE.md`](.claude/CLAUDE.md) ; modèle changé → schéma Mermaid de [`backend/README.md`](backend/README.md).
- **Pas de secrets**, pas de `.env`, pas de `db.sqlite3`, pas de `.venv`, pas de fichiers d'IDE dans la PR. Une nouvelle variable d'environnement se déclare dans `.env.example` et dans le tableau de `backend/README.md`.
- **Dépendances** : `backend/requirements.txt` est entièrement épinglé ; ajoute la version exacte (et ses dépendances transitives) quand tu ajoutes un paquet.
- Une PR = un sujet. Les gros chantiers se découpent.

## 5. Conventions backend
- Un module = un dossier dans `backend/apps/`. Les règles métier vont dans `services.py`, pas dans les vues.
- Accès par défaut : `IsAuthenticated`. Une route publique doit déclarer `AllowAny` explicitement.
- Les rôles `USER` et `CONCILIATEUR` ne se mélangent pas : utilise `IsPlainUser` / `IsConciliateur`.
- Un conciliateur non vérifié ne doit jamais fuiter : passe par `ConciliateurProfile.objects.visible()`.
- Codes d'erreur : 400 donnée ou règle invalide, 403 mauvais rôle, 404 introuvable (ou ressource d'un autre), 409 conflit (créneau pris).

## 6. Contribuer côté front
Le frontend est dans `front-end/` (voir son README pour le démarrer) ; avant une PR front : `npx tsc --noEmit && npm run lint && npm run build`.
- Le contrat de l'API est le schéma OpenAPI (`/api/schema/`) : génère-en un client typé plutôt que d'écrire les appels à la main.
- Le front de dev doit tourner sur le port **3000** (seule origine autorisée par CORS par défaut, voir le README).
- Lance l'API avec `--authorize-all=yes` pour avoir des conciliateurs à afficher sans passer par l'admin.
- Il manque un besoin côté API (champ, route…) ? Ouvre une issue **« API »** décrivant l'écran qui en a besoin, ou une PR backend si tu t'en sens capable.
- L'interface doit mettre en avant le parcours conciliateur : un gros bouton **« JE SUIS UN CONCILIATEUR »** mène à son inscription/connexion, distincte de celle des utilisateurs.

## 7. Signaler un bug ou proposer une idée
Ouvre une issue : des modèles t'aident (bug, ou besoin côté API pour le front). Pour une faille de sécurité, **pas d'issue publique** : voir [SECURITY.md](SECURITY.md). Une bonne issue contient : ce que tu attendais, ce qui s'est passé, les étapes pour reproduire (requête curl ou capture Swagger).

## 8. Licence
En ouvrant une PR, tu acceptes que ta contribution soit publiée sous la [licence MIT](LICENSE) du projet.
