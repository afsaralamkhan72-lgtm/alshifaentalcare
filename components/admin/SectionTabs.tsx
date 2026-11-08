import SectionTabsBar, { type SectionTab } from '@/components/admin/SectionTabsBar'
import { getStaffProfile, getPermissions, isOwnerRole } from '@/lib/auth'

const ACCOUNTS: (SectionTab & { perm: string[] })[] = [
  { href: '/admin/accounts', label: 'Accounts', perm: ['billing.view', 'reports.view', 'expenses.manage'] },
  { href: '/admin/billing', label: 'Billing', perm: ['billing.view'] },
  { href: '/admin/invoices', label: 'Invoices', perm: ['billing.view'] },
  { href: '/admin/dues', label: 'Baqaya', perm: ['billing.view'] },
  { href: '/admin/expenses', label: 'Kharche', perm: ['expenses.manage'] },
  { href: '/admin/closing', label: 'Din ki Closing', perm: ['reports.view'] },
]
const REPORTS: (SectionTab & { perm: string[] })[] = [
  { href: '/admin/summary', label: 'Hisaab ka khulasa', perm: ['reports.view'] },
  { href: '/admin/reports', label: 'Mahine ki Report', perm: ['reports.view'] },
  { href: '/admin/insights', label: 'Insights', perm: ['reports.view'] },
  { href: '/admin/ledger-check', label: 'Hisaab Check', perm: ['reports.view'] },
]

/** Accounts ya Reports wali patti; sirf wohi tabs jin ki staff ko permission hai. */
export default async function SectionTabs({ which }: { which: 'accounts' | 'reports' }) {
  const [me, perms] = await Promise.all([getStaffProfile(), getPermissions()])
  const owner = isOwnerRole(me.role)
  const list = (which === 'accounts' ? ACCOUNTS : REPORTS).filter((t) => owner || t.perm.some((p) => perms.includes(p)))
  return <SectionTabsBar tabs={list} label={which === 'accounts' ? 'Accounts' : 'Reports'} />
}
