import test from 'node:test'
import assert from 'node:assert/strict'
import { guessApplies, effectiveApplies } from '../../lib/applies.ts'
import { parseDays, maxDays } from '../../lib/duration.ts'
import { friendlyError } from '../../lib/errors.ts'
import { getYouTubeEmbedUrl } from '../../lib/youtube.ts'
import { toothLabel, toothTitle, isPrimary, isWisdom, quadrantOf } from '../../lib/teeth.ts'
import { toBalance } from '../../lib/ledger.ts'
import { stagesFor, MONTHLY_RE, LAB_WORK_RE } from '../../lib/treatmentStages.ts'
import { t12, hm, dur, dateLabel, nextPayDay, prevMonth, whatsappShareLink } from '../../lib/attendanceUi.ts'
import { renderTemplate, adabName, salaamLine, mapTemplates, TEMPLATE_DEFAULTS } from '../../lib/messageTemplates.ts'
import { messageLink, paymentReminderLink } from '../../lib/messages.ts'
import { buildWhatsAppLink } from '../../lib/whatsapp.ts'
import { buildBillText } from '../../lib/billText.ts'
import { nameMatches, firstName, hashToken, newToken } from '../../lib/loyaltyPublic.ts'
import * as SP from '../../lib/staffPortal.ts'
import { makeGateCookie, validToken, cookieName } from '../../lib/shareGate.ts'
import { normalizeLayout, DEFAULT_LAYOUT } from '../../lib/printLayout.ts'
import { rxTemplatesFor, aftercareFor } from '../../lib/printTemplates.ts'
import { HISTORY_STEPS } from '../../lib/history-steps.ts'

test('applies: treatment kis par lagti hai', () => {
  assert.equal(guessApplies('Consultation / Checkup'), 'once')
  assert.equal(guessApplies('Scaling & Polishing'), 'mouth')
  assert.equal(guessApplies('Complete Denture (Both)'), 'jaw')
  assert.equal(guessApplies('Braces (Metal) - Upper'), 'jaw')
  assert.equal(guessApplies('Root Canal Treatment'), 'tooth')
  assert.equal(effectiveApplies({ name: 'Root Canal', applies_to: 'mouth' }), 'mouth')
  assert.equal(effectiveApplies({ name: 'Root Canal', applies_to: 'ghalat' }), 'tooth')
})

test('duration: dawa ki muddat din mein', () => {
  assert.equal(parseDays('5 din'), 5)
  assert.equal(parseDays('2 hafte'), 14)
  assert.equal(parseDays('1 mahina'), 30)
  assert.equal(parseDays('۳ دن'), 3)
  assert.equal(parseDays(''), null)
  assert.equal(parseDays('0 din'), null)
  assert.equal(maxDays(['3 din', '2 weeks', null]), 14)
  assert.equal(maxDays([]), null)
})

test('errors: database ka error asaan zubaan mein', () => {
  assert.match(friendlyError('new row violates row-level security policy'), /ijazat nahi/)
  assert.match(friendlyError('duplicate key value'), /pehle se maujood/)
  assert.match(friendlyError('Failed to fetch'), /Internet/)
  assert.match(friendlyError('JWT expired'), /dobara login/)
  assert.equal(friendlyError('Baqaya sirf Rs. 0 hai'), 'Baqaya sirf Rs. 0 hai')
  assert.match(friendlyError(null), /dobara koshish/)
})

test('youtube embed', () => {
  assert.equal(getYouTubeEmbedUrl('https://youtu.be/abc123'), 'https://www.youtube.com/embed/abc123')
  assert.equal(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=xyz'), 'https://www.youtube.com/embed/xyz')
  assert.equal(getYouTubeEmbedUrl('not a url'), null)
  assert.equal(getYouTubeEmbedUrl('https://example.com/watch?v=xyz'), null)
})

test('teeth: FDI number se naam', () => {
  assert.equal(toothLabel('46'), 'LR 6')
  assert.equal(toothTitle('46'), 'Lower Right First Molar')
  assert.equal(toothTitle('11'), 'Upper Right Central Incisor')
  assert.equal(toothLabel('55'), 'UR E')
  assert.equal(isPrimary('55'), true)
  assert.equal(isPrimary('16'), false)
  assert.equal(isWisdom('38'), true)
  assert.equal(quadrantOf('99'), null)
})

test('ledger: text ke number sahi number bante hain', () => {
  const b = toBalance({ patient_id: 'p1', total_charges: '4000.00', total_paid: '300', balance: '3700.00' })
  assert.equal(b.balance, 3700)
  assert.equal(b.total_charges - b.total_paid, b.balance)
  assert.equal(b.old_balance, 0)
})

test('qadam: har ilaaj ki ek hi list', () => {
  assert.equal(stagesFor('Root Canal Treatment (Anterior)').length, 8)
  assert.equal(stagesFor('RCT').length, 8)
  assert.equal(stagesFor('RCT').some((x) => /crown/i.test(x)), false)
  assert.deepEqual(stagesFor('PFM Bridge'), ['Daant tarashna aur naap', 'Trial', 'Bridge fit'])
  assert.equal(stagesFor('Porcelain Crown').length, 3)
  assert.equal(stagesFor('Complete Denture (Both)').length, 4)
  assert.equal(stagesFor('Braces (Metal) - Upper').length, 5)
  assert.deepEqual(stagesFor('Composite Filling'), [])
  assert.deepEqual(stagesFor('Scaling & Polishing'), [])
  assert.equal(MONTHLY_RE.test('Braces (Metal) - Upper'), true)
  assert.equal(MONTHLY_RE.test('Root Canal'), false)
  assert.equal(LAB_WORK_RE.test('Zirconia Crown'), true)
  assert.equal(LAB_WORK_RE.test('Root Canal'), false)
})

test('attendance: waqt aur tareekh', () => {
  assert.equal(t12('09:13:45'), '9:13 AM')
  assert.equal(t12('00:05'), '12:05 AM')
  assert.equal(t12('12:00'), '12:00 PM')
  assert.equal(t12(null), '')
  assert.equal(hm('09:13:45'), '09:13')
  assert.equal(dur(125), '2 ghante 5 minute')
  assert.equal(dur(60), '1 ghante')
  assert.equal(dur(-5), '0 minute')
  assert.equal(dateLabel('2026-11-11'), 'Budh 11 Nov 2026')
  assert.match(whatsappShareLink('a b'), /^https:\/\/wa\.me\/\?text=a%20b$/)
})

test('salary: pichhla mahina aur agli pay day', () => {
  assert.equal(prevMonth('2026-11-05'), '2026-10')
  assert.equal(prevMonth('2026-01-15'), '2025-12')
  assert.equal(prevMonth('2026-03-31'), '2026-02')
  assert.deepEqual(nextPayDay('2026-11-03', 5), { date: '2026-11-05', daysLeft: 2 })
  assert.deepEqual(nextPayDay('2026-12-10', 5), { date: '2027-01-05', daysLeft: 26 })
  assert.equal(nextPayDay('2026-11-03', null), null)
})

test('message: adab aur salaam', () => {
  assert.equal(adabName('Ali', 'male'), 'محترم Ali صاحب')
  assert.equal(adabName('Sara', 'female'), 'محترمہ Sara صاحبہ')
  assert.equal(adabName('Ali', null), 'Ali')
  assert.match(salaamLine('Ali', 'm'), /^Assalam o Alaikum, محترم Ali صاحب$/)
  assert.deepEqual(mapTemplates([{ key: 'a', body: 'x' }, { key: 'b', body: '  ' }]), { a: 'x' })
})

test('message: visit ka khulasa, khali line khud hat jati hai', () => {
  const full = renderTemplate('visit_summary', { adab: 'Ali', work: 'Root Canal', today_paid: '300', balance: '3,700', next_date: '18/11/2026', next_time: '5:00 PM', next_work: 'Root Canal' })
  assert.match(full, /آج کا کام: Root Canal/)
  assert.match(full, /آج موصول: Rs\. 300/)
  assert.match(full, /کل بقایا: Rs\. 3,700/)
  assert.match(full, /اگلی ملاقات: 18\/11\/2026/)
  assert.match(full, /وقت: 5:00 PM/)
  const bare = renderTemplate('visit_summary', { adab: 'Ali', work: '', today_paid: '', balance: '', next_date: '', next_time: '', next_work: '' })
  assert.doesNotMatch(bare, /آج کا کام|آج موصول|کل بقایا|اگلی ملاقات|وقت:|اگلا کام/)
  assert.doesNotMatch(bare, /\{\w+\}/)
  assert.doesNotMatch(bare, /\n{3,}/)
})

test('message: har template mein koi {nishani} khali nahi rehti', () => {
  for (const t of TEMPLATE_DEFAULTS) {
    if (t.key === 'msg_header' || t.key === 'msg_footer') continue
    const out = renderTemplate(t.key, { adab: 'Ali', name: 'Ali' })
    assert.doesNotMatch(out, /\{\w+\}/, t.key)
  }
})

test('message: clinic ka apna likha template default ki jagah chalta hai', () => {
  const out = renderTemplate('baqaya', { balance: '500' }, { baqaya: 'Baqaya {balance}', msg_header: 'H', msg_footer: 'F' })
  assert.equal(out, 'Baqaya 500')
})

test('whatsapp link: number aur message', () => {
  const l = messageLink('visit_thanks', { full_name: 'Ali', phone: '0300-1234567', gender: 'male' })
  assert.match(l, /^https:\/\/wa\.me\/923001234567\?text=/)
  const b = paymentReminderLink({ full_name: 'Ali', phone: '03001234567', balance: 1500 })
  assert.match(decodeURIComponent(b), /Rs\. 1,500/)
  assert.match(buildWhatsAppLink({ phoneOverride: '+92 300 1234567', customMessage: 'x' }), /wa\.me\/923001234567\?text=x$/)
})

test('bill ka text: hisab aur Discount ka lafz', () => {
  const t = buildBillText({ patientName: 'Ali', invoiceNumber: 'INV-1', items: [{ name: 'Filling', tooth: '46', qty: 2, line_total: 2000 }], subtotal: 2000, discountAmount: 200, total: 1800, paid: 800, balance: 1000, dueDate: '2026-11-20' })
  assert.match(t, /Filling \(daant 46\) x2: Rs\. 2,000/)
  assert.match(t, /Discount : - Rs\. 200/)
  assert.match(t, /Baqaya   : Rs\. 1,000/)
  assert.match(t, /Aakhri tareekh: 20\/11\/2026/)
  assert.doesNotMatch(t, /chhoot|riyayat/i)
  const v = buildBillText({ patientName: 'Ali', invoiceNumber: 'INV-2', items: [], subtotal: 0, discountAmount: 0, total: 0, paid: 0, balance: 0, voided: true })
  assert.match(v, /cancel ho chuka/)
  assert.doesNotMatch(v, /Discount/)
})

test('loyalty: naam milana aur token', () => {
  assert.equal(nameMatches('Ali Khan', 'Muhammad Ali Khan'), true)
  assert.equal(nameMatches('Muhammad', 'Muhammad Ali'), false)
  assert.equal(nameMatches('Sara', 'Ali Khan'), false)
  assert.equal(nameMatches('', 'Ali'), false)
  assert.equal(firstName('Dr. Muhammad Ali Khan'), 'Ali')
  assert.equal(hashToken('abc').length, 64)
  assert.notEqual(newToken(), newToken())
  assert.equal(newToken().length, 64)
})

test('staff portal: PIN aur session ki hifazat', () => {
  const pin = SP.newPin()
  assert.match(pin, /^\d{6}$/)
  const h = SP.hashPin(pin)
  assert.equal(h.includes(pin), false)
  assert.equal(SP.verifyPin(pin, h), true)
  assert.equal(SP.verifyPin(pin === '000000' ? '111111' : '000000', h), false)
  assert.equal(SP.verifyPin(pin, 'kharab'), false)
  assert.notEqual(SP.hashPin(pin), h)
  const s = SP.makeSession('staff-1')
  assert.equal(SP.readSession(s), 'staff-1')
  assert.equal(SP.readSession(s.replace('staff-1', 'staff-2')), null)
  assert.equal(SP.readSession(s.slice(0, -2) + 'xx'), null)
  assert.equal(SP.readSession(null), null)
  const [id, , sig] = s.split('.')
  assert.equal(SP.readSession(id + '.1.' + sig), null)
  assert.ok(SP.newToken().length >= 32)
})

test('share link: token aur cookie', () => {
  assert.equal(validToken('a'.repeat(64)), true)
  assert.equal(validToken('a'.repeat(63)), false)
  assert.equal(validToken('z'.repeat(64)), false)
  const tok = 'b'.repeat(64)
  assert.equal(cookieName(tok), 'sg_bbbbbbbbbbbb')
  const c = makeGateCookie(tok, 123)
  assert.equal(c.split('.').length, 3)
  assert.notEqual(makeGateCookie(tok, 123), makeGateCookie(tok, 124))
})

test('print: layout aur template', () => {
  assert.deepEqual(normalizeLayout(null), DEFAULT_LAYOUT)
  assert.deepEqual(normalizeLayout('kharab'), DEFAULT_LAYOUT)
  assert.ok(rxTemplatesFor('dental').length > 0)
  assert.ok(rxTemplatesFor('homeopathic').length > 0)
  assert.ok(aftercareFor('dental').every((a) => a.dept === 'dental'))
  assert.ok(aftercareFor('homeopathic').every((a) => a.dept === 'homeopathic'))
})

test('history form: har sawal ka key alag hai', () => {
  const keys = HISTORY_STEPS.flatMap((s) => (s.fields ?? []).map((f) => f.key ?? f.k ?? f.name))
  assert.ok(HISTORY_STEPS.length > 0)
  assert.equal(new Set(keys.filter(Boolean)).size, keys.filter(Boolean).length)
})
