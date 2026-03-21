# Authentication Scenario Builder for Lighthouse

## 🎯 Objectif

Créer une **librairie et un produit** pour définir des scénarios d'authentification en **YAML/JSON déclaratif**, utilisables directement avec Lighthouse sans générer de code.

**Architecture** :
```
Fichier de config (YAML/JSON)
         ↓
Script générique Puppeteer
         ↓
Lighthouse audit (avec authentification)
```

---

## 🏗️ Approche : Mode Interprétation (Runtime)

Au lieu de **générer** des fichiers JavaScript, le système utilise un **script générique unique** qui :

1. **Charge** le fichier YAML/JSON
2. **Parse** la configuration
3. **Exécute** les étapes d'authentification dynamiquement
4. **Valide** le succès de l'authentification

### Avantages

✅ Un seul script générique pour tous les scénarios  
✅ Modification du YAML = immédiate (pas de régénération)  
✅ Pas de fichiers générés à gérer  
✅ Plus simple à déboguer  
✅ YAML est la source de vérité  
✅ Flexible pour les évolutions futures  

---

## 📋 Contexte utilisateur

L'utilisateur a :
- ✅ Un lanceur Lighthouse maison
- ✅ Des scripts d'authentification existants (WordPress, Okta)
- ❌ Besoin : Créer de nouveaux scénarios **sans coder**

**Problème** : Chaque nouveau formulaire de login demande de coder en JavaScript.

**Solution** : Décrire le formulaire en YAML simple, le produit exécute l'authentification.

---

## 🔄 Flux de travail cible

```
Config YAML/JSON
    ↓
Script générique Puppeteer
    ↓
[Valide & parse la config à runtime]
    ↓
Exécute les étapes d'auth
    ↓
Lighthouse audit
```

---

## 📚 Fichiers à créer dans ce projet

### Documentation
- `PROJECT.md` (ce fichier) - Vue d'ensemble
- `SPECIFICATIONS.md` - Spécifications détaillées
- `ARCHITECTURE.md` - Architecture de la librairie
- `API.md` - API publique de la librairie
- `EXAMPLES.md` - Exemples d'utilisation et configs

### Code structure
```
yml-2-puppeteer-auth/
├── src/
│   ├── core/
│   │   ├── config-loader.js    # Charge YAML/JSON, résout les env vars
│   │   ├── validator.js        # Valide la structure de la config
│   │   └── interpreter.js      # Exécute les steps Puppeteer à runtime
│   ├── helpers/
│   │   ├── selector-utils.js   # Validation de sélecteurs CSS
│   │   ├── wait-utils.js       # Utilitaires pour les waits Puppeteer
│   │   └── verification.js     # Vérifications post-auth
│   └── cli/
│       └── cli.js              # Interface CLI (validate, test)
├── scripts/
│   └── puppeteer-generic.cjs   # Point d'entrée Lighthouse
├── examples/
│   ├── login-simple.yml
│   ├── login-two-steps.yml
│   ├── login-totp.yml
│   └── login-with-error-handling.yml
└── package.json
```

---

## ✅ Fonctionnalités clés

### À supporter OBLIGATOIREMENT
- [x] Steps atomiques : `fill`, `click`, `waitForSelector`, `waitForNavigation`, `assertNotPresent`, `wait`
- [x] Support YAML et JSON
- [x] Credentials via variables d'environnement (`valueEnv`)
- [x] TOTP / 2FA via `valueType: totp`
- [x] Détection d'erreurs inline (`errorSelector`, `assertNotPresent`)
- [x] Vérifications post-auth (cookie, localStorage, selector, url, title)
- [x] CLI : `validate` et `test` (avec `--headed`, `--debug`)
- [x] Validation des configs

### Peut être complexe
- [ ] Multi-étapes (>2 pages)
- [ ] Redirects et navigation
- [ ] Attentes spécifiques (waitForNavigation, waitForSelector, timeouts)
- [ ] Vérifications post-auth (cookies, tokens, DOM, titre)
- [ ] Gestion d'erreurs robuste
- [ ] Logs et debug

---

## 🎯 Contraintes

1. **Compatibilité Lighthouse** : Scripts générés doivent être 100% compatibles
2. **Pas de code généré instable** : Les scripts générés doivent fonctionner
3. **Réutilisabilité** : Fonction comme librairie (import) et comme CLI
4. **Simplicité déclarative** : Les configs doivent rester lisibles
5. **Flexibilité** : Support des cas existants de l'utilisateur

---

## 📊 Complexité des cas à supporter

### Cas 1 : WordPress simple
```
Aller sur /wp-login.php
→ Remplir #user_login
→ Remplir #user_pass
→ Cliquer [type=submit]
→ Vérifier cookie wordpress_logged_in_
```

### Cas 2 : Okta 2-étapes
```
Aller sur /login
→ Attendre form[method=post]
→ Remplir input[type=text] (email)
→ Cliquer submit
→ Attendre waitForNavigation + nouvelle page
→ Remplir input[type=password]
→ Cliquer submit
→ Vérifier token Okta dans localStorage
```

### Cas 3 : Générique (quelconque formulaire)
```
Aller sur URL
→ Attendre selectors spécifiés
→ Remplir les champs (1 ou plusieurs étapes)
→ Cliquer submit
→ Vérifier un élément DOM, cookie, ou titre
```

---

## 🚀 Prochaines étapes

1. ✅ Créer `SPECIFICATIONS.md` - Tous les détails
2. ✅ Créer `ARCHITECTURE.md` - Design de la librairie
3. ✅ Créer `API.md` - Interface publique
4. ✅ Créer `EXAMPLES.md` - Cas d'usage concrets
5. ✅ Créer `CONFIG_SCHEMA.md` - Schéma des configs
6. Commencer le développement avec src/core/builder.js

---

## 📝 Notes

- L'utilisateur a déjà du code solide (puppeteer-helper.js) qu'on peut potentiellement réutiliser
- Les helpers existants (wpConnect, oktaConnect) sont bien structurés
- Le besoin est clairement identifié : pas de besoin de brainstorming
- Focus : générer du code stable et bien structuré
