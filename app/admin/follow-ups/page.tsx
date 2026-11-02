import { redirect } from 'next/navigation'

// Follow-ups ab Appointments mein hain: treatment ka "agla visit" khud appointment banata hai,
// aur "nahi aaye" list Dashboard par hai.
export default function FollowUpsMoved() {
  redirect('/admin/appointments')
}
