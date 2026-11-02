/**
 * Converts a normal/shared YouTube link into an embeddable URL.
 * Supports: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    let videoId: string | null = null

    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1)
    } else if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v')
      if (!videoId && u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/embed/')[1]
      }
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
  } catch {
    return null
  }
}
