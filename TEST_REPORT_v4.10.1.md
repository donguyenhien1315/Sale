# Cantin AI Next v4.10.1 – Test Report

## Static
- PASS: `public/js/app.js` syntax
- PASS: `functions/api/[[path]].js` syntax
- PASS: applyAction restored
- PASS: category filters present for Audit and Stock-in
- PASS: cart stock limit present
- PASS: AI context detached from Sales customer
- PASS: Supabase runtime environment config

## Mock persistence / backend flows
- PASS: bootstrap and persistence read-back
- PASS: create product/customer
- PASS: debt sale decreases stock and creates linked debt
- PASS: debt payment
- PASS: deletion of debt sale is blocked after a payment exists
- PASS: after deleting payment, deleting sale restores stock and removes linked debt
- PASS: historical audit edit uses delta and preserves later stock-in
- PASS: historical audit delete reverses only audit delta
- PASS: cash sale retains selected customer
- PASS: alias AI query
- PASS: deleting stock-in is blocked when rollback would make stock negative

Test environment used an in-memory mock of the two Supabase RPC calls so production data was not touched.
