import { getYouTubeEmbedUrl } from '@/lib/youtube'

interface VideoEmbedProps {
  title: string
  youtubeUrl: string
}

export default function VideoEmbed({ title, youtubeUrl }: VideoEmbedProps) {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl)
  if (!embedUrl) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white shadow-sm">
      <div className="relative aspect-video w-full">
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <p className="p-3 text-sm font-medium text-clinic-ink">{title}</p>
    </div>
  )
}
