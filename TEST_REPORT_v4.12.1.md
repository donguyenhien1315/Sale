# Cantin AI Next v4.12.1 – Test Report

## Static / syntax
- PASS: public/js/app.js parses with Node.
- PASS: functions/api/[[path]].js parses with Node.
- PASS: dashboard revenue card uses detail bottom sheet instead of direct navigation.
- PASS: dashboard profit card uses detail bottom sheet instead of direct navigation.
- PASS: revenue detail includes payment/category/product/hour breakdown and yesterday comparison.
- PASS: profit detail includes cost, margin, category/product profit and low-margin warning.
- PASS: debt filters include Tất cả / Còn nợ / Đã trả.
- PASS: customers with outstanding debt receive red text styling.
- PASS: outstanding debt lines receive red styling.

## Debt filter semantics
- Tất cả: all customers matching search.
- Còn nợ: current balance > 0.
- Đã trả: current balance = 0 and customer has at least one debt-history record.
- Customers who have never had debt remain visible only under Tất cả.
