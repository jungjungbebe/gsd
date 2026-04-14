import BackgroundRipple from '@/components/landing/BackgroundRipple'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingHero from '@/components/landing/LandingHero'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingCTA from '@/components/landing/LandingCTA'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>
      <BackgroundRipple />
      <LandingHeader />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div id="features">
          <LandingHero />
        </div>
        <LandingFeatures />
        <div id="contact">
          <LandingCTA />
        </div>
      </div>
    </div>
  )
}
