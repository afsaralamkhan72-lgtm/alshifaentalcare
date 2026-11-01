import { redirect } from 'next/navigation'

// Dental chart ab sirf patient ke profile mein hai (aik hi jagah)
export default function DentalChartMoved() {
  redirect('/admin/patients')
}
