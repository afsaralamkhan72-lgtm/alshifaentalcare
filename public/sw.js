self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('push', (e) => {
  let d = { title: 'Al Shifa', body: '', url: '/admin/dashboard' }
  try { d = { ...d, ...e.data.json() } } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: d.url } }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/admin/dashboard'
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if (c.url.includes('/admin') && 'focus' in c) return c.focus()
    return self.clients.openWindow(url)
  }))
})
