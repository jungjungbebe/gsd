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
import { getTodaySet } from '@/lib/missionSets'

declare global {
  interface Window {
    kakao: any
  }
}

const THEME_BASE = {
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

type Stage = 'hunt' | 'stamp' | 'write' | 'convert' | 'photo' | 'collect'

// 종이 카드가 한 장씩 넘어오는 전환
const paperStyle: React.CSSProperties = { animation: 'paperIn 0.38s cubic-bezier(0.2, 0.8, 0.2, 1)' }

function StepBar({ current }: { current: 1 | 2 | 3 | 4 }) {
  const labels = ['장소', '쓰기', '사진', '완료']
  return (
    <div style={{ padding: '4px 0 6px' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {labels.map((l, i) => (
          <div key={l} style={{ flex: 1, height: 3, borderRadius: 2, background: i < current ? 'var(--purple-500)' : 'var(--border-default)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {labels.map((l, i) => (
          <span
            key={l}
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: i + 1 === current ? 'var(--text-purple)' : 'var(--text-secondary)',
              fontWeight: i + 1 === current ? 700 : 400,
            }}
          >
            {i + 1 < current ? '✓ ' : '0' + (i + 1) + ' '}
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

async function compressImage(file: File, maxSize = 1000): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return dataUrl
  }
}

function exampleSvg(sentence: string): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#f4efe6"/>' +
    [140, 220, 300, 380, 460].map((y) => '<line x1="60" y1="' + y + '" x2="740" y2="' + y + '" stroke="#d8cfbf" stroke-width="2"/>').join('') +
    '<text x="60" y="120" font-family="sans-serif" font-size="30" fill="#4a3f6b">' + sentence.slice(0, 20) + '</text>' +
    '<text x="60" y="200" font-family="sans-serif" font-size="26" fill="#6040a0">(예시 사진) 내가 종이에 쓴 문장이 여기에 보여요</text></svg>'
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export default function ThemeCycle({
  initialStage = 'hunt',
  onClose,
}: {
  initialStage?: 'hunt' | 'write'
  onClose?: () => void
}) {
  const todaySet = getTodaySet()
  const THEME = {
    ...THEME_BASE,
    korean: todaySet.korean,
    hanja: todaySet.hanja,
    english: todaySet.english,
    huntPrompt: `도시에서 '${todaySet.korean}'을 떠올리게 하는 장면이나 단어를 찾아 사진으로 남겨보세요.`,
    spot: { ...THEME_BASE.spot, sentence: todaySet.sentence },
  }
  const [stage, setStage] = useState<Stage>(initialStage)
  const [openedHints, setOpenedHints] = useState<string[]>([])
  const [usedWords, setUsedWords] = useState<string[]>([])
  const [collected, setCollected] = useState<string[]>([])
  const [photo, setPhoto] = useState<string | null>(null)
  const [isExample, setIsExample] = useState(false)
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

  async function handleWriteFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImage(file)
    setPhoto(dataUrl)
    setIsExample(false)
  }

  function applyExamplePhoto() {
    setPhoto(exampleSvg(THEME.spot.sentence))
    setIsExample(true)
  }

  function toggleHint(word: string) {
    setOpenedHints((cur) => (cur.includes(word) ? cur.filter((w) => w !== word) : cur.concat(word)))
  }

  // '이 표현을 썼어요'를 직접 누른 표현만 수집한다 (카드를 열어본 것만으로는 수집하지 않음)
  function toggleUsed(word: string) {
    setUsedWords((cur) => (cur.includes(word) ? cur.filter((w) => w !== word) : cur.concat(word)))
  }

  function finishPhoto() {
    if (!photo) return
    const words = todaySet.hints.map((h) => h.word).filter((w) => usedWords.includes(w))
    const next: ThemeRecord = { ...record, write: true, writePhoto: isExample ? undefined : photo }
    setRecord(next)
    try {
      saveThemeRecord(next)
    } catch {}
    addWritingRecord({
      theme: `${THEME.korean}(${THEME.hanja})`,
      spot: `${THEME.spot.area} ${THEME.spot.name}`,
      sentence: THEME.spot.sentence,
      myText: '',
      expressions: words,
    })
    setCollected(words)
    setStage('collect')
  }

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY

  return (
    <div className={styles.wrap}>
      <style>{'@keyframes paperIn{from{opacity:0;transform:translateX(36px) rotate(1.5deg)}to{opacity:1;transform:none}}'}</style>
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
            {stage === 'convert' && '필사 스팟'}
            {stage === 'photo' && '필사 스팟'}
            {stage === 'collect' && '필사 스팟'}
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
          <div className={styles.sheet} style={paperStyle}>
            <div className={styles.handle} />
            <StepBar current={1} />
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
              <span className="label-mono">THE ORIGINAL · 오늘의 문장</span>
              <p style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                &ldquo;{THEME.spot.sentence}&rdquo;
              </p>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)' }}>
                같은 뜻을 업무의 말로 바꿔 쓰는 시간이에요.
              </span>
            </div>

            <div className={styles.certBar}>
              <button className={styles.certBtn} onClick={() => setStage('convert')}>
                이 장소에서 시작하기 →
              </button>
            </div>
          </div>
        </>
      )}

      {stage === 'convert' && (
        <div className={styles.sheet} style={{ ...paperStyle, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepBar current={2} />
          <div>
            <span className="label-mono">MAKE IT YOURS</span>
            <p style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {todaySet.bridge}
            </p>
          </div>

          <div style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--glass-purple)', border: '0.5px solid var(--border-subtle)' }}>
            <span className="label-mono">오늘의 문장</span>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {THEME.spot.sentence}
            </p>
          </div>

          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {todaySet.mission}
          </p>

          <div>
            <span className="label-mono">막히면 뒤집어봐요 · 힌트는 선택</span>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {todaySet.hints.map((h) => {
                const open = openedHints.includes(h.word)
                const used = usedWords.includes(h.word)
                return (
                  <div
                    key={h.word}
                    onClick={() => toggleHint(h.word)}
                    role="button"
                    style={{
                      flex: 1,
                      minHeight: 150,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: open ? 'space-between' : 'center',
                      textAlign: open ? 'left' : 'center',
                      borderRadius: 'var(--radius-md)',
                      border: used ? '1px solid var(--purple-500)' : '0.5px solid var(--border-default)',
                      background: used ? 'var(--glass-purple-hover)' : open ? 'var(--bg-elevated)' : 'var(--bg-card)',
                      fontFamily: 'var(--font-sans)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {open ? (
                      <>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{h.word}</div>
                          <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{h.meaning}</div>
                          <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.5 }}>&ldquo;{h.example}&rdquo;</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleUsed(h.word)
                          }}
                          style={{
                            marginTop: 8,
                            padding: '6px 0',
                            borderRadius: 999,
                            border: used ? 'none' : '0.5px solid var(--border-default)',
                            background: used ? 'var(--purple-500)' : 'var(--bg-card)',
                            color: used ? '#fff' : 'var(--text-primary)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {used ? '✓ 썼어요' : '이 표현을 썼어요'}
                        </button>
                      </>
                    ) : (
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {h.word} ↻{used ? <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-purple)' }}>✓ 썼어요</div> : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              어려운 단어를 꼭 넣을 필요는 없어요. 뜻이 잘 전달되면 그것도 좋은 문장이에요.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 0', borderTop: '0.5px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 16 }}>✏️</span>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              바꾼 문장을 종이에 써주세요.
              <br />
              휴대폰에 다시 입력하지 않아도 돼요.
            </p>
          </div>

          <button className={styles.certBtn} onClick={() => setStage('photo')}>
            다 썼어요 · 사진 남기기 →
          </button>
        </div>
      )}

      {stage === 'photo' && (
        <div className={styles.sheet} style={{ ...paperStyle, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepBar current={3} />
          <div>
            <span className="label-mono">KEEP THE MOMENT</span>
            <p style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              내 문장이 잘 보이게 사진을 남겨주세요.
            </p>
          </div>

          <div
            style={{
              width: '100%',
              aspectRatio: '4 / 3',
              borderRadius: 'var(--radius-md)',
              border: photo ? '0.5px solid var(--border-default)' : '1px dashed var(--border-default)',
              background: photo ? `url("${photo}") center/cover` : 'var(--glass-purple)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--text-purple)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
            }}
          >
            {!photo && (
              <>
                <span style={{ fontSize: 24 }}>📷</span>
                <span>오늘 쓴 문장이 들어갈 자리</span>
              </>
            )}
          </div>

          <button
            className="glass-card"
            style={{ border: 'none', padding: '12px 0', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)' }}
            onClick={triggerWriteUpload}
          >
            {photo && !isExample ? '사진 바꾸기' : '사진 촬영 또는 선택'}
          </button>
          <input ref={writeInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleWriteFile} />

          <button
            onClick={applyExamplePhoto}
            style={{ background: 'none', border: 'none', textDecoration: 'underline', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            예시 사진으로 흐름 체험하기
          </button>

          <button
            className={styles.certBtn}
            style={{ opacity: photo ? 1 : 0.45 }}
            disabled={!photo}
            onClick={finishPhoto}
          >
            완료하고 작품 카드 보기 →
          </button>
        </div>
      )}

      {stage === 'collect' && (
        <div className={styles.sheet} style={{ ...paperStyle, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepBar current={4} />
          <div>
            <span className="label-mono">MADE BY YOU ✓</span>
            <div style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              오늘의 한 장, 완성.
            </div>
          </div>

          <div
            className="glass-card"
            style={{ width: '100%', boxSizing: 'border-box', padding: 16, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-mono">TUTONE / WORD CLUB</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-purple)' }}>
                {THEME.korean} {THEME.hanja}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              &ldquo;{THEME.spot.sentence}&rdquo;
            </div>
            {photo && (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  borderRadius: 'var(--radius-md)',
                  background: `url("${photo}") center/cover`,
                  border: '0.5px solid var(--border-subtle)',
                }}
              />
            )}
            {collected.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {collected.map((w) => (
                  <span
                    key={w}
                    style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--glass-purple-hover)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-purple)' }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
              <span>{THEME.spot.name} / {THEME.spot.area}</span>
              <span>MY SENTENCE</span>
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {collected.length > 0 ? `이번에 수집한 표현 ${collected.length}개를 필사 기록에 저장했어요.` : '필사 기록에 저장했어요.'}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="glass-card"
              style={{ flex: 1, border: 'none', padding: '12px 0', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)' }}
              onClick={onClose}
            >
              미션으로
            </button>
            <a
              href="/my"
              className={styles.certBtn}
              style={{ flex: 2, textAlign: 'center', textDecoration: 'none', display: 'block' }}
            >
              필사 기록 보기 →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
