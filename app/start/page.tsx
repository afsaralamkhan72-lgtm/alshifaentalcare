import { CLINIC } from '@/clinic.config'
import StartPicker from '@/components/StartPicker'

export const metadata = {
  title: `Shuru karein | ${CLINIC.name}`,
  robots: { index: false, follow: false },
}

/** Android app ki pehli screen: Patient ya Staff. Staff ka button chhupa hota hai (logo par 5 baar tap). */
export default function StartPage() {
  return <StartPicker name={CLINIC.name} />
}
