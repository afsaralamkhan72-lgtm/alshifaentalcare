import Image from 'next/image'

interface GalleryItemProps {
  title?: string | null
  beforeImageUrl?: string | null
  afterImageUrl?: string | null
  category?: string | null
}

export default function GalleryItem({ title, beforeImageUrl, afterImageUrl, category }: GalleryItemProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white shadow-sm">
      <div className="grid grid-cols-2">
        <div className="relative aspect-square">
          {beforeImageUrl && <Image src={beforeImageUrl} alt="Before" fill className="object-cover" />}
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            Before
          </span>
        </div>
        <div className="relative aspect-square">
          {afterImageUrl && <Image src={afterImageUrl} alt="After" fill className="object-cover" />}
          <span className="absolute bottom-2 left-2 rounded-full bg-clinic-teal px-2 py-0.5 text-[10px] font-semibold text-white">
            After
          </span>
        </div>
      </div>
      {(title || category) && (
        <div className="p-3">
          {title && <p className="text-sm font-medium text-clinic-ink">{title}</p>}
          {category && <p className="text-xs capitalize text-clinic-ink/50">{category}</p>}
        </div>
      )}
    </div>
  )
}
