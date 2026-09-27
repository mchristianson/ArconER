# ArconEr Cup

History, photos and planning for the annual Arcon vs 838 golf weekend in Hayward, WI. Live at https://arconer.vercel.app.

Next.js on Vercel, Supabase for Postgres, Google auth and photo storage. See [PLAN.md](PLAN.md).

## Setup

```bash
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm install
npm run dev
```

Database: apply `supabase/migrations/*.sql`, then `supabase/seed.sql`.

`supabase/seed.sql` is generated from Patrick's spreadsheet:

```bash
pip install openpyxl
python scripts/import_xlsx.py "ArconER matches 2014 thru 2026.xlsx" > supabase/seed.sql
```

Roles: anyone can sign in with Google (`pending`). An admin links them to a player and sets `member` so they can post photos, comments and RSVPs.
