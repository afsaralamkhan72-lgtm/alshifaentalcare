/**
 * Database / network ke angrezi errors ko saaf Roman Urdu mein.
 * Khaas kar "new row violates row-level security" jo asal mein ye kehta hai: is staff ko ijazat nahi.
 */
export function friendlyError(msg?: string | null): string {
  const m = (msg ?? '').trim()
  if (!m) return 'Kuch masla aaya, dobara koshish karein.'
  if (/row-level security|permission denied|42501|not allowed/i.test(m)) {
    return 'Aap ko ye kaam karne ki ijazat nahi. Admin se "Staff aur Permissions" mein ijazat lagwayein.'
  }
  if (/duplicate key|23505|already exists/i.test(m)) return 'Ye pehle se maujood hai.'
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(m)) return 'Internet ka masla lagta hai. Dobara koshish karein.'
  if (/jwt|token.*expired|not authenticated/i.test(m)) return 'Login ka waqt khatam ho gaya, dobara login karein.'
  return m
}
