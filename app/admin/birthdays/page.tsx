import { redirect } from 'next/navigation'

// Birthdays ka page hata diya gaya (kaam ka nahi tha)
export default function BirthdaysRemoved() {
  redirect('/admin/dashboard')
}
