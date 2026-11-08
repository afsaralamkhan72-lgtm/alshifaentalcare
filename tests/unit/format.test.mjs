import test from 'node:test'
import assert from 'node:assert/strict'
import { money, moneyWhole, numFmt, fmtDate, addDays } from '../../lib/karachi.ts'

test('money: 2 decimals max, no float noise', () => {
  assert.equal(money(1234), 'Rs. 1,234')
  assert.equal(money(333.333), 'Rs. 333.33')
  assert.equal(money(0.1 + 0.2), 'Rs. 0.3')
  assert.equal(money(null), 'Rs. 0')
})
test('moneyWhole rounds to rupee', () => {
  assert.equal(moneyWhole(24030.4), 'Rs. 24,030')
  assert.equal(moneyWhole(24030.5), 'Rs. 24,031')
})
test('numFmt has no Rs.', () => {
  assert.equal(numFmt(1500.5), '1,500.5')
})
test('fmtDate: date-only and empty', () => {
  assert.equal(fmtDate('2026-11-08'), '08/11/2026')
  assert.equal(fmtDate(null), '—')
})
test('fmtDate: timestamp is shown in Karachi time (UTC 20:00 = next day 01:00 PKT)', () => {
  assert.equal(fmtDate('2026-11-08T20:00:00Z'), '09/11/2026')
})
test('addDays', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01')
})

import { toInternationalPKNumber as wa } from '../../lib/phone.ts'
test('whatsapp number formats', () => {
  for (const n of ['0300-1234567', '03001234567', '3001234567', '+92 300 1234567', '92300 1234567', '0092 300 1234567', '+92 0300 1234567', '(0300) 123-4567'])
    assert.equal(wa(n), '923001234567', n)
  assert.equal(wa('0044 7911 123456'), '447911123456')
  assert.equal(wa('+44 7911 123456'), '447911123456')
  assert.equal(wa(''), '')
})
