# CLAUDE.md

## Methodologie

- **Nouvelle feature** → Brainstorming d'abord (questions une par une, 2-3 approches, spec validée) · jamais coder sans avoir conçu et validé
- **Chaque tâche** → APEX : **A**nalyze (lire le code, comprendre le contexte) · **P**lan (présenter et attendre validation) · **E**xecute (implémenter après accord) · e**X**amine (tester, vérifier les régressions)

### Commandes de vérification (eXamine)

```bash
pnpm test    # vitest via Turborepo
pnpm lint    # eslint src via Turborepo
pnpm build   # build via Turborepo
```

## Règles RHE

- **Langue & style** · Toujours en français · concis sauf décisions importantes (justifier) · si bloqué : exposer le problème + options et attendre le choix
- **Workflow** · Brainstorming avant tout dev · APEX pour chaque tâche · git pull avant de modifier du code
- **Worktrees & branches** · Toujours dans un worktree isolé (skill `using-git-worktrees`) · jamais sur la branche principale · nommage : `feat/` `fix/` `chore/` `docs/` `refactor/`
- **Git** · Skill `git-commit` obligatoire · conventional commits · jamais commit/push sans accord explicite
- **Dépendances** · Vérifier l'existant d'abord · si lib externe : justifier + dernière version stable · zéro dette technique · Context7 en priorité pour la documentation
- **Tests** · TDD sur logique critique, pragmatique ailleurs · jamais "terminé" sans tests · fournir un plan de test humain · validation = confirmation explicite de l'utilisateur
- **Revue** · Sur features importantes : skills `requesting-code-review` + `simplify`
- **Code** · Tout en anglais (variables, fonctions, commentaires, messages d'erreur)
- **Sécurité** · Jamais de secrets en dur · toujours via `.env` · vérifier `.gitignore` avant tout commit
- **Dette technique** · Si code fragile ou TODO découvert : signaler immédiatement avec suggestion, ne pas corriger silencieusement
- **Documentation** · Mettre à jour README/JSDoc/commentaires après chaque feature
- **Breaking changes** · S'arrêter immédiatement et prévenir avant de continuer
- **Versioning** · Releases via GitHub Actions + GitHub Releases · Changesets (monorepo Node) · changelog après chaque feature ou fix significatif

## Stack

- **Package manager** : pnpm workspaces + Turborepo
- **Modules** : `type: module` (ES modules) — sauf entry point Lighthouse en CommonJS
- **Entry point** : `packages/lib/scripts/puppeteer-generic.cjs`

## Architecture

Interprétation à l'exécution (pas de génération de code) : un seul script Puppeteer générique lit et exécute des configs YAML dynamiquement.

```
YAML/JSON config → ConfigLoader → Validator → Interpreter → puppeteer-generic.cjs → Lighthouse
```

### Composants clés (`packages/lib/src`)

- **`core/config-loader.js`** — charge YAML/JSON, résout les env vars
- **`core/validator.js`** — valide la config, retourne `{ valid, errors }`
- **`core/interpreter.js`** — exécute les steps Puppeteer (`authenticate()`, `verify()`, `executeStep()`)
- **`helpers/`** — validation sélecteurs, utilitaires wait, handlers vérification
- **`cli/cli.js`** — CLI (`validate`, `test`)
- **`lighthouse.js`** — API publique (`authenticateWithPage(page, configPath, options)`)
- **`scripts/puppeteer-generic.cjs`** — entry point CJS Lighthouse (via `AUTH_CONFIG` env var)

## Monorepo

```
packages/
├── lib/    — Node.js library (npm : yml-2-puppeteer-auth)
└── app/    — Tauri desktop app + React frontend
```
