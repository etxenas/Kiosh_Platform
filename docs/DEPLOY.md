# Deployment Guide

## TL;DR — vardaglig workflow

```bash
cd ~/.openclaw/workspace/johnny/Kiosh_Platform
# gör ändringar
git add .
git commit -m "feat: <vad du gjorde>"
git push origin main
# Vercel deployar automatiskt på 15–30 sek
```

## Repo

- **GitHub:** https://github.com/etxenas/Kiosh_Platform
- **Visibility:** Public (för Vercel Hobby plan — gör privat när vi går till Pro)
- **Default branch:** `main`
- **Lokal arbetskopia:** `~/.openclaw/workspace/johnny/Kiosh_Platform/`

## Vercel projekt

| Projekt | ID | Root | Framework | Prod-URL |
|---|---|---|---|---|
| `salesforce-backend` | `prj_UWaelYeWznuGeGrYEJIbJxTeB4d9` | `backend/` | Express | https://salesforce-backend-zeta.vercel.app |
| `frontend` | `prj_oXsExdwTaGkGDYivl5PLw6SVryX4` | `frontend/` | Next.js | https://frontend-beryl-six-65.vercel.app |

**Team:** `kiosh-s-projects` (id: `team_pjvogVkyTDeZngPHA0kHXyuM`)
**Plan:** Hobby (uppgradera till Pro innan marknadslansering)

## Auto-deploy konfiguration

### Förutsättningar (en gång per setup, redan klart)
1. ✅ Vercel Login Connection till GitHub (kontonivå OAuth)
2. ✅ Vercel GitHub App installerad på repot
3. ✅ Repot publikt (Hobby-restriktion — bytt till Pro när vi går privat igen)
4. ✅ Vercel projekt länkade till `etxenas/Kiosh_Platform` med rätt rootDirectory

### Hur Vercel vet vad som ska byggas
- Push till `main` → Vercel webhook triggas → båda projekten bygger
- Vercel kollar `rootDirectory` (backend/ resp frontend/) för att avgöra om bygget behöver köras
- Om bara `backend/` ändrats: bara `salesforce-backend` byggs (ignored build steps på frontend)

## Manuell deploy (om auto-deploy bråkar)

```bash
# Backend
cd ~/.openclaw/workspace/johnny/Kiosh_Platform/backend
VTOKEN=$(grep "^VERCEL_TOKEN=" ../../salesforce-backend/.env | cut -d= -f2)
vercel deploy --prod --token="$VTOKEN" --yes

# Frontend
cd ~/.openclaw/workspace/johnny/Kiosh_Platform/frontend
vercel deploy --prod --token="$VTOKEN" --yes
```

⚠️ **Varning:** CLI-deploy från en mapp som saknar `.vercel/project.json` skapar ett nytt projekt. Kör `vercel link` först om det är första gången.

## Env-variabler

### Backend (`salesforce-backend`)
Satta i Vercel via dashboard. Lokal kopia i `~/.openclaw/workspace/johnny/salesforce-backend/.env`:

```
SF_INSTANCE_URL=https://orgfarm-fabd595e73-dev-ed.develop.my.salesforce.com
SF_CONSUMER_KEY=3MVG9HtWXcDGV...
SF_CON…RET=...   ← rotera innan produktion!
SF_USERNAME=kiosh.e2443b4a9d8e@agentforce.com
SF_API_VERSION=62.0
```

### Frontend
Sätts i Vercel-projekt → Settings → Environment Variables:
- `NEXT_PUBLIC_API_BASE=https://salesforce-backend-zeta.vercel.app`

## Push-troubleshooting

### "BLOCKED" på Vercel-deploys
**Orsak:** Hobby team plan + private repo.
**Fix:** Gör repot publikt ELLER uppgradera till Pro.

### Push-auth failar
Token i `salesforce-backend/.env` som `GITHUB_TOKEN=*** För att pusha:
```bash
GTOKEN=$(grep "^GITHUB_TOKEN=" ~/.openclaw/workspace/johnny/salesforce-backend/.env | cut -d= -f2)
git push "https://x-access-token:${GTOKEN}@github.com/etxenas/Kiosh_Platform.git" main
```

Eller bättre — använd credential helper:
```bash
git config credential.helper osxkeychain
git push  # tar emot token första gången, sparar i Keychain
```

## Säkerhet

### Aldrig committa
- `.env`, `.env.local` etc — täckta av `.gitignore`
- `*.key`, `*.pem`, `*.crt` — täckta av `.gitignore`
- `CREDENTIALS_FOR_AGENT.md` eller liknande — täckt av `.gitignore`
- Salesforce session tokens (`00D...!...`)

### Kvar i repot (medvetet)
- Consumer Keys (3MVG9H...) — funkar inte utan Consumer Secret, OK på publikt repo
- ConnectedApp metadata XML — krävs för SFDX-deploy

### Innan första prod-lansering MÅSTE
1. Rotera Salesforce Consumer Secret (Setup → Connected Apps → Reset)
2. Byt SF-användarens lösenord (just nu `Test123!`)
3. Uppgradera Vercel till Pro → byt repot till privat
4. Sätt branch protection på `main` (kräv PR + 1 godkännande)
