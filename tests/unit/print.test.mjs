import test from 'node:test'
import assert from 'node:assert/strict'
import { rupeesInWords } from '../../lib/words.ts'
import { normalizeLayout, DEFAULT_LAYOUT } from '../../lib/printLayout.ts'
import { BILL_TEMPLATES, RX_TEMPLATES, rxTemplatesFor } from '../../lib/printTemplates.ts'

test('raqam lafzon mein', () => {
  assert.equal(rupeesInWords(55000), 'Fifty Five Thousand')
  assert.equal(rupeesInWords(0), 'Zero')
  assert.equal(rupeesInWords(7), 'Seven')
  assert.equal(rupeesInWords(13), 'Thirteen')
  assert.equal(rupeesInWords(100), 'One Hundred')
  assert.equal(rupeesInWords(1500), 'One Thousand Five Hundred')
  assert.equal(rupeesInWords(42000), 'Forty Two Thousand')
  assert.equal(rupeesInWords(125750), 'One Lac Twenty Five Thousand Seven Hundred Fifty')
  assert.equal(rupeesInWords(10000000), 'One Crore')
  assert.equal(rupeesInWords(12345678), 'One Crore Twenty Three Lac Forty Five Thousand Six Hundred Seventy Eight')
  assert.equal(rupeesInWords(999.6), 'One Thousand')
  assert.equal(rupeesInWords(-5), '')
  assert.equal(rupeesInWords(NaN), '')
})

test('purani print settings mein duo khali aata hai, kuch tootta nahi', () => {
  const l = normalizeLayout({ scale: 1.1, show: { qr: false } })
  assert.equal(l.scale, 1.1)
  assert.equal(l.show.qr, false)
  assert.deepEqual(l.duo, DEFAULT_LAYOUT.duo)
  assert.deepEqual(normalizeLayout(null).duo, DEFAULT_LAYOUT.duo)
})

test('duo settings mehfooz aur saaf hoti hain', () => {
  const l = normalizeLayout({ duo: { left: { name: 'A', degree: 'B', title: 'C', sub_name: 'D', sub_phone: '0300', x: 1 }, right: { name: 5 }, address: 'Pata', timings: 'T' } })
  assert.deepEqual(l.duo.left, { name: 'A', degree: 'B', title: 'C', sub_name: 'D', sub_phone: '0300' })
  assert.equal(l.duo.right.name, '')
  assert.equal(l.duo.address, 'Pata')
  assert.equal(l.duo.timings, 'T')
  assert.equal(normalizeLayout({ duo: { address: 'x'.repeat(500) } }).duo.address.length, 200)
})

test('naya template dono list mein hai, purane apni jagah', () => {
  assert.ok(BILL_TEMPLATES.some((t) => t.id === 'duo'))
  assert.ok(RX_TEMPLATES.some((t) => t.id === 'duo'))
  for (const id of ['soft', 'green', 'classic', 'blue']) assert.ok(BILL_TEMPLATES.some((t) => t.id === id))
  for (const id of ['soft', 'classic', 'pad_red', 'pad_bw']) assert.ok(rxTemplatesFor('dental').some((t) => t.id === id))
  assert.ok(rxTemplatesFor('homeopathic').some((t) => t.id === 'duo'))
  assert.ok(rxTemplatesFor('homeopathic').some((t) => t.id === 'pad_green'))
})
