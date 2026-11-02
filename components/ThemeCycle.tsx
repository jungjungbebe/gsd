'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import styles from './KakaoMap.module.css'
import {
  ThemeRecord,
  loadThemeRecord,
  saveThemeRecord,
} from '@/lib/themeRecord'
import { addWritingRecord, getWritingRecords, addHuntRecord, getHuntRecords, type HuntRecord } from '@/lib/tutone-records'
import { useScopeReady } from '@/lib/tutone-scope'
import { getTodaySet } from '@/lib/missionSets'
import {
  AREAS,
  LOCATION_KEY,
  STATIC_SPOTS,
  Spot,
  formatDist,
  getPosition,
  isInSeoul,
  nearestArea,
  resolveSpots,
} from '@/lib/spots'

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

const FALLBACK_SPOT: Spot = { id: 'none', name: '근처 카페', category: '', lat: THEME_BASE.spot.lat, lng: THEME_BASE.spot.lng, distM: null }

type Stage = 'hunt' | 'camera' | 'scan' | 'decode' | 'found' | 'write' | 'convert' | 'photo' | 'collect'

// 종이 카드가 한 장씩 넘어오는 전환
const paperStyle: React.CSSProperties = { animation: 'paperIn 0.38s cubic-bezier(0.2, 0.8, 0.2, 1)' }

function FlipIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  )
}

function Sticker({ children, rotate = -4 }: { children: React.ReactNode; rotate?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 10px',
        background: '#dff77e',
        color: '#2a2035',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        borderRadius: 4,
        transform: `rotate(${rotate}deg)`,
        boxShadow: '0 1px 3px rgba(42, 32, 53, 0.2)',
      }}
    >
      {children}
    </span>
  )
}

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

async function makeThumb(dataUrl: string, maxSize = 480): Promise<string | undefined> {
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
    return c.toDataURL('image/jpeg', 0.6)
  } catch {
    return undefined
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface HuntResult {
  found: boolean
  sentence: string
  expression: string
  matchesTarget: boolean
  easy: string
  action: string
  category: string
  box: { x: number; y: number; w: number; h: number } | null
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
  const [mapBig, setMapBig] = useState(false)
  const [activeHint, setActiveHint] = useState<string | null>(null)
  const [cardNo, setCardNo] = useState(1)
  const [usedWords, setUsedWords] = useState<string[]>([])
  const [collected, setCollected] = useState<string[]>([])
  const [photo, setPhoto] = useState<string | null>(null)
  const [isExample, setIsExample] = useState(false)
  const [record, setRecord] = useState<ThemeRecord>({ hunt: false, write: false })
  const [archiveCount, setArchiveCount] = useState(0)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [huntResult, setHuntResult] = useState<HuntResult | null>(null)
  const [huntErr, setHuntErr] = useState('')
  const [camErr, setCamErr] = useState('')
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [todayLabel, setTodayLabel] = useState('')
  const [editLoc, setEditLoc] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [huntSavedNo, setHuntSavedNo] = useState(0)
  const [huntRecords, setHuntRecords] = useState<HuntRecord[]>([])
  const [pinCard, setPinCard] = useState<HuntRecord | null>(null)
  const scopeReady = useScopeReady()
  const [mapReady, setMapReady] = useState(false)
  const [selectedSpotId, setSelectedSpotId] = useState('')
  const [loc, setLoc] = useState<{ mode: 'gps' | 'area'; areaId: string }>({ mode: 'area', areaId: 'seongsu' })
  const [locReady, setLocReady] = useState(false)
  const [locNonce, setLocNonce] = useState(0)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [spots, setSpots] = useState<Spot[]>([])
  const [spotsLoading, setSpotsLoading] = useState(false)
  const [areaLabel, setAreaLabel] = useState('성수')
  const [locMsg, setLocMsg] = useState('')
  const loadedKeyRef = useRef('')

  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const selectedSpot = spots.find((x) => x.id === selectedSpotId) ?? spots[0] ?? FALLBACK_SPOT
  const mapInstanceRef = useRef<any>(null)
  const overlaysRef = useRef<any[]>([])
  const huntInputRef = useRef<HTMLInputElement | null>(null)
  const writeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCATION_KEY)
      if (raw) {
        const v = JSON.parse(raw)
        if ((v.mode === 'gps' || v.mode === 'area') && AREAS.some((a) => a.id === v.areaId)) {
          setLoc({ mode: v.mode, areaId: v.areaId })
        }
      }
    } catch {}
    setLocReady(true)
  }, [])

  function saveLoc(next: { mode: 'gps' | 'area'; areaId: string }) {
    setLoc(next)
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(next))
    } catch {}
  }

  function renderLocChips() {
    return (
      <>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' }}>
            <button
              className="ttPress"
              onClick={() => {
                if (loc.mode === 'gps') setLocNonce((n) => n + 1)
                else saveLoc({ mode: 'gps', areaId: loc.areaId })
              }}
              style={{ flex: '0 0 auto', padding: '7px 12px', borderRadius: 999, border: '1px solid var(--purple-500)', background: loc.mode === 'gps' && !locMsg ? '#dff77e' : 'var(--bg-card)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              📍 내 위치로 찾기
            </button>
            {AREAS.map((a) => {
              const on = loc.mode === 'area' && loc.areaId === a.id
              return (
                <button
                  key={a.id}
                  className="ttPress"
                  onClick={() => saveLoc({ mode: 'area', areaId: a.id })}
                  style={{ flex: '0 0 auto', padding: '7px 12px', borderRadius: 999, border: on ? '1px solid var(--purple-500)' : '0.5px solid var(--border-default)', background: on ? '#dff77e' : 'var(--bg-card)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {a.name}
                </button>
              )
            })}
          </div>
          {locMsg && (
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>{locMsg}</p>
          )}

      </>
    )
  }

  useEffect(() => {
    if ((stage !== 'write' && stage !== 'hunt') || !mapReady || !locReady) return
    const key = `${loc.mode}:${loc.areaId}:${locNonce}`
    if (loadedKeyRef.current === key) return
    loadedKeyRef.current = key
    let cancelled = false
    let finished = false
    ;(async () => {
      setSpotsLoading(true)
      setLocMsg('')
      let origin: { lat: number; lng: number } | null = null
      if (loc.mode === 'gps') {
        origin = await getPosition()
        if (!origin) setLocMsg('위치를 가져오지 못했어요. 동네를 직접 골라주세요.')
        else if (!isInSeoul(origin)) {
          origin = null
          setLocMsg('서울 안에서 이용할 수 있어요. 동네를 골라주세요.')
        }
      }
      let area = AREAS.find((a) => a.id === loc.areaId) ?? AREAS[0]
      let label = area.name
      if (origin) {
        const near = nearestArea(origin)
        if (near.distM <= 4000) {
          area = near.area
          label = near.area.name
        } else {
          area = { ...near.area, picks: [], lat: origin.lat, lng: origin.lng }
          label = '내 주변'
        }
      }
      let list = await resolveSpots({ area, origin })
      if (cancelled) return
      if (list.length === 0) {
        list = STATIC_SPOTS
        label = '성수'
        setLocMsg('지금은 추천을 불러오지 못해 기본 장소를 보여드려요.')
      }
      setUserPos(origin)
      setAreaLabel(label)
      setSpots(list)
      setSelectedSpotId(list[0].id)
      setSpotsLoading(false)
      finished = true
    })()
    return () => {
      cancelled = true
      if (!finished) {
        loadedKeyRef.current = ''
        setSpotsLoading(false)
      }
    }
  }, [stage, mapReady, locReady, loc.mode, loc.areaId, locNonce])

  useEffect(() => {
    const d = new Date()
    setTodayLabel(`${d.getMonth() + 1}/${d.getDate()}`)
  }, [])

  useEffect(() => {
    if (stage !== 'camera') return
    let cancelled = false
    ;(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 } },
          audio: false,
        })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = s
        setCamErr('')
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        if (!cancelled) setCamErr('카메라를 열 수 없어요. 아래 앨범 버튼으로 사진을 골라주세요.')
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [stage, facing])

  useEffect(() => {
    if (scopeReady) {
      const list = getHuntRecords()
      setHuntRecords(list)
      setArchiveCount(list.length)
    }
  }, [scopeReady])

  useEffect(() => {
    setRecord(loadThemeRecord())

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => setMapReady(true))
    }
  }, [])

  useEffect(() => {
    if ((stage !== 'write' && stage !== 'hunt') || !mapReady || !mapDivRef.current) return
    if (!window.kakao || !window.kakao.maps) return

    const centerCoords =
      stage === 'write'
        ? spots.length
          ? selectedSpot
          : userPos ?? AREAS.find((a) => a.id === loc.areaId) ?? THEME.spot
        : userPos ?? AREAS.find((a) => a.id === loc.areaId) ?? THEME.huntSpot
    const center = new window.kakao.maps.LatLng(centerCoords.lat, centerCoords.lng)
    const map = new window.kakao.maps.Map(mapDivRef.current, {
      center,
      level: stage === 'hunt' ? 3 : 4,
    })
    mapInstanceRef.current = map

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    if (stage === 'hunt') {
      const pins = huntRecords.filter((r) => r.lat && r.lng)
      if (userPos) {
        const me = document.createElement('div')
        me.innerHTML = '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.25);"></div>'
        const meOverlay = new window.kakao.maps.CustomOverlay({ position: new window.kakao.maps.LatLng(userPos.lat, userPos.lng), content: me, yAnchor: 0.5 })
        meOverlay.setMap(map)
        overlaysRef.current.push(meOverlay)
      }
      if (pins.length === 0) {
        const el = document.createElement('div')
        el.innerHTML =
          '<div style="width:44px;height:44px;border-radius:50%;background:#d9a441;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;">📷</div>'
        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(centerCoords.lat, centerCoords.lng),
          content: el,
          yAnchor: 0.5,
        })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      }
      pins.forEach((r) => {
        const el = document.createElement('div')
        el.innerHTML =
          '<div style="width:34px;height:34px;border-radius:50%;background:#dff77e;border:2px solid #2a2035;display:flex;align-items:center;justify-content:center;font-size:15px;">🔍</div>'
        el.style.cursor = 'pointer'
        el.addEventListener('click', () => setPinCard(r))
        const overlay = new window.kakao.maps.CustomOverlay({ position: new window.kakao.maps.LatLng(r.lat, r.lng), content: el, yAnchor: 0.5 })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      })
    }

    if (stage === 'write') {
      if (userPos) {
        const me = document.createElement('div')
        me.innerHTML = '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.25);"></div>'
        const meOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(userPos.lat, userPos.lng),
          content: me,
          yAnchor: 0.5,
        })
        meOverlay.setMap(map)
        overlaysRef.current.push(meOverlay)
      }
      spots.forEach((spot) => {
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
  }, [stage, mapReady, selectedSpotId, spots, userPos, huntRecords])

  useEffect(() => {
    const m = mapInstanceRef.current
    if (m && typeof m.relayout === 'function') {
      m.relayout()
      m.setCenter(new window.kakao.maps.LatLng(selectedSpot.lat, selectedSpot.lng))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapBig])

  function handleSelectSpot(spot: { id: string; lat: number; lng: number }) {
    setSelectedSpotId(spot.id)
    if (mapInstanceRef.current && window.kakao) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(spot.lat, spot.lng))
    }
  }

  function openCamera() {
    setHuntErr('')
    setStage('camera')
  }

  function shoot() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * scale)
    c.height = Math.round(v.videoHeight * scale)
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10)
    beginHunt(c.toDataURL('image/jpeg', 0.75))
  }

  async function handleHuntFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const dataUrl = await compressImage(file, 1280)
    beginHunt(dataUrl)
  }

  function beginHunt(dataUrl: string) {
    setCapturedPhoto(dataUrl)
    setHuntResult(null)
    setHuntErr('')
    setHuntSavedNo(0)
    setPinCard(null)
    setEditLoc(false)
    setStage('scan')
    analyzeHunt(dataUrl)
  }

  async function analyzeHunt(dataUrl: string) {
    setHuntErr('')
    const t0 = Date.now()
    let result: HuntResult | null = null
    let err = ''
    try {
      const res = await fetch('/api/hunt-decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, targets: todaySet.hunt.words }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) err = data?.error || '해독에 실패했어요. 잠시 후 다시 시도해 주세요.'
      else if (!data?.found) err = '사진에서 읽을 수 있는 한국어 글자를 찾지 못했어요. 글자가 크게 보이도록 다시 찍어보세요.'
      else result = data as HuntResult
    } catch {
      err = '네트워크 오류가 났어요. 잠시 후 다시 시도해 주세요.'
    }
    const wait = 2000 - (Date.now() - t0)
    if (wait > 0) await sleep(wait)
    if (!result) {
      setHuntErr(err)
      return
    }
    setHuntResult(result)
    setStage('decode')
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(20)
    setTimeout(() => setStage((cur) => (cur === 'decode' ? 'found' : cur)), 1600)
  }

  async function collectHunt() {
    if (!huntResult || !capturedPhoto || huntSavedNo) return
    const thumb = await makeThumb(capturedPhoto)
    const base = userPos ?? AREAS.find((a) => a.id === loc.areaId) ?? AREAS[0]
    // 같은 자리에서 여러 장을 모아도 핀이 겹치지 않도록 아주 조금 흩뿌린다
    const jitter = () => (Math.random() - 0.5) * 0.0006
    addHuntRecord({
      expression: huntResult.expression,
      sentence: huntResult.sentence,
      easy: huntResult.easy,
      action: huntResult.action,
      category: huntResult.category,
      matched: huntResult.matchesTarget,
      area: areaLabel,
      lat: base.lat + jitter(),
      lng: base.lng + jitter(),
      photo: thumb,
    })
    const list = getHuntRecords()
    setHuntRecords(list)
    setArchiveCount(list.length)
    setHuntSavedNo(list.length)
    const next: ThemeRecord = {
      ...record,
      hunt: true,
      huntPhoto: thumb,
      date: new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
    }
    setRecord(next)
    try {
      saveThemeRecord(next)
    } catch {}
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
    setActiveHint((cur) => (cur === word ? null : word))
  }

  // '이 표현을 썼어요'를 직접 누른 표현만 수집한다 (카드를 열어본 것만으로는 수집하지 않음)
  function toggleUsed(word: string) {
    setUsedWords((cur) => (cur.includes(word) ? cur.filter((w) => w !== word) : cur.concat(word)))
  }

  async function finishPhoto() {
    if (!photo) return
    const thumb = isExample ? undefined : await makeThumb(photo)
    const words = todaySet.hints.map((h) => h.word).filter((w) => usedWords.includes(w))
    const next: ThemeRecord = { ...record, write: true, writePhoto: isExample ? undefined : photo }
    setRecord(next)
    try {
      saveThemeRecord(next)
    } catch {}
    addWritingRecord({
      theme: `${THEME.korean}(${THEME.hanja})`,
      spot: `${areaLabel} ${selectedSpot.name}`,
      sentence: THEME.spot.sentence,
      myText: '',
      expressions: words,
      photo: thumb,
    })
    setCollected(words)
    setCardNo(getWritingRecords().length)
    setStage('collect')
  }

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY

  return (
    <div className={styles.wrap}>
      <style>{'@keyframes huntScan{from{top:0}to{top:calc(100% - 3px)}} @keyframes huntBlink{0%,100%{opacity:.4}50%{opacity:1}} @keyframes huntGlow{0%{opacity:0}40%{opacity:1}100%{opacity:1}} @keyframes decodeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}} @keyframes paperIn{from{opacity:0;transform:translateX(36px) rotate(1.5deg)}to{opacity:1;transform:none}} .ttPress:active{background:#dff77e!important;color:#2a2035!important}'}</style>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`}
        strategy="afterInteractive"
        onLoad={() => {
          window.kakao.maps.load(() => setMapReady(true))
        }}
      />

      <input ref={huntInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHuntFile} />

      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {(stage === 'hunt' || stage === 'found') && (
            <button
              aria-label="뒤로"
              onClick={() => {
                if (stage === 'found') setStage('hunt')
                else if (onClose) onClose()
                else if (typeof history !== 'undefined') history.back()
              }}
              style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-primary)', cursor: 'pointer', padding: 4 }}
            >
              ←
            </button>
          )}
          <div>
            {stage === 'hunt' && <div className={styles.sub} style={{ marginTop: 0, marginBottom: 2 }}>MISSION 01</div>}
            {stage === 'found' && <div className={styles.sub} style={{ marginTop: 0, marginBottom: 2 }}>FOUND {String(huntSavedNo || huntRecords.length + 1).padStart(2, '0')}</div>}
            <div className={styles.title} style={stage === 'hunt' || stage === 'found' ? { fontSize: 22, fontWeight: 500 } : undefined}>
              {stage === 'hunt' && '단어 사냥'}
              {(stage === 'scan' || stage === 'decode' || stage === 'camera') && '단어 사냥'}
              {stage === 'found' && '표현 발견'}
              {(stage === 'write' || stage === 'convert' || stage === 'photo' || stage === 'collect') && '필사 스팟'}
            </div>
            {stage !== 'hunt' && stage !== 'found' && <div className={styles.sub}>오늘의 테마 · {THEME.korean} {THEME.hanja}</div>}
          </div>
        </div>
        {stage === 'hunt' && (
          <button
            onClick={() => {
              setMapBig(true)
              document.getElementById('hunt-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-purple)', cursor: 'pointer' }}
          >
            🗺 발견 지도
          </button>
        )}
        {stage === 'found' && (
          <span style={{ padding: '8px 14px', borderRadius: 999, background: '#dff77e', color: '#2a2035', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700 }}>
            해독 완료
          </span>
        )}
        {onClose && stage !== 'hunt' && stage !== 'found' && (
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
        <div style={{ ...paperStyle, padding: '12px 16px 110px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative', padding: '22px 20px 20px', borderRadius: 28, background: 'var(--glass-purple-hover)', border: '0.5px solid var(--border-default)' }}>
            <div style={{ position: 'absolute', top: -10, right: -4 }}>
              <Sticker rotate={5}>FIND!</Sticker>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', paddingRight: 56 }}>
              <span>오늘의 사냥</span>
              <span>{areaLabel} · {todayLabel}</span>
            </div>
            <div style={{ marginTop: 28, fontFamily: 'var(--font-sans)', fontSize: 25, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              &lsquo;{todaySet.hunt.label}&rsquo;{(() => {
                const c = todaySet.hunt.label.charCodeAt(todaySet.hunt.label.length - 1)
                return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 0 ? '를' : '을'
              })()} 알려주는
              <br />
              표현을 찾아보세요.
            </div>
            <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{todaySet.hunt.sub}</p>
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {todaySet.hunt.words.slice(0, 3).map((w) => (
                <span key={w} style={{ padding: '9px 16px', borderRadius: 999, background: '#dff77e', color: '#2a2035', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700 }}>
                  {w}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-purple)' }}>✦</span>
              <span>예시는 힌트예요. 다른 표현도 발견할 수 있어요.</span>
            </div>
          </div>

          <button
            className="ttPress"
            onClick={openCamera}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 22, border: '0.5px solid var(--border-default)', background: 'var(--bg-card)', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
          >
            <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--purple-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 0 0 6px rgba(160,140,220,0.25)' }}>⌗</span>
            <span style={{ flex: 1, fontFamily: 'var(--font-sans)' }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>주변 안내문을 비춰보세요</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--text-secondary)' }}>사진 속 표현을 찾아드려요</span>
            </span>
            <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>↗</span>
          </button>

          <button className={`${styles.certBtn} ttPress`} onClick={openCamera}>
            📷 카메라 열고 사냥 시작하기
          </button>

          <div style={{ marginTop: 6 }}>
            <span className="label-mono">NEARBY</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {areaLabel}에서 내가 발견한 표현 {archiveCount}개
              </span>
              <button
                onClick={() => setMapBig((v) => !v)}
                style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-purple)', cursor: 'pointer' }}
              >
                {mapBig ? '작게 보기' : '지도 보기'}
              </button>
            </div>
          </div>
          {renderLocChips()}
          <div id="hunt-map" style={{ position: 'relative', height: mapBig ? 380 : 190, transition: 'height 0.25s ease' }}>
            <div ref={mapDivRef} className={styles.map} style={{ height: '100%', borderRadius: 20, overflow: 'hidden' }} />
          </div>
          {pinCard && (
            <div style={{ padding: 12, borderRadius: 14, background: '#dff77e', color: '#2a2035', fontFamily: 'var(--font-sans)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span>{pinCard.area} · {pinCard.category}</span>
                <button onClick={() => setPinCard(null)} style={{ background: 'none', border: 'none', fontSize: 11, textDecoration: 'underline', cursor: 'pointer', color: '#2a2035' }}>닫기</button>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{pinCard.expression}</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>&ldquo;{pinCard.sentence}&rdquo;</div>
              {pinCard.easy && <div style={{ fontSize: 12, marginTop: 4 }}>↓ {pinCard.easy}</div>}
            </div>
          )}
          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 11, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            사진은 글자 해독을 위해 AI로 전송돼요. 얼굴·연락처가 나오지 않게 찍어주세요.
          </p>
        </div>
      )}

      {stage === 'camera' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#15131a', display: 'flex', flexDirection: 'column' }}>
          <video ref={videoRef} playsInline muted autoPlay style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,30,0.55) 0%, rgba(20,16,30,0.05) 30%, rgba(20,16,30,0.05) 70%, rgba(20,16,30,0.4) 100%)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 16px) 16px 0' }}>
            <button aria-label="닫기" onClick={() => setStage('hunt')} style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', color: '#fff' }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>오늘의 사냥</div>
              <div style={{ marginTop: 2, fontSize: 14, fontWeight: 700 }}>{todaySet.hunt.label}을 알려주는 표현</div>
            </div>
            <span style={{ width: 44 }} />
          </div>
          <div style={{ position: 'absolute', left: 36, right: 36, top: '22%', bottom: '30%', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 34, height: 34, borderColor: '#dff77e', borderStyle: 'solid', borderWidth: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 34, height: 34, borderColor: '#dff77e', borderStyle: 'solid', borderWidth: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6, borderBottomRightRadius: 6 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 34, height: 34, borderColor: '#dff77e', borderStyle: 'solid', borderWidth: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderColor: '#dff77e', borderStyle: 'solid', borderWidth: 0, borderBottomWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6, borderBottomRightRadius: 6 }} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 150, display: 'flex', justifyContent: 'center' }}>
            <span style={{ padding: '12px 20px', borderRadius: 999, background: 'rgba(20,16,30,0.6)', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
              {camErr || '안내문을 프레임 안에 담아주세요'}
            </span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '22px 28px calc(env(safe-area-inset-bottom) + 22px)', background: '#15131a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button aria-label="앨범" onClick={() => huntInputRef.current?.click()} style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>🖼</button>
            <button aria-label="촬영" onClick={shoot} disabled={!!camErr} style={{ width: 76, height: 76, borderRadius: '50%', border: '4px solid #fff', background: 'transparent', padding: 4, cursor: 'pointer', opacity: camErr ? 0.4 : 1 }}>
              <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: '#fff' }} />
            </button>
            <button aria-label="카메라 전환" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>⟲</button>
          </div>
        </div>
      )}

      {(stage === 'scan' || stage === 'decode') && capturedPhoto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#15131a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: 16 }}>
          <div style={{ position: 'relative', lineHeight: 0, borderRadius: 16, overflow: 'hidden', maxWidth: '100%' }}>
            <img src={capturedPhoto} alt="찍은 사진" style={{ display: 'block', maxWidth: '100%', maxHeight: '66vh', width: 'auto', height: 'auto', filter: huntErr ? 'grayscale(0.7)' : 'none' }} />
            {stage === 'scan' && !huntErr && <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: '#dff77e', boxShadow: '0 0 14px 6px rgba(223,247,126,0.8)', animation: 'huntScan 1.4s ease-in-out infinite alternate' }} />}
            {stage === 'decode' && huntResult && (
              huntResult.box ? (
                <div
                  style={{
                    position: 'absolute',
                    left: `${huntResult.box.x * 100}%`,
                    top: `${huntResult.box.y * 100}%`,
                    width: `${huntResult.box.w * 100}%`,
                    height: `${huntResult.box.h * 100}%`,
                    borderRadius: 8,
                    border: '2px solid #dff77e',
                    background: 'rgba(223,247,126,0.14)',
                    boxShadow: '0 0 0 9999px rgba(20,10,40,0.6), 0 0 16px 4px rgba(223,247,126,0.9), 0 0 40px 12px rgba(223,247,126,0.45)',
                    animation: 'huntGlow 1.1s ease-out',
                  }}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 40px 10px rgba(223,247,126,0.75)', animation: 'huntGlow 1.1s ease-out' }} />
              )
            )}
          </div>
          {huntErr ? (
            <>
              <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: '#fff' }}>{huntErr}</p>
              <button className={`${styles.certBtn} ttPress`} style={{ maxWidth: 360, width: '100%' }} onClick={() => { setHuntErr(''); setStage('camera') }}>
                다시 찍기
              </button>
              <button onClick={() => setStage('hunt')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>
                닫기
              </button>
            </>
          ) : (
            <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, color: '#fff', animation: stage === 'scan' ? 'huntBlink 1.2s ease-in-out infinite' : 'decodeIn 0.4s ease-out' }}>
              {stage === 'scan' ? '표현을 찾는 중…' : '새 표현 발견!'}
            </p>
          )}
        </div>
      )}

      {stage === 'found' && capturedPhoto && huntResult && (
        <div style={{ ...paperStyle, paddingBottom: 110 }}>
          <div style={{ position: 'relative', background: '#2a2530', display: 'flex', justifyContent: 'center', padding: '14px 0 30px' }}>
            <div style={{ position: 'relative', lineHeight: 0 }}>
              <img src={capturedPhoto} alt="발견한 글자" style={{ display: 'block', maxWidth: '100vw', maxHeight: 300, width: 'auto', height: 'auto' }} />
              {huntResult.box && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${huntResult.box.x * 100}%`,
                    top: `${huntResult.box.y * 100}%`,
                    width: `${huntResult.box.w * 100}%`,
                    height: `${huntResult.box.h * 100}%`,
                    borderRadius: 6,
                    background: 'rgba(223,247,126,0.38)',
                    border: '1.5px solid #dff77e',
                  }}
                />
              )}
              <span
                style={{
                  position: 'absolute',
                  left: huntResult.box ? `${Math.min(80, Math.max(20, (huntResult.box.x + huntResult.box.w / 2) * 100))}%` : '50%',
                  top: huntResult.box ? `calc(${Math.min(96, (huntResult.box.y + huntResult.box.h) * 100)}% + 4px)` : '88%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  padding: '9px 16px',
                  borderRadius: 999,
                  background: 'var(--purple-500)',
                  color: '#fff',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  lineHeight: 1.2,
                  boxShadow: '0 0 0 4px rgba(223,247,126,0.65)',
                }}
              >
                ✦ {huntResult.expression}
              </span>
            </div>
          </div>

          <div style={{ padding: '18px 16px 0', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>발견한 표현</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', animation: 'decodeIn 0.45s ease-out' }}>{huntResult.expression}</span>
              <span style={{ fontSize: 22, color: 'var(--text-purple)' }}>#{String(huntSavedNo || huntRecords.length + 1).padStart(3, '0')}</span>
            </div>
            {[
              ['쉽게 말하면', huntResult.easy],
              ['해야 할 행동', huntResult.action],
            ].map(([k, v]) =>
              v ? (
                <div key={k} style={{ display: 'flex', gap: 16, padding: '16px 0', borderTop: '0.5px solid var(--border-default)', marginTop: k === '쉽게 말하면' ? 14 : 0, animation: 'decodeIn 0.5s ease-out' }}>
                  <span style={{ width: 84, flex: '0 0 auto', fontSize: 12, color: 'var(--text-secondary)', paddingTop: 2 }}>{k}</span>
                  <span style={{ fontSize: 15, lineHeight: 1.5 }}>{v}</span>
                </div>
              ) : null
            )}
            <div style={{ display: 'flex', gap: 16, padding: '14px 0', borderTop: '0.5px solid var(--border-default)', alignItems: 'center' }}>
              <span style={{ width: 84, flex: '0 0 auto', fontSize: 12, color: 'var(--text-secondary)' }}>표현 유형</span>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ padding: '7px 14px', borderRadius: 999, background: '#dff77e', color: '#2a2035', fontSize: 13, fontWeight: 700 }}>{huntResult.category}</span>
                {huntResult.matchesTarget && <span style={{ padding: '7px 14px', borderRadius: 999, background: '#dff77e', color: '#2a2035', fontSize: 13, fontWeight: 700 }}>오늘의 표현군</span>}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', borderTop: '0.5px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-purple)' }}>📍</span>
              <span style={{ flex: 1 }}>서울 {areaLabel}</span>
              {!huntSavedNo && (
                <button onClick={() => setEditLoc((v) => !v)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {editLoc ? '완료' : '변경'}
                </button>
              )}
            </div>
            {editLoc && !huntSavedNo && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>{renderLocChips()}</div>}

            {huntSavedNo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                <p style={{ margin: 0, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
                  도감 #{String(huntSavedNo).padStart(3, '0')} 수집 완료 · MY에서 볼 수 있어요
                </p>
                <button className={`${styles.certBtn} ttPress`} onClick={() => setStage('write')}>
                  오늘의 필사 하러 가기 →
                </button>
                <button className="ttPress" onClick={() => setStage('hunt')} style={{ padding: 14, borderRadius: 16, border: '0.5px solid var(--border-default)', background: 'var(--bg-card)', fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  하나 더 찾기
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                <button className={`${styles.certBtn} ttPress`} onClick={collectHunt}>
                  🔖 내 도감에 수집하기
                </button>
                <button className="ttPress" onClick={() => setStage('camera')} style={{ padding: 14, borderRadius: 16, border: '0.5px solid var(--border-default)', background: 'var(--bg-card)', fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  다시 찍기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {stage === 'write' && (
        <div className={styles.sheet} style={{ ...paperStyle, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepBar current={1} />
          <span className="label-mono">TODAY&apos;S MISSION / {THEME.korean}</span>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            오늘의 문장을 바꿔 쓸
            <br />
            장소를 골라보세요.
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            업무의 말로 바꿔 종이에 쓰고,
            <br />
            사진으로 남기는 미션이에요.
          </p>

          <div
            style={{
              position: 'relative',
              marginTop: 6,
              padding: '26px 20px 16px',
              borderRadius: 24,
              background: 'var(--glass-purple-hover)',
              border: '0.5px solid var(--border-default)',
            }}
          >
            <div style={{ position: 'absolute', top: -12, right: 14 }}>
              <Sticker rotate={4}>오늘의 문장 ✳</Sticker>
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500, lineHeight: 1.55, color: 'var(--text-primary)' }}>
              {(() => {
                const idx = THEME.spot.sentence.indexOf(todaySet.sentenceMark)
                if (idx < 0) return THEME.spot.sentence
                return (
                  <>
                    {THEME.spot.sentence.slice(0, idx)}
                    <mark style={{ background: '#dff77e', color: 'inherit', padding: '0 3px', borderRadius: 3 }}>{todaySet.sentenceMark}</mark>
                    {THEME.spot.sentence.slice(idx + todaySet.sentenceMark.length)}
                  </>
                )
              })()}
            </p>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>✏️</span>
              <span>&lsquo;{todaySet.task}&rsquo;를 업무 문장으로 바꾸기</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>어디서 써볼까요?</span>
            <button
              onClick={() => setMapBig((v) => !v)}
              style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-purple)', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {mapBig ? '지도 작게 보기 ↙' : '지도 크게 보기 ↗'}
            </button>
          </div>

          {renderLocChips()}

          <div style={{ position: 'relative', height: mapBig ? 380 : 190, transition: 'height 0.25s ease' }}>
            <div ref={mapDivRef} className={styles.map} style={{ height: '100%', borderRadius: 16, overflow: 'hidden' }} />
            <span style={{ position: 'absolute', top: 10, left: 10, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-sans)', fontSize: 12, color: '#2a2035', zIndex: 2 }}>
              📍 {areaLabel} 근처
            </span>
            <span style={{ position: 'absolute', bottom: 10, left: 10, padding: '7px 12px', borderRadius: 10, background: 'var(--purple-500)', fontFamily: 'var(--font-sans)', fontSize: 12, color: '#fff', zIndex: 2 }}>
              {spotsLoading ? '장소 찾는 중…' : `${selectedSpot.name} 선택됨 ✓`}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {spotsLoading && spots.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
                근처 필사 스팟을 찾는 중이에요…
              </div>
            )}
            {spots.map((spot) => {
              const sel = spot.id === selectedSpotId
              return (
                <button
                  key={spot.id}
                  onClick={() => handleSelectSpot(spot)}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    minHeight: 92,
                    borderRadius: 14,
                    border: sel ? '1px solid var(--purple-500)' : '0.5px solid var(--border-default)',
                    background: sel ? '#dff77e' : 'var(--bg-card)',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>☕</span>
                    <span style={{ fontSize: 11, color: 'var(--text-purple)' }}>{sel ? '✓' : '선택'}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{spot.name}</div>
                    <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-secondary)' }}>{spot.distM != null ? `${formatDist(spot.distM)} · ` : ''}{spot.category || areaLabel}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <button className={`${styles.certBtn} ttPress`} disabled={spots.length === 0} onClick={() => setStage('convert')}>
            {spots.length === 0 ? '장소를 찾는 중…' : `${selectedSpot.name} 선택 · 미션 보기 →`}
          </button>
          <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>
            다음 화면에서 원문과 힌트를 함께 볼 수 있어요.
          </p>
        </div>
      )}

      {stage === 'convert' && (
        <div className={styles.sheet} style={{ ...paperStyle, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepBar current={2} />
          <span className="label-mono">MAKE IT YOURS / 01</span>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            회사에서는
            <br />
            어떻게 말할까?
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--glass-purple-hover)', border: '0.5px solid var(--border-subtle)' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-purple)' }}>오늘의 문장</span>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {THEME.spot.sentence}
            </p>
          </div>

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
            <div>{todaySet.mission.before}</div>
            <div>
              <mark style={{ background: '#dff77e', color: 'var(--text-primary)', fontWeight: 500, padding: '2px 4px', borderRadius: 3 }}>
                {todaySet.mission.highlight}
              </mark>{' '}
              을
            </div>
            <div>{todaySet.mission.tail}</div>
          </div>

          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>막히면 뒤집어봐요. 힌트는 선택!</span>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {todaySet.hints.map((h) => {
                const active = activeHint === h.word
                const used = usedWords.includes(h.word)
                return (
                  <button
                    key={h.word}
                    onClick={() => toggleHint(h.word)}
                    style={{
                      flex: 1,
                      height: 76,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderRadius: 14,
                      border: used ? '1px solid var(--purple-500)' : '0.5px solid var(--border-default)',
                      background: active ? '#dff77e' : 'var(--bg-card)',
                      fontFamily: 'var(--font-sans)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{h.word}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: used ? 'var(--text-purple)' : 'var(--text-secondary)' }}>
                      {used ? '✓ 썼어요' : '뜻 보기'} <FlipIcon />
                    </span>
                  </button>
                )
              })}
            </div>

            {activeHint && (
              <div style={{ marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {(() => {
                  const h = todaySet.hints.find((x) => x.word === activeHint)!
                  const used = usedWords.includes(h.word)
                  return (
                    <>
                      <div>
                        <b>{h.word}</b>: {h.meaning} &ldquo;{h.example}&rdquo;
                      </div>
                      <button
                        onClick={() => toggleUsed(h.word)}
                        style={{
                          marginTop: 8,
                          padding: '6px 14px',
                          borderRadius: 999,
                          border: used ? 'none' : '0.5px solid var(--border-default)',
                          background: used ? 'var(--purple-500)' : 'var(--bg-card)',
                          color: used ? '#fff' : 'var(--text-primary)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {used ? '✓ 썼어요' : '이 표현을 썼어요'}
                      </button>
                    </>
                  )
                })()}
              </div>
            )}

            <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              어려운 단어를 꼭 넣을 필요는 없어요.
              <br />
              뜻이 잘 전달되면, 그것도 좋은 문장이에요.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 0 2px', borderTop: '1px dashed var(--border-default)' }}>
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
            className="glass-card ttPress"
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
            className={`${styles.certBtn} ttPress`}
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
            <Sticker>MADE BY YOU ✓</Sticker>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            오늘의 한 장,
            <br />
            완성.
          </div>

          <div
            style={{
              position: 'relative',
              padding: '18px 16px 14px',
              borderRadius: 24,
              background: 'var(--glass-purple-hover)',
              border: '0.5px solid var(--border-default)',
              boxShadow: '0 6px 0 rgba(96, 64, 160, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="label-mono">TUTONE / WORD CLUB</span>
              <Sticker rotate={4}>{THEME.korean} ✳</Sticker>
            </div>

            <div
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 14,
                background: '#fffdf6',
                boxShadow: '0 2px 8px rgba(42, 32, 53, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {photo && (
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    borderRadius: 8,
                    background: `url("${photo}") center/cover`,
                    border: '0.5px solid rgba(42, 32, 53, 0.1)',
                  }}
                />
              )}
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: '#2a2035' }}>
                &ldquo;{THEME.spot.sentence}&rdquo;
              </div>
              {collected.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {collected.map((w) => (
                    <mark key={w} style={{ background: '#dff77e', color: '#2a2035', padding: '2px 8px', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600 }}>
                      {w}
                    </mark>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border-default)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
              <span>{selectedSpot.name} / {areaLabel}</span>
              <span>MY SENTENCE · {String(cardNo).padStart(3, '0')}</span>
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-purple)', lineHeight: 1.8 }}>
            <div>✓ 내 사진으로 만든 작품 카드예요.</div>
            <div>✓ {collected.length > 0 ? `수집한 표현 ${collected.length}개와 함께 ` : ''}필사 기록에 추가했어요.</div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="glass-card ttPress"
              style={{ flex: 1, border: 'none', padding: '12px 0', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)' }}
              onClick={onClose}
            >
              미션으로
            </button>
            <a href="/my" className={`${styles.certBtn} ttPress`} style={{ flex: 2, textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              필사 기록 보기 →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
