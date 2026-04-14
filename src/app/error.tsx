'use client'
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">문제가 발생했어요</h2>
      <button onClick={reset} className="bg-indigo-600 text-white px-6 py-2 rounded-full">다시 시도</button>
    </div>
  )
}
