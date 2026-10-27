import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Tutone — business Korean tone check'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #d8e8c8 0%, #e6c8d2 45%, #a890c0 100%)',
          color: '#2a2035',
        }}
      >
        <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -4, color: '#6040a0' }}>Tutone</div>
        <div style={{ fontSize: 40, marginTop: 12, opacity: 0.7 }}>Business Korean tone check</div>
      </div>
    ),
    size,
  )
}
