import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">📖</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">페이지를 찾을 수 없어요</h2>
      <p className="text-gray-500 mb-6">존재하지 않는 페이지입니다</p>
      <Link href="/" className="bg-indigo-600 text-white px-6 py-2 rounded-full">홈으로</Link>
    </div>
  )
}
