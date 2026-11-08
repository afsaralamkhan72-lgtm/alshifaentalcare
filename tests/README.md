# Al Shifa: tests

Ye teen qism ke tests hain. Inmein se koi bhi asli (live) data par na chalayein.

1. `npm test` : chhote unit tests (paise aur tareekh ka format). Internet ya database nahi chahiye.
2. `npm run lint` : code ki jaanch (ESLint). 0 errors honi chahiye. Warnings purane code ki hain.
3. `tests/db/*.sql` : database ke hisaab (bill, discount, payment, refund, void, stock, advance, salary). Supabase ke **TEST project** ke SQL Editor mein chalayein. Aakhir mein ROLLBACK hota hai, kuch save nahi hota. Har check "PASS" ya "FAIL" likhta hai.
4. `tests/e2e/*.js` : browser tests (Playwright). Inhein chalane ke liye test database aur `localhost:3055` par chalta hua app chahiye. Ye sirf developer ke liye hain; asli Supabase par na chalayein (ye dummy patients banate hain).

## FINAL release ke naye tests
- `tests/db/regression-installment-payment.sql`: qist aur purane baqaya ki payment (atomic, double-click safe, overpay block).
- `tests/db/regression-stock-return.sql`: supplier ko wapas / kharab maal.
- `tests/db/regression-inventory-items.sql`: item edit, merge, delete, archive, recycle bin.
- `tests/db/integrity-checks.sql`: sirf-padhne wali jaanch (orphan records, double entries). Har line ke aage 0 aani chahiye.
- `tests/e2e/p80.js` (stock wapas/kharab), `p81.js` (qist payment, double-click), `aud9.js` (har admin page: tooti links, duplicate id, HTTP errors). Google Fonts ka "ERR_FAILED" sirf bina internet wale test machine ka hai.
- Backup > Restore: `tests/tools/restore-from-backup.sql` (khali scratch database par).
- `tests/db/regression-payroll-calc.sql`: salary hisab (late 30 min, grace, jaldi jana, ghair-hazri, aadhi, overtime khula/band din, mid-month joiner, clinic band din) asli rupayon ke saath.
