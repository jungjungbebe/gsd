'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'
import styles from './KakaoMap.module.css'

const CAFES = [
  { id: 1, name: '을지로 충무빌딩 2층 카페', lat: 37.5662, lng: 126.9916, tag: '집중형', dist: '0.3km' },
  { id: 2, name: '성수 대림창고 라운지', lat: 37.5448, lng: 127.0557, tag: '감성형', dist: '1.2km' },
  { id: 3, name: '합정 카페 보헤미안', lat: 37.5497, lng: 126.9134, tag: '여유형', dist: '2.1km' },
]

const WORDS = [
  { hanja: '檢討', korean: '검토', meaning: '자세히 조사하고 판단함' },
  { hanja: '協調', korean: '협조', meaning: '힘을 합쳐 서로 도움' },
  { hanja: '關係者', korean: '관계자', meaning: '어떤 일에 관련이 있는 사람' },
  { hanja: '利用', korean: '이용', meaning: '필요에 따라 이롭게 씀' },
  { hanja: '制限', korean: '제한', meaning: '일정한 한도를 정함' },
  { hanja: '禁止', korean: '금지', meaning: '하지 못하게 함' },
  { hanja: '要請', korean: '요청', meaning: '필요한 일을 해달라고 청함' },
  { hanja: '承認', korean: '승인', meaning: '옳다고 인정하여 허락함' },
  { hanja: '添附', korean: '첨부', meaning: '서류를 덧붙여 보냄' },
  { hanja: '施行', korean: '시행', meaning: '실제로 실행함' },
]

const STORAGE_KEY = 'tutone_word_collection'

function getTodayWord() {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return WORDS[seed % WORDS.length]
}

function getTodayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function loadCollection(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveCollection(korean: string): void {
  const current = loadCollection()
  if (!current.includes(korean)) {
    current.push(korean)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  }
}

declare global {
  interface Window {
    kakao: any
  }
}

export default function KakaoMap() {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const overlaysRef = useRef<any[]>([])
  const [selected, setSelected] = useState(CAFES[0])
  const [ready, setReady] = useState(false)
  const [certified, setCertified] = useState(false)
  const [collection, setCollection] = useState<string[]>([])

  const todayWord = getTodayWord()

  useEffect(() => {
    setCollection(loadCollection())
  }, [])

  function handleScriptLoad() {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
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

  const renderOverlays = useCallback(() => {
    if (!ready || !mapInstanceRef.current) return
    const kakao = window.kakao
    const map = mapInstanceRef.current

    overlaysRef.current.forEach((o: any) => o.setMap(null))
    overlaysRef.current = []

    CAFES.forEach((cafe) => {
      const isSelected = selected.id === cafe.id
      const content = document.createElement('div')
      content.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.3s'
      content.innerHTML = isSelected
        ? '<div style="width:44px;height:44px;border-radius:50%;background:rgba(250,199,117,0.95);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 0 6px rgba(250,199,117,0.25);animation:pulse 1.5s infinite">☕</div>'
        : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(13,13,20,0.95);border:2px solid rgba(181,167,143,0.8);display:flex;align-items:center;justify-content:center;font-size:16px;">☕</div>'
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(cafe.lat, cafe.lng),
        content: content,
        yAnchor: 1.2,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
    })
  }, [ready, selected])

  useEffect(() => { renderOverlays() }, [renderOverlays])

  function handleSelectCafe(cafe: typeof CAFES[number]) {
    setSelected(cafe)
    setCertified(false)
    if (mapInstanceRef.current && window.kakao) {
      const moveLatLng = new window.kakao.maps.LatLng(cafe.lat, cafe.lng)
      mapInstanceRef.current.panTo(moveLatLng)
    }
  }

  function handleCertify() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = () => {
      if (input.files && input.files[0]) {
        saveCollection(todayWord.korean)
        setCollection(loadCollection())
        setCertified(true)
      }
    }
    input.click()
  }

  return (
    <div className={styles.wrap}>
      <style>{`@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(250,199,117,0.5); } 70% { box-shadow: 0 0 0 12px rgba(250,199,117,0); } 100% { box-shadow: 0 0 0 0 rgba(250,199,117,0); } }`}</style>
      <Script
        src={"https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + process.env.NEXT_PUBLIC_KAKAO_MAP_KEY + "&autoload=false"}
        strategy="afterInteractive"
        onReady={handleScriptLoad}
      />

      <div className={styles.header}>
        <div>
          <div className={styles.title}>단어 사냥</div>
          <div className={styles.sub}>오늘의 단어 · {todayWord.korean}({todayWord.hanja})</div>
        </div>
      </div>

      <div ref={mapRef} style={{ width: '100%', height: '280px' }} className={styles.map} />

      <div className={styles.sheet}>
        <div className={styles.handle} />

        {certified ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div style={{ color: '#fac775', fontWeight: 700, fontSize: '18px', marginBottom: '2px' }}>
              {todayWord.korean} {todayWord.hanja} 발견!
            </div>
            <div style={{ color: '#d4c9b8', fontSize: '12px', marginBottom: '4px' }}>
              📍 {selected.name.split(' ')[0]} · {getTodayDateStr()}
            </div>
            <div style={{ color: '#fac775', fontWeight: 600, marginBottom: '16px' }}>+30 XP</div>

            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>내 단어도감 ({collection.length}/{WORDS.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {WORDS.map((w) => (
                  <div key={w.korean} style={{ fontSize: '13px', color: collection.includes(w.korean) ? '#fac775' : '#555' }}>
                    {collection.includes(w.korean) ? '✓' : '□'} {w.korean}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setCertified(false)}
              style={{ marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'underline', background: 'none', border: 'none' }}
            >
              지도로 돌아가기
            </button>
          </div>
        ) : (
          <div>
            <div className={styles.cafeScroll}>
              {CAFES.map((cafe) => (
                <div
                  key={cafe.id}
                  className={(selected.id === cafe.id) ? styles.cafeCard + ' ' + styles.cafeSelected : styles.cafeCard}
                  onClick={() => handleSelectCafe(cafe)}
                >
                  <div className={styles.cafeTop}>
                    <div className={styles.cafeIcon}>☕</div>
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
              <button className={styles.certBtn} onClick={handleCertify}>
                📸 {selected.name}에서 '{todayWord.korean}' 발견 인증하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
