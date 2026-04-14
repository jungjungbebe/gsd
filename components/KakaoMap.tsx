'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'
import styles from './KakaoMap.module.css'

const CAFES = [
  { id: 1, name: '을지로 충무빌딩 2층 카페', lat: 37.5662, lng: 126.9916, tag: '집중형', dist: '0.3km', people: 8 },
  { id: 2, name: '성수 대림창고 라운지', lat: 37.5448, lng: 127.0557, tag: '감성형', dist: '1.2km', people: 12 },
  { id: 3, name: '합정 카페 보헤미안', lat: 37.5497, lng: 126.9134, tag: '여유형', dist: '2.1km', people: 3 },
]

const HUNTS = [
  { id: 1, lat: 37.5640, lng: 126.9880, label: '간판 발견!' },
  { id: 2, lat: 37.5470, lng: 127.0500, label: '신문 발견!' },
  { id: 3, lat: 37.5510, lng: 126.9200, label: '표지판 발견!' },
]

declare global {
  interface Window {
    kakao: any
  }
}

export default function KakaoMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const overlaysRef = useRef<any[]>([])
  const [selected, setSelected] = useState(CAFES[0])
  const [filter, setFilter] = useState<'cafe' | 'hunt'>('cafe')
  const [ready, setReady] = useState(false)

  function handleScriptLoad() {
    console.log('[KakaoMap] next/script onReady 호출')
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => {
        console.log('[KakaoMap] maps.load() 완료')
        if (mapRef.current) {
          const map = new window.kakao.maps.Map(mapRef.current, {
            center: new window.kakao.maps.LatLng(37.5562, 126.9724),
            level: 5,
          })
          mapInstanceRef.current = map
          setReady(true)
        }
      })
    }
  }

  const updateOverlays = useCallback(() => {
    if (!ready || !mapInstanceRef.current) return

    const { kakao } = window
    const map = mapInstanceRef.current

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    if (filter === 'cafe') {
      CAFES.forEach((cafe) => {
        const content = document.createElement('div')
        content.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer'
        content.innerHTML = `
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(13,13,20,0.95);border:2px solid rgba(181,167,143,0.8);display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px rgba(244,239,230,0.16)">☕</div>
          <div style="background:rgba(13,13,20,0.9);border:0.5px solid rgba(244,239,230,0.12);border-radius:6px;padding:3px 8px;font-size:10px;color:#d4c9b8;white-space:nowrap;margin-top:3px;font-family:monospace">${cafe.people}명</div>
        `
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(cafe.lat, cafe.lng),
          content,
          yAnchor: 1.2,
        })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      })
    } else {
      HUNTS.forEach((hunt) => {
        const content = document.createElement('div')
        content.style.cssText = 'display:flex;flex-direction:column;align-items:center'
        content.innerHTML = `
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(13,13,10,0.95);border:1.5px solid rgba(250,199,117,0.7);display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 10px rgba(186,117,23,0.3)">📸</div>
          <div style="background:rgba(13,13,10,0.9);border:0.5px solid rgba(186,117,23,0.3);border-radius:6px;padding:2px 7px;font-size:9px;color:#fac775;white-space:nowrap;margin-top:3px;font-family:monospace">${hunt.label}</div>
        `
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(hunt.lat, hunt.lng),
          content,
          yAnchor: 1.2,
        })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      })
    }
  }, [ready, filter])

  useEffect(() => { updateOverlays() }, [updateOverlays])

  return (
    <div className={styles.wrap}>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={handleScriptLoad}
        onError={(e) => console.error('[KakaoMap] Script 로드 실패:', e)}
      />

      <div className={styles.header}>
        <div>
          <div className={styles.title}>단어 사냥</div>
          <div className={styles.sub}>오늘의 단어 · 검토(檢討)</div>
        </div>
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} />
          <span className={styles.liveText}>47명 사냥 중</span>
        </div>
      </div>

      <div className={styles.filterRow}>
        <button
          className={`${styles.filterBtn} ${filter === 'cafe' ? styles.filterActive : ''}`}
          onClick={() => setFilter('cafe')}
        >
          ☕ 필사 카페
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'hunt' ? styles.filterActive : ''}`}
          onClick={() => setFilter('hunt')}
        >
          📸 단어 사냥
        </button>
      </div>

      <div ref={mapRef} style={{ width: '100%', height: '320px' }} className={styles.map} />

      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.cafeScroll}>
          {CAFES.map((cafe) => (
            <div
              key={cafe.id}
              className={`${styles.cafeCard} ${selected.id === cafe.id ? styles.cafeSelected : ''}`}
              onClick={() => setSelected(cafe)}
            >
              <div className={styles.cafeTop}>
                <div className={styles.cafeIcon}>☕</div>
                <span className={styles.cafePeople}>{cafe.people}명 필사 중</span>
              </div>
              <div className={styles.cafeName}>{cafe.name}</div>
              <div className={styles.cafeDist}>{cafe.dist}</div>
              <div className={styles.cafeTags}>
                <span className={styles.cafeTag}>{cafe.tag}</span>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.certBar}>
          <button className={styles.certBtn}>
            📸 {selected.name}에서 인증하기
          </button>
        </div>
      </div>
    </div>
  )
}
