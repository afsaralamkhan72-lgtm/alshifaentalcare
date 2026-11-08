import { redirect } from 'next/navigation'

/** Purana Staff hub: ab teeno hisse patti (tabs) ke saath hazri wale page par hain. */
export default function TeamPage() {
  redirect('/admin/attendance')
}
