/** Patient ledger: aik hi balance formula (database view `patient_balances` / `patient_ledger`) */
export interface PatientBalance {
  patient_id: string
  old_charges: number
  old_paid: number
  old_balance: number
  new_total: number
  new_paid: number
  new_balance: number
  total_charges: number
  total_paid: number
  balance: number
  legacy_balance: number
}

export interface LedgerRow {
  entry_date: string
  sort_at: string
  source: 'old' | 'new'
  kind: string
  label: string
  charge: number
  payment: number
}

type Num = number | string | null

export function toBalance(r: Record<string, Num | string>): PatientBalance {
  const n = (k: string) => Number(r[k] ?? 0)
  return {
    patient_id: String(r.patient_id),
    old_charges: n('old_charges'),
    old_paid: n('old_paid'),
    old_balance: n('old_balance'),
    new_total: n('new_total'),
    new_paid: n('new_paid'),
    new_balance: n('new_balance'),
    total_charges: n('total_charges'),
    total_paid: n('total_paid'),
    balance: n('balance'),
    legacy_balance: n('legacy_balance'),
  }
}
