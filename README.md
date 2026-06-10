# Kiosh Platform

Hyrtoaletter — komplett bokningsplattform.

## Struktur

```
backend/    # Salesforce REST API backend (Vercel serverless)
frontend/   # Next.js webbokning (Vercel)
tests/      # End-to-end tester
docs/       # Designdokument, testprotokoll
```

## Backend
- Stack: Node.js serverless (Vercel)
- Auth: Salesforce Client Credentials OAuth
- Endpoint: https://salesforce-backend-zeta.vercel.app

## Frontend
- Stack: Next.js + React + Tailwind
- Endpoint: https://frontend-beryl-six-65.vercel.app

## Salesforce-org
- Developer Edition: `orgfarm-fabd595e73-dev-ed`
- Schema: Lead → Account/Contact/Opp/Order vid bokning
- Dashboard: Hyrto Funnel Overview

## Dev
```
cd backend && npm install
cd frontend && npm install && npm run dev
```

Se respektive mapps README för detaljer.
