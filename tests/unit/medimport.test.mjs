import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDelimited, planImport, mapColumns } from '@/lib/medImport'

test('csv: comma, quotes aur header', () => {
  const rows = parseDelimited('Name,Potency,Price\nArnica Montana,30C,"1,200"\n"Belladonna, plain",200C,\n')
  assert.equal(rows.length, 3)
  assert.equal(rows[2][0], 'Belladonna, plain')
})
test('csv: semicolon aur tab', () => {
  assert.deepEqual(parseDelimited('a;b\n1;2'), [['a', 'b'], ['1', '2']])
  assert.deepEqual(parseDelimited('a\tb\n1\t2'), [['a', 'b'], ['1', '2']])
})
test('header ke naam pehchane jate hain (Roman Urdu bhi)', () => {
  const m = mapColumns(['Dawa', 'Potency', 'Qeemat', 'Hidayat'])
  assert.equal(m?.name, 0); assert.equal(m?.potency, 1); assert.equal(m?.price, 2); assert.equal(m?.instructions, 3)
})
test('header na ho to pehla column naam', () => {
  const p = planImport([['Arnica'], ['Nux Vomica'], ['Sulphur']], [])
  assert.equal(p.fresh.length, 3)
})
test('pehle se maujood dawa chhodi jati hai, naye hi aate hain', () => {
  const p = planImport(parseDelimited('name,potency\nArnica,30C\nArnica,200C\narnica ,30c\nSulphur,'), [{ name: 'Arnica', potency: '30C' }])
  assert.equal(p.fresh.length, 2)
  assert.equal(p.dup.length, 2)
})
test('ghalat qeemat aur khali naam bad mein', () => {
  const p = planImport(parseDelimited('name,price\n,100\nX,abc\nY,Rs. 1,500\nZ,-5'), [])
  assert.equal(p.bad.length, 3)
})
test('khali file', () => {
  assert.equal(planImport([], []).fresh.length, 0)
})
