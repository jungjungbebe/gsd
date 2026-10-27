// 간단한 메모리 기반 호출 제한 (서버리스 인스턴스별 best-effort).
// 완전한 차단은 아니지만 단순 남용과 비용 폭주를 막아준다.
const buckets = new Map<string, { count: number; reset: number }>()

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim()
}

export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now()
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => { if (v.reset < now) buckets.delete(k) })
  }
  const b = buckets.get(key)
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  b.count += 1
  return b.count <= limit
}
