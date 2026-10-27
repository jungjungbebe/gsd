'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import styles from './KakaoMap.module.css'
import StampCard from './StampCard'
import {
  ThemeRecord,
  loadThemeRecord,
  saveThemeRecord,
  loadArchiveCount,
} from '@/lib/themeRecord'
import { addWritingRecord } from '@/lib/tutone-records'

declare global {
  interface Window {
    kakao: any
  }
}

const THEME = {
  korean: '전환',
  hanja: '轉換',
  english: 'TRANSITION',
  huntPrompt:
    '낡은 건물 옆 새 건물도, 공사 중인 거리도, "Renewal"이라는 간판도 괜찮아요. 도시에서 \'전환\'을 떠올리게 하는 장면이나 단어를 찾아 사진으로 남겨보세요.',
  huntSpot: { lat: 37.5443, lng: 127.0557 },
  spot: {
    id: 'daerim',
    name: '대림창고',
    area: '성수',
    tag: 'CHANGE',
    lat: 37.5445,
    lng: 127.0564,
    sentence: '방향을 바꾼다고 해서 지금까지 걸어온 길이 사라지는 것은 아니다.',
  },
}

const NEARBY_SPOTS = [
  { id: 'daerim', name: '대림창고', dist: '120m', lat: 37.5445, lng: 127.0564 },
  { id: 'nearby1', name: '성수연방', dist: '340m', lat: 37.5439, lng: 127.0553 },
  { id: 'nearby2', name: '어니언 성수', dist: '410m', lat: 37.5441, lng: 127.0578 },
]

type Stage = 'hunt' | 'stamp' | 'write' | 'collect'

export default function ThemeCycle({
  initialStage = 'hunt',
  onClose,
}: {
  initialStage?: 'hunt' | 'write'
  onClose?: () => void
}) {
  const [stage, setStage] = useState<Stage>(initialStage)
  const [record, setRecord] = useState<ThemeRecord>({ hunt: false, write: false })
  const [archiveCount, setArchiveCount] = useState(0)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [selectedSpotId, setSelectedSpotId] = useState(THEME.spot.id)

  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const overlaysRef = useRef<any[]>([])
  const huntInputRef = useRef<HTMLInputElement | null>(null)
  const writeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setRecord(loadThemeRecord())
    setArchiveCount(loadArchiveCount())

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => setMapReady(true))
    }
  }, [])

  useEffect(() => {
    if ((stage !== 'write' && stage !== 'hunt') || !mapReady || !mapDivRef.current) return
    if (!window.kakao || !window.kakao.maps) return

    const centerCoords = stage === 'write' ? THEME.spot : THEME.huntSpot
    const center = new window.kakao.maps.LatLng(centerCoords.lat, centerCoords.lng)
    const map = new window.kakao.maps.Map(mapDivRef.current, {
      center,
      level: stage === 'hunt' ? 3 : 4,
    })
    mapInstanceRef.current = map

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    if (stage === 'hunt') {
      const el = document.createElement('div')
      el.innerHTML =
        '<div style="width:44px;height:44px;border-radius:50%;background:#d9a441;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;">📷</div>'
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(THEME.huntSpot.lat, THEME.huntSpot.lng),
        content: el,
        yAnchor: 0.5,
      })
      overlay.setMap(map)
      overlaysRef.current.push(overlay)
    }

    if (stage === 'write') {
      NEARBY_SPOTS.forEach((spot) => {
        const isSelected = spot.id === selectedSpotId
        const el = document.createElement('div')
        el.innerHTML = isSelected
          ? '<div style="width:40px;height:40px;border-radius:50%;background:var(--purple-500);border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;">☕</div>'
          : '<div style="width:26px;height:26px;border-radius:50%;background:var(--bg-elevated);border:1px solid var(--border-default);display:flex;align-items:center;justify-content:center;font-size:12px;">☕</div>'
        el.style.cursor = 'pointer'
        el.addEventListener('click', () => handleSelectSpot(spot))

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(spot.lat, spot.lng),
          content: el,
          yAnchor: 0.5,
        })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, mapReady, selectedSpotId])

  function handleSelectSpot(spot: { id: string; lat: number; lng: number }) {
    setSelectedSpotId(spot.id)
    if (mapInstanceRef.current && window.kakao) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(spot.lat, spot.lng))
    }
  }

  function triggerHuntUpload() {
    huntInputRef.current?.click()
  }

  function handleHuntFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCapturedPhoto(reader.result as string)
      setStage('stamp')
    }
    reader.readAsDataURL(file)
  }

  function handleStamped(count: number) {
    const next: ThemeRecord = {
      ...record,
      hunt: true,
      huntPhoto: capturedPhoto ?? undefined,
      date: new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    }
    setRecord(next)
    saveThemeRecord(next)
    setArchiveCount(count)
  }

  function triggerWriteUpload() {
    writeInputRef.current?.click()
  }

  function handleWriteFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const next: ThemeRecord = { ...record, write: true, writePhoto: reader.result as string }
      setRecord(next)
      saveThemeRecord(next)
      addWritingRecord({
        theme: `${THEME.korean}(${THEME.hanja})`,
        spot: `${THEME.spot.area} ${THEME.spot.name}`,
        sentence: THEME.spot.sentence,
      })
      setStage('collect')
    }
    reader.readAsDataURL(file)
  }

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY

  return (
    <div className={styles.wrap}>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`}
        strategy="afterInteractive"
        onLoad={() => {
          window.kakao.maps.load(() => setMapReady(true))
        }}
      />

      <div className={styles.header}>
        <div>
          <div className={styles.title}>
            {stage === 'hunt' && '단어 사냥'}
            {stage === 'stamp' && '나의 발견'}
            {stage === 'write' && '필사 스팟'}
            {stage === 'collect' && '기록'}
          </div>
          <div className={styles.sub}>오늘의 테마 · {THEME.korean} {THEME.hanja}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 300,
              color: 'var(--text-secondary)',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border-default)',
              borderRadius: 999,
              padding: '6px 14px',
            }}
          >
            닫기
          </button>
        )}
      </div>

      {stage === 'hunt' && (
        <>
          <div ref={mapDivRef} className={styles.map} />
          <div className={styles.sheet}>
            <div className={styles.handle} />
            <div style={{ padding: '16px 16px 0' }}>
              <span className="label-mono">WORD HUNT</span>
              <p style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {THEME.huntPrompt}
              </p>
            </div>
            <div className={styles.certBar}>
              <button className={styles.certBtn} onClick={triggerHuntUpload}>
                📷 나의 '{THEME.korean}' 발견 올리기
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 16px' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)' }}>내 발견 아카이브</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-purple)', fontWeight: 700 }}>{archiveCount}장</span>
            </div>
            <input ref={huntInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleHuntFile} />
          </div>
        </>
      )}

      {stage === 'stamp' && capturedPhoto && (
        <StampCard
          photo={capturedPhoto}
          theme={THEME}
          location={`${THEME.spot.area} · SEOUL`}
          onStamped={handleStamped}
          onFinish={() => (onClose ? onClose() : setStage('hunt'))}
        />
      )}

      {stage === 'write' && (
        <>
          <div ref={mapDivRef} className={styles.map} />
          <div className={styles.sheet}>
            <div className={styles.handle} />
            <div className={styles.cafeScroll}>
              {NEARBY_SPOTS.map((spot) => (
                <div
                  key={spot.id}
                  className={`${styles.cafeCard} ${spot.id === selectedSpotId ? styles.cafeSelected : ''}`}
                  onClick={() => handleSelectSpot(spot)}
                >
                  <div className={styles.cafeTop}>
                    <div className={styles.cafeIcon}>☕</div>
                  </div>
                  <div className={styles.cafeName}>{spot.name}</div>
                  <div className={styles.cafeDist}>{spot.dist}</div>
                  <div className={styles.cafeTags}>
                    <span className={styles.cafeTag}>{THEME.spot.area}</span>
                    <span className={styles.cafeTag}>{THEME.spot.tag}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '4px 16px 0' }}>
              <span className="label-mono">오늘의 문장 (참고)</span>
              <p style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                "{THEME.spot.sentence}"
              </p>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)' }}>
                이 문장을 써도, 내가 좋아하는 문장을 직접 써도 좋아요.
              </span>
            </div>

            <div style={{ margin: '14px 16px 0' }}>
              <div
                style={{
                  border: '1px dashed var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}
                >
                  ✍️
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, color: 'var(--text-primary)' }}>
                  종이에 직접 필사한 후, 사진으로 남겨주세요
                </span>
              </div>
            </div>

            <div className={styles.certBar}>
              <button className={styles.certBtn} onClick={triggerWriteUpload}>
                📸 내 필사 사진 올리기
              </button>
            </div>
            <input ref={writeInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleWriteFile} />
          </div>
        </>
      )}

      {stage === 'collect' && (
        <div className={styles.sheet} style={{ padding: '32px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>🏅</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 400, color: 'var(--text-primary)' }}>
            '{THEME.korean}'의 기록이 완성됐어요
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#5dcaa5' }}>+50 XP</div>

          <div style={{ width: '100%', display: 'flex', gap: 8 }}>
            <div
              style={{
                flex: 1,
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                background: record.huntPhoto ? `url(${record.huntPhoto}) center/cover` : 'var(--glass-purple)',
                border: '0.5px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                position: 'relative',
              }}
            >
              {!record.huntPhoto && <span style={{ fontSize: 20 }}>📷</span>}
              <span className="label-mono" style={{ position: 'absolute', bottom: 8 }}>EXPLORE</span>
            </div>
            <div
              style={{
                flex: 1,
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                background: record.writePhoto ? `url(${record.writePhoto}) center/cover` : 'var(--glass-purple)',
                border: '0.5px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                position: 'relative',
              }}
            >
              {!record.writePhoto && <span style={{ fontSize: 20 }}>✍️</span>}
              <span className="label-mono" style={{ position: 'absolute', bottom: 8 }}>WRITE</span>
            </div>
          </div>

          <div className="glass-card" style={{ width: '100%', boxSizing: 'border-box', padding: 16, textAlign: 'left' }}>
            <span className="label-mono">오늘의 테마 · {THEME.korean} {THEME.hanja}</span>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              도시에서 발견한 장면과, 직접 눌러쓴 문장이 하나의 기록으로 남았어요.
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', gap: 8 }}>
            <button
              className={styles.certBtn}
              style={{ flex: 1 }}
              onClick={() => {
                if (navigator.share && record.writePhoto) {
                  navigator.share({ title: `TUTONE · ${THEME.korean}`, text: THEME.spot.sentence }).catch(() => {})
                } else {
                  alert('공유 기능은 준비 중이에요')
                }
              }}
            >
              공유하기
            </button>
            <button
              className="glass-card"
              style={{
                flex: 1,
                border: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--text-primary)',
              }}
              onClick={onClose}
            >
              아카이브 보기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
