import type { MediaItem } from '../MediaStrip'

export interface TVisit {
  id: string
  visit_no: number | null
  visit_date: string
  procedure: string | null
  notes: string | null
  next_visit: string | null
}

export interface TItem {
  id: string
  name: string
  teeth: string[]
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  price: number
  list_price: number
  doctor: string | null
  started_on: string
  completed_on: string | null
  cancel_reason: string | null
  charged: number
  paid: number
  balance: number
  visits: TVisit[]
  /** Is treatment ki payments (receipt ke liye) */
  payments?: { id: string; paid_on: string; amount: number; method: string | null; kind: string }[]
  /** Visit / treatment ki tasveerein aur files */
  photos?: (MediaItem & { visit_id: string | null })[]
}

export interface MaterialOpt {
  inventory_id: string
  name: string
  unit: string | null
  default_qty: number
}

export interface CatalogOpt {
  id: string
  name: string
  price: number
  category: string | null
  department: string | null
  /** poora muh / jabda / har daant ki / aik dafa (puranay database mein khali) */
  applies_to?: 'tooth' | 'mouth' | 'jaw' | 'once' | null
}
