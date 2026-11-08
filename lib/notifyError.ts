/** Database ka kaam fail ho to chup na rahein: foran bata dein. true = fail hua. */
export function failed(error: { message: string } | null | undefined, what: string): boolean {
  if (!error) return false
  if (typeof window !== 'undefined') window.alert(`${what} nahi ho saka: ${error.message}`)
  return true
}
