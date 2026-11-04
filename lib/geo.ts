/** Phone ki location (sirf browser mein). Na mile to null. */
export interface Pos {
  lat: number
  lng: number
  /** meter mein andaza (kam = behtar) */
  acc: number
}

export function getPosition(timeoutMs = 15000): Promise<Pos | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    )
  })
}
