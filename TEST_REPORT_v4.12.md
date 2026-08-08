# Cantin AI Next v4.12 – Production Stable Test Report

## Build / parse
- PASS: `public/js/app.js` passes `node --check`.
- PASS: Cloudflare Pages Function source passes `node --check` after being loaded as an ES module.
- PASS: Worker module imports successfully as ESM.

## End-to-end mocked persistence
The test runs the real Pages Function `onRequest()` with an in-memory mock for the two Supabase RPC calls, so no production data is touched.

- PASS: bootstrap a store and normalize version 4.12.
- PASS: standardized tabular/Excel-style import creates products and customers.
- PASS: rename customer.
- PASS: create a debt sale, reduce stock, and create linked debt.
- PASS: edit sale quantity and correctly adjust stock + linked debt.
- PASS: create stock-in receipt.
- PASS: edit old stock-in by delta instead of resetting later stock history.
- PASS: `Quỳnh 67 nợ 42k 2c 1 mèo` stays a manual debt note; `2c` is not converted to a product.
- PASS: `Pepsi hết` produces an inventory-set plan.
- PASS: invalid/unknown AI plan kind is rejected before execution.
- PASS: snapshots are capped at 12 and each snapshot keeps at most 120 transaction rows.

## Static production checks
- PASS: bottom navigation has exactly 6 primary destinations.
- PASS: secondary pages are under `Khác`.
- PASS: duplicate Product category dropdown removed.
- PASS: customer rename, sale edit, and stock-in edit UI hooks exist.
- PASS: Excel export/import hooks exist.
- PASS: XLSX and OCR libraries are lazy-loaded; they are not downloaded on initial app load.
- PASS: AI plans pass through `validateAIPlan()` before execution.
- PASS: UI/backend/service-worker version is 4.12.

## Deliberate limitations
- Excel **export** includes Products, Customers, Debts, Sales, StockReceipts, and Audits.
- Excel **import** intentionally writes only Products, Customers, and Debts. Sales/stock-in/audits are report-only on import to prevent accidental duplicate historical transactions.
- AI remains deterministic natural-language parsing; v4.12 adds a structured validation boundary, but it does not connect a third-party LLM API.
- Supabase RLS / database policy hardening is an external deployment setting and is not changed by this ZIP.
