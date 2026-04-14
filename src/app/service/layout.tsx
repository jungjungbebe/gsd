import BottomNav from '@/components/BottomNav'

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
