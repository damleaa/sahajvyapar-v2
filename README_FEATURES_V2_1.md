# SahajVyapar v2.1 — Intelligence Build

## Before first run on your existing Supabase project
Run `database/migration_v2_1_intelligence.sql` once in Supabase SQL Editor.

## Added together
1. Expense/cost data model and sale/exhibition cost hooks.
2. Package-wise reporting: Starter basic sales; Growth profitability/outstanding; Pro stock intelligence.
3. Central entitlement engine in `src/lib/entitlements.ts`.
4. Pro Business Health score + automatic Sahaj Insights.
5. Pro printable Monthly Business Report + WhatsApp summary.

## Important integration note
Existing sales UI should populate `sale_items.cost_price` from the product cost at the moment of sale and may populate `sales.exhibition_id`. Until it does, historical/old sale-item COGS will be zero, so profit is an estimate. New expense entries work immediately after migration.

## Run
Copy your existing `.env.local`, then `npm install` and `npm run dev`.
