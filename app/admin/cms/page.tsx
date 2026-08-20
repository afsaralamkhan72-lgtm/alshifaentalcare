import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import CMSSettings from '@/components/admin/CMSSettings'
import CMSContentManager, { type FieldDef } from '@/components/admin/CMSContentManager'

const DEPARTMENT_OPTIONS = [
  { value: 'dental', label: 'Dental' },
  { value: 'homeopathic', label: 'Homeopathic' },
]

const SERVICE_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Treatment Name', type: 'text', required: true },
  { key: 'department', label: 'Department', type: 'select', options: DEPARTMENT_OPTIONS, required: true },
  { key: 'short_description', label: 'Short Description', type: 'textarea' },
  { key: 'image_url', label: 'Treatment Picture', type: 'image', bucket: 'media', folder: 'services' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'is_active', label: 'Show on website', type: 'checkbox' },
]

const GALLERY_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'category', label: 'Category', type: 'select', options: DEPARTMENT_OPTIONS },
  { key: 'before_image_url', label: 'Before Image', type: 'image', bucket: 'media', folder: 'gallery' },
  { key: 'after_image_url', label: 'After Image', type: 'image', bucket: 'media', folder: 'gallery' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
]

const VIDEO_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Video Title', type: 'text', required: true },
  { key: 'youtube_url', label: 'YouTube Link', type: 'text', required: true },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
]

const DOCTOR_FIELDS: FieldDef[] = [
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'qualification', label: 'Qualification', type: 'text' },
  { key: 'bio', label: 'Bio', type: 'textarea' },
  { key: 'image_url', label: 'Photo', type: 'image', bucket: 'media', folder: 'doctors' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
]

const TESTIMONIAL_FIELDS: FieldDef[] = [
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'review_text', label: 'Review', type: 'textarea', required: true },
  { key: 'rating', label: 'Rating (1-5)', type: 'number' },
  { key: 'is_approved', label: 'Approve immediately', type: 'checkbox' },
]

const BLOG_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Post Title', type: 'text', required: true },
  { key: 'slug', label: 'Slug (url-friendly)', type: 'text', required: true },
  { key: 'content', label: 'Content', type: 'textarea', required: true },
  { key: 'cover_image_url', label: 'Cover Image', type: 'image', bucket: 'media', folder: 'blog' },
  { key: 'is_published', label: 'Publish immediately', type: 'checkbox' },
]

export default async function CMSPage() {
  await requireAdmin()
  const supabase = await createClient()

  const [settingsRes, services, gallery, videos, doctors, testimonials, blog] = await Promise.all([
    supabase.from('site_settings').select('key, value'),
    supabase.from('services').select('*').order('sort_order'),
    supabase.from('gallery').select('*').order('sort_order'),
    supabase.from('videos').select('*').order('sort_order'),
    supabase.from('doctors').select('*').order('sort_order'),
    supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
    supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
  ])

  const settingsMap: Record<string, Record<string, unknown>> = {}
  for (const row of settingsRes.data ?? []) {
    settingsMap[row.key] = row.value as Record<string, unknown>
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Edit Website</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Yahan se website ki har cheez edit karein — koi developer ki zaroorat nahi.
        Changes save karte hi live ho jate hain.
      </p>

      <div className="mt-6">
        <CMSSettings initial={settingsMap} />
      </div>

      <div className="mt-8 grid gap-6">
        <CMSContentManager
          table="services"
          title="Treatments / Services"
          hint="Dental aur Homeopathic treatments — picture aur detail ke sath."
          fields={SERVICE_FIELDS}
          rows={services.data ?? []}
          displayKey="title"
          subtitleKey="department"
        />

        <CMSContentManager
          table="gallery"
          title="Before & After Gallery"
          fields={GALLERY_FIELDS}
          rows={gallery.data ?? []}
          displayKey="title"
          subtitleKey="category"
        />

        <CMSContentManager
          table="videos"
          title="Videos (YouTube)"
          hint="Sirf YouTube links — koi heavy video upload nahi, space bachti hai."
          fields={VIDEO_FIELDS}
          rows={videos.data ?? []}
          displayKey="title"
          subtitleKey="youtube_url"
        />

        <CMSContentManager
          table="doctors"
          title="Doctors Panel"
          fields={DOCTOR_FIELDS}
          rows={doctors.data ?? []}
          displayKey="full_name"
          subtitleKey="qualification"
        />

        <CMSContentManager
          table="testimonials"
          title="Testimonials / Reviews"
          hint="Approve kiye bagair review website par nahi dikhega."
          fields={TESTIMONIAL_FIELDS}
          rows={testimonials.data ?? []}
          displayKey="patient_name"
          subtitleKey="review_text"
        />

        <CMSContentManager
          table="blog_posts"
          title="Blog & Health Tips"
          fields={BLOG_FIELDS}
          rows={blog.data ?? []}
          displayKey="title"
          subtitleKey="slug"
        />
      </div>
    </div>
  )
}
