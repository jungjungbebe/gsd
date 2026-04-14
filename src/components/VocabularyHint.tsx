'use client'

interface Hint {
  word: string
  hint: string
}

interface VocabularyHintProps {
  text: string
  hints: Hint[]
}

export default function VocabularyHint({ text, hints }: VocabularyHintProps) {
  if (!hints || hints.length === 0) {
    return <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
  }

  // Build segments by splitting on hint words
  const segments: Array<{ type: 'text' | 'hint'; content: string; hint?: string }> = []

  // Sort hints by word length descending to match longer words first
  const sortedHints = [...hints].sort((a, b) => b.word.length - a.word.length)

  // Create regex that matches any hint word
  const escapedWords = sortedHints.map(h => h.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escapedWords.join('|')})`, 'g')

  const parts = text.split(pattern)

  for (const part of parts) {
    const matchedHint = sortedHints.find(h => h.word === part)
    if (matchedHint) {
      segments.push({ type: 'hint', content: part, hint: matchedHint.hint })
    } else if (part) {
      segments.push({ type: 'text', content: part })
    }
  }

  return (
    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.type === 'hint') {
          return (
            <span key={i} className="relative inline-block group">
              <span className="border-b-2 border-dotted border-indigo-500 text-indigo-700 cursor-help">
                {seg.content}
              </span>
              <span
                className="
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  bg-gray-800 text-white text-xs rounded px-3 py-2
                  whitespace-nowrap max-w-xs
                  opacity-0 group-hover:opacity-100
                  pointer-events-none
                  transition-opacity duration-200
                  z-10
                "
                style={{ whiteSpace: 'normal', minWidth: '12rem', maxWidth: '20rem' }}
              >
                <span className="font-semibold text-indigo-300">{seg.content}</span>
                <br />
                {seg.hint}
                {/* Arrow */}
                <span
                  className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"
                  style={{ display: 'block', width: 0, height: 0 }}
                />
              </span>
            </span>
          )
        }
        return <span key={i}>{seg.content}</span>
      })}
    </p>
  )
}
