import type { Metadata } from 'next'
import DeleteAccount from './DeleteAccount'

export const metadata: Metadata = {
  title: '계정 삭제 — 투톤',
  description: '투톤 계정과 저장한 기록을 삭제해요.',
}

export default function DeleteAccountPage() {
  return <DeleteAccount />
}
