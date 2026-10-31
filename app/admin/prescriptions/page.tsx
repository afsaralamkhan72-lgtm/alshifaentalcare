import { redirect } from 'next/navigation'

// Prescription ab patient ke profile ke "Prescriptions" tab se likhi aur print hoti hai (aik hi jagah)
export default function PrescriptionsMoved() {
  redirect('/admin/patients')
}
