# Flujo de ramas Git

Este proyecto usa un flujo de ramas en cascada:

- **main**: producción (solo código ya validado en stage y desplegado).
- **stage**: preproducción / QA profundo.
- **develop**: integración de features y fixes.
- **feature/***, **fix/*** o **hotfix/*****: ramas temporales por cambio.

La historia siempre avanza así:

```text
develop ⊇ stage ⊇ main
```

Es decir:
- Todo lo que está en `stage` está en `develop`.
- Todo lo que está en `main` está en `stage` (y por lo tanto en `develop`).

---
## 1. Crear y mergear una feature/fix

1. Partir SIEMPRE desde `develop` actualizado:
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. Crear rama de trabajo:
   ```bash
   git checkout -b feature/mi-feature   # o fix/mi-fix
   ```

3. Trabajar y commitear normalmente en la rama feature.

4. Antes de mergear, re-sincronizar con `develop`:
   ```bash
   git checkout develop
   git pull origin develop

   git checkout feature/mi-feature
   git rebase develop    # o git merge develop, según preferencia de historia
   ```

5. Merge a `develop`:
   ```bash
   git checkout develop
   git merge --no-ff feature/mi-feature   # o squash
   git push origin develop
   ```

6. (Opcional) Borrar la rama feature:
   ```bash
   git branch -d feature/mi-feature
   git push origin --delete feature/mi-feature
   ```

---
## 2. Promover cambios: develop → stage → main

### 2.1. Pasar de develop a stage

Usar cuando lo que está en `develop` pasó un primer QA (tests automáticos, smoke tests):

```bash
git checkout stage
git pull origin stage

git merge develop
git push origin stage
```

En `stage` se hace un QA más profundo (regresión, pruebas manuales, etc.).

### 2.2. Pasar de stage a main

Solo cuando lo de `stage` está listo para producción:

```bash
git checkout main
git pull origin main

git merge stage
git push origin main
```

Esto mantiene las invariantes:
- `develop` siempre ahead o igual que `stage`.
- `stage` siempre ahead o igual que `main`.
- `main` puede estar igual o behind de `stage`, nunca ahead.

---
## 3. Referencia para nuevas ramas

Para cualquier cambio nuevo:

- **Referencia principal**: `develop`.
- Flujo típico:
  ```text
  feature/* → develop → stage → main
  ```

Regla práctica antes de empezar una rama nueva:

```bash
git checkout develop
git pull origin develop
# recién ahí crear la rama feature
```

Esto asegura que siempre trabajás sobre la última versión posible.

---
## 4. Hotfixes de producción

Para arreglos urgentes en producción:

1. Crear rama hotfix desde `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/bug-critico
   ```

2. Hacer el fix, commitear y mergear a `main`:
   ```bash
   git checkout main
   git merge --no-ff hotfix/bug-critico
   git push origin main
   ```

3. Propagar el hotfix a `stage` y `develop` para no perderlo:
   ```bash
   git checkout stage
   git pull origin stage
   git merge main
   git push origin stage

   git checkout develop
   git pull origin develop
   git merge stage
   git push origin develop
   ```

---
## 5. Reglas rápidas

- No commitear directamente en `main` ni en `stage`.
- Siempre `pull` antes de crear o mergear una rama.
- Para cada feature/fix: trabajar en rama propia, mergear a `develop` y desde ahí seguir el flujo.
