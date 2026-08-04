# Velox Space v2 — Social Analytics Platform

A centralized dashboard for all your social media analytics — Instagram, Facebook, LinkedIn, X (Twitter), TikTok, and YouTube — with financial metric breakdowns, multi-currency support, and PDF report export.

---

## Setup

### 1. Run the Supabase migration
In your existing Supabase project → SQL Editor → paste `supabase/migration.sql` → Run.

### 2. Env variables
Copy `.env.example` to `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Deploy
Push to GitHub → auto-deploys on Netlify.

---

## Features
- **Overview dashboard** — all platforms at a glance
- **6 platform pages** — Instagram, Facebook, LinkedIn, X, TikTok, YouTube
- **Analytics calculator** — ROAS, ROI, CTR, CPA, CPM, CPC, CPL, CAC, LTV with full explanations
- **Multi-currency** — USD, EUR, GBP, NGN, GHS, ZAR, KES, CAD, AUD, JPY, INR, BRL
- **PDF export** — professional branded reports for clients
- **Light / dark theme toggle**
- **Manual metric input** — enter data for any platform
- **API sync** — connect via access tokens for automatic data
