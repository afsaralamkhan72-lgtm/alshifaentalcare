import Image from 'next/image'

interface DoctorCardProps {
  fullName: string
  qualification?: string | null
  bio?: string | null
  imageUrl?: string | null
}

export default function DoctorCard({ fullName, qualification, bio, imageUrl }: DoctorCardProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-clinic-teal/10 bg-white p-6 text-center shadow-sm">
      <div className="relative h-28 w-28 overflow-hidden rounded-full bg-clinic-mint">
        {imageUrl ? (
          <Image src={imageUrl} alt={fullName} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-display text-clinic-teal/40">
            {fullName.charAt(0)}
          </div>
        )}
      </div>
      <p className="mt-4 font-display text-lg font-semibold text-clinic-ink">{fullName}</p>
      {qualification && <p className="mt-1 text-sm text-clinic-teal">{qualification}</p>}
      {bio && <p className="mt-3 text-sm text-clinic-ink/60">{bio}</p>}
    </div>
  )
}
