// 필사 스팟 추천: 큐레이션(요즘 뜨는 서울 동네) + 카카오 장소검색 하이브리드
// 좌표는 코드에 박아두지 않고, 장소 이름을 카카오 검색으로 실시간 확인해 사용한다.

export type Spot = {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  distM: number | null
}

export type Area = {
  id: string
  name: string
  lat: number
  lng: number
  picks: string[] // 큐레이션 검색어 (앞에 있을수록 우선)
}

export const AREAS: Area[] = [
  { id: 'seongsu', name: '성수', lat: 37.5446, lng: 127.056, picks: ['대림창고 성수', '어니언 성수', '성수연방', '블루보틀 성수'] },
  { id: 'seoulforest', name: '서울숲', lat: 37.5444, lng: 127.0374, picks: ['서울숲', '서울숲 독립서점', '서울숲 카페'] },
  { id: 'yeonnam', name: '연남', lat: 37.5622, lng: 126.9244, picks: ['경의선숲길 연남', '연남동 독립서점', '연남동 카페'] },
  { id: 'yeonhui', name: '연희', lat: 37.5683, lng: 126.934, picks: ['연희동 책방', '연희동 카페', '연희동 베이커리'] },
  { id: 'jongno', name: '종로', lat: 37.57, lng: 126.9822, picks: ['교보문고 광화문점', '인사동 찻집', '익선동 카페'] },
  { id: 'seochon', name: '서촌', lat: 37.58, lng: 126.9696, picks: ['서촌 카페', '통인시장', '서촌 서점'] },
  { id: 'euljiro', name: '을지로', lat: 37.566, lng: 126.991, picks: ['을지로 카페', '을지로3가 카페', '을지로 서점'] },
  { id: 'gangnam', name: '강남', lat: 37.4979, lng: 127.0276, picks: ['교보문고 강남점', '강남 북카페', '강남역 카페'] },
  { id: 'yeouido', name: '여의도', lat: 37.5219, lng: 126.9245, picks: ['더현대 서울', '여의도 한강공원', '여의도 북카페'] },
  { id: 'samseong', name: '삼성동', lat: 37.5088, lng: 127.063, picks: ['별마당도서관', '삼성동 카페', '봉은사'] },
  { id: 'apgujeong', name: '압구정', lat: 37.5273, lng: 127.035, picks: ['압구정 로데오 카페', '압구정 북카페', '갤러리아 압구정'] },
]

// 검색이 모두 실패했을 때 쓰는 기본 장소 (성수)
export const STATIC_SPOTS: Spot[] = [
  { id: 'static-daerim', name: '대림창고', category: '카페', lat: 37.5445, lng: 127.0564, distM: null },
  { id: 'static-federation', name: '성수연방', category: '복합문화공간', lat: 37.5439, lng: 127.0553, distM: null },
  { id: 'static-onion', name: '어니언 성수', category: '카페', lat: 37.5441, lng: 127.0578, distM: null },
]

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }
const SEOUL_RADIUS_M = 30000
const AREA_MATCH_M = 4000
const MAX_SPOTS = 4

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function isInSeoul(p: { lat: number; lng: number }): boolean {
  return haversine(p, SEOUL_CENTER) <= SEOUL_RADIUS_M
}

export function nearestArea(p: { lat: number; lng: number }): { area: Area; distM: number } {
  let best = AREAS[0]
  let bestD = Infinity
  for (const a of AREAS) {
    const d = haversine(p, a)
    if (d < bestD) {
      best = a
      bestD = d
    }
  }
  return { area: best, distM: bestD }
}

export function formatDist(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)}m`
  return `${(m / 1000).toFixed(1)}km`
}

function toSpot(p: any, origin: { lat: number; lng: number } | null): Spot {
  const lat = parseFloat(p.y)
  const lng = parseFloat(p.x)
  const cat = String(p.category_name || '')
    .split('>')
    .pop()
    ?.trim()
  return {
    id: String(p.id),
    name: String(p.place_name),
    category: cat || '장소',
    lat,
    lng,
    distM: origin ? haversine(origin, { lat, lng }) : null,
  }
}

function runSearch(fn: (cb: (data: any[], status: string) => void) => void): Promise<any[]> {
  return new Promise((resolve) => {
    try {
      fn((data, status) => {
        resolve(status === window.kakao.maps.services.Status.OK ? data : [])
      })
    } catch {
      resolve([])
    }
  })
}

export function getPosition(timeoutMs = 8000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    )
  })
}

// origin이 있으면(GPS) 거리순, 없으면(동네 선택) 큐레이션 순서
export async function resolveSpots(opts: {
  area: Area
  origin: { lat: number; lng: number } | null
}): Promise<Spot[]> {
  const { area, origin } = opts
  const kakao = window.kakao
  if (!kakao?.maps?.services) return []
  const ps = new kakao.maps.services.Places()
  const areaLL = new kakao.maps.LatLng(area.lat, area.lng)

  const curatedRaw = await Promise.all(
    area.picks.map((q) =>
      runSearch((cb) => ps.keywordSearch(q, cb, { location: areaLL, radius: 3000, size: 1 }))
    )
  )

  const out: Spot[] = []
  const seen = new Set<string>()
  for (const list of curatedRaw) {
    const p = list[0]
    if (!p) continue
    const s = toSpot(p, origin)
    if (seen.has(s.id)) continue
    if (haversine(area, s) > 3500) continue
    seen.add(s.id)
    out.push(s)
  }

  if (out.length < MAX_SPOTS) {
    const base = origin ?? area
    const baseLL = new kakao.maps.LatLng(base.lat, base.lng)
    const cafes = await runSearch((cb) =>
      ps.categorySearch('CE7', cb, { location: baseLL, radius: 1000, sort: kakao.maps.services.SortBy.DISTANCE, size: 15 })
    )
    for (const p of cafes) {
      if (out.length >= MAX_SPOTS + (origin ? 4 : 0)) break
      const s = toSpot(p, origin)
      if (seen.has(s.id)) continue
      seen.add(s.id)
      out.push(s)
    }
  }

  if (origin) out.sort((a, b) => (a.distM ?? 0) - (b.distM ?? 0))
  return out.slice(0, MAX_SPOTS)
}

export const LOCATION_KEY = 'tutone_location'
