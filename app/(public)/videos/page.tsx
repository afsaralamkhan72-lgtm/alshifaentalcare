import PageHeader from '@/components/public/PageHeader'
import VideoEmbed from '@/components/public/VideoEmbed'
import { createClient } from '@/lib/supabase/server'

async function getVideos() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('videos')
      .select('id, title, youtube_url')
      .order('sort_order', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

export default async function VideosPage() {
  const videos = await getVideos()

  return (
    <>
      <PageHeader
        eyebrow="Virtual Tour"
        title="Clinic Videos"
        description="Hamari clinic aur treatment process video mein dekhein."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {videos.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {videos.map((v) => (
              <VideoEmbed key={v.id} title={v.title} youtubeUrl={v.youtube_url} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
            Koi video abhi add nahi hua — Admin Panel se YouTube link add karein.
          </p>
        )}
      </section>
    </>
  )
}
