## Quoi et pourquoi
<!-- Décris le changement et le contexte. Lie l'issue si elle existe : Closes #123 -->

## Comment tester
<!-- Requêtes Swagger/curl, ou captures d'écran pour le front -->

## Checklist
- [ ] Commits en Conventional Commits
- [ ] `python manage.py test` passe
- [ ] Migrations commitées (`makemigrations --check` propre)
- [ ] `spectacular --validate --fail-on-warn` passe, nouvelles vues taguées
- [ ] Docs à jour (`.claude/CLAUDE.md`, schéma de `backend/README.md` si un modèle change)
- [ ] Pas de secret, de `db.sqlite3` ni de fichier d'IDE
