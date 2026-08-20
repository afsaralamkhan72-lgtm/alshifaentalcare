import Image from 'next/image'
import Link from 'next/link'

interface BlogCardProps {
  slug: string
  title: string
  coverImageUrl?: string | null
  publishedAt?: string | null
}

export default function BlogCard({ slug, title, coverImageUrl, publishedAt }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="group overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-40 w-full bg-clinic-mint">
        {coverImageUrl && (
          <Image src={coverImageUrl} alt={title} fill className="object-cover" />
        )}
      </div>
      <div className="p-4">
        {publishedAt && (
          <p className="text-xs text-clinic-ink/40">
            {new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
        <p className="mt-1 font-display text-base font-semibold text-clinic-ink group-hover:text-clinic-teal">
          {title}
        </p>
      </div>
    </Link>
  )
}
