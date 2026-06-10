# Kiosh Platform

> **"Er skit är vår potential."** 👑

Komplett bokningsplattform för hyrtoaletter — webbokning, Salesforce CRM, dashboard, auto-deploy.

## 🚀 Live

| | URL |
|---|---|
| 🌐 Kund-sida | https://frontend-beryl-six-65.vercel.app |
| ⚙️ Backend API | https://salesforce-backend-zeta.vercel.app |
| 📊 Salesforce Dashboard | [Hyrto Funnel Overview](https://orgfarm-fabd595e73-dev-ed.develop.lightning.force.com/lightning/r/Dashboard/01Zfj000004qUPVEA2/view) |

## 📁 Struktur

```
Kiosh_Platform/
├── backend/          # Salesforce REST API (Node.js serverless, Vercel)
├── frontend/         # Next.js webbokning (Vercel)
├── tests/            # End-to-end tester + protokoll
└── docs/             # Arkitektur, deploy, brand, changelog
```

## 📚 Dokumentation

| Fil | Innehåll |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Systemarkitektur, schema, Salesforce-mapping |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Deploy-workflow, Vercel-konfiguration, troubleshooting |
| [`docs/BRAND.md`](docs/BRAND.md) | Logo-koncept, taglines, varumärkesstrategi |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Versionslogg |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Säkerhetschecklista inför produktion |
| [`docs/logo-concepts.html`](docs/logo-concepts.html) | Interaktiv preview av logo-koncept |
| [`docs/design-dokument.md`](docs/design-dokument.md) | Ursprungligt designdokument |
| [`tests/TESTPROTOKOLL-funnel-2026-06-10.md`](tests/TESTPROTOKOLL-funnel-2026-06-10.md) | Testprotokoll funnel-tracking |

## 🛠️ Dev

```bash
# Backend
cd backend
cp .env.example .env  # fyll i SF-credentials
npm install
node local-server.cjs   # om du vill köra lokal HTTP-server (port 3200)

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## 🚢 Deploy

Push till `main` → automatisk deploy via Vercel.

```bash
git add .
git commit -m "feat: ..."
git push origin main
# Backend + frontend live inom 30 sek
```

Se [`docs/DEPLOY.md`](docs/DEPLOY.md) för detaljer.

## 🧪 Tester

```bash
cd tests
node funnel-test.mjs              # full funnel mot prod-backend
node funnel-test-fixes.mjs        # verifiera de 3 bugfixar
```

## ⚠️ Innan produktion

- [ ] Rotera Salesforce Consumer Secret
- [ ] Byt SF-användarens lösenord
- [ ] Uppgradera Vercel till Pro → repot tillbaka privat
- [ ] Sätt branch protection på `main`
- [ ] Sätt upp staging-environment

## 🏗️ Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Node.js serverless (Vercel)
- **CRM:** Salesforce Developer Edition
- **Auth:** OAuth Client Credentials (server-to-server)
- **Deploy:** Vercel auto-deploy från GitHub
- **Repo:** https://github.com/etxenas/Kiosh_Platform
