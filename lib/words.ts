const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below1000(n: number): string {
  const out: string[] = []
  if (n >= 100) {
    out.push(ONES[Math.floor(n / 100)] + ' Hundred')
    n %= 100
  }
  if (n >= 20) {
    out.push(TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''))
  } else if (n > 0) out.push(ONES[n])
  return out.join(' ')
}

/** Raqam lafzon mein (Pakistani ginti: Thousand, Lac, Crore). 55000 -> "Fifty Five Thousand" */
export function rupeesInWords(amount: number): string {
  let n = Math.round(Number(amount))
  if (!Number.isFinite(n) || n < 0) return ''
  if (n === 0) return 'Zero'
  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lac = Math.floor(n / 100000)
  n %= 100000
  const th = Math.floor(n / 1000)
  n %= 1000
  if (crore) parts.push(rupeesInWords(crore) + ' Crore')
  if (lac) parts.push(below1000(lac) + ' Lac')
  if (th) parts.push(below1000(th) + ' Thousand')
  if (n) parts.push(below1000(n))
  return parts.join(' ')
}
