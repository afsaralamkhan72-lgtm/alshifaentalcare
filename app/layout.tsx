import type { Metadata } from 'next'
import { Fraunces, Inter, Noto_Nastaliq_Urdu } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  variable: '--font-nastaliq',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'Al Shifa Health Care | Dr. Muhammad Khalid Mahmood',
  description: 'Dental & Homeopathic Clinic — Numaish, Nizami Road, Karachi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} ${nastaliq.variable} font-body bg-clinic-sand text-clinic-ink antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
