import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Al Shifa Health Care | Dr. Muhammad Khalid Mahmood',
  description: 'Dental & Homeopathic Clinic, Numaish, Nizami Road, Karachi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@100..900&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-clinic-sand text-clinic-ink antialiased">
        {children}
      </body>
    </html>
  )
}
