'use client'

import { useState } from 'react'
import Link from 'next/link'
import { diagnosisQuestions, calculateLevel } from '@/lib/diagnosis'

type QuizState = 'quiz' | 'result'

const GLASS = 'rounded-3xl border border-white/50 bg-white/15 backdrop-blur-xl'

export default function DiagnosisPage() {
  const [state, setState] = useState<QuizState>('quiz')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [showExplanation, setShowExplanation] = useState(false)

  const question = diagnosisQuestions[currentIndex]
  const totalQuestions = diagnosisQuestions.length
  const progressPercent = ((currentIndex) / totalQuestions) * 100

  function handleOptionSelect(index: number) {
    if (selectedOption !== null) return
    setSelectedOption(index)
    setShowExplanation(true)
  }

  function handleNext() {
    const isCorrect = selectedOption === question.correctIndex
    const newAnswers = [...answers, isCorrect]
    setAnswers(newAnswers)

    if (currentIndex + 1 >= totalQuestions) {
      setState('result')
    } else {
      setCurrentIndex(currentIndex + 1)
      setSelectedOption(null)
      setShowExplanation(false)
    }
  }

  function handleReset() {
    setState('quiz')
    setCurrentIndex(0)
    setSelectedOption(null)
    setAnswers([])
    setShowExplanation(false)
  }

  if (state === 'result') {
    const finalCorrect = answers.filter(Boolean).length
    const finalResult = calculateLevel(finalCorrect)

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-12 pb-32">
        <div className={`w-full max-w-md ${GLASS} p-8 flex flex-col items-center gap-6`}>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#6040a0]">RESULT</p>
          <h2 className="text-2xl font-bold text-[#2a2035]">진단 완료!</h2>

          {/* Level Badge */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full bg-[#6040a0] flex items-center justify-center shadow-lg shadow-[#6040a0]/30">
              <span className="text-white text-3xl font-extrabold">{finalResult.label}</span>
            </div>
            <p className="text-lg font-semibold text-[#6040a0] text-center">{finalResult.description}</p>
          </div>

          {/* Score */}
          <div className="rounded-2xl border border-white/50 bg-white/20 px-8 py-4 text-center">
            <p className="text-sm text-[#2a2035]/60 font-medium mb-1">내 점수</p>
            <p className="text-4xl font-extrabold text-[#6040a0]">
              {finalCorrect}
              <span className="text-2xl font-semibold text-[#6040a0]/50"> / {totalQuestions}</span>
            </p>
          </div>

          {/* Answer summary */}
          <div className="flex gap-2 flex-wrap justify-center">
            {answers.map((correct, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  correct ? 'bg-emerald-500/80' : 'bg-rose-400/80'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="w-full flex flex-col gap-3 mt-2">
            <Link
              href="/signup"
              className="w-full bg-[#6040a0] hover:bg-[#503590] text-white font-semibold text-center py-3 px-6 rounded-2xl transition-colors"
            >
              회원가입하고 내 레벨에 맞는 콘텐츠 보기
            </Link>
            <button
              onClick={handleReset}
              className="w-full border border-white/60 bg-white/20 text-[#6040a0] hover:bg-white/40 font-semibold py-3 px-6 rounded-2xl transition-colors"
            >
              다시 진단하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-12 pb-32">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#6040a0] mb-2">DIAGNOSIS</p>
          <h1 className="text-2xl font-bold text-[#2a2035] mb-1">문해력 진단 테스트</h1>
          <p className="text-sm text-[#2a2035]/60">비즈니스 한국어 이해 능력을 확인해보세요</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-[#2a2035]/60 mb-1">
            <span>질문 {currentIndex + 1} / {totalQuestions}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6040a0] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className={`${GLASS} p-6 mb-4`}>
          <p className="text-base font-semibold text-[#2a2035] leading-relaxed mb-6">
            {question.question}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {question.options.map((option, index) => {
              let optionStyle =
                'border border-white/50 bg-white/20 text-[#2a2035] hover:border-[#6040a0]/60 hover:bg-white/40'

              if (selectedOption !== null) {
                if (index === question.correctIndex) {
                  optionStyle = 'border-2 border-emerald-500/70 bg-emerald-100/50 text-emerald-800'
                } else if (index === selectedOption) {
                  optionStyle = 'border-2 border-rose-400/70 bg-rose-100/50 text-rose-800'
                } else {
                  optionStyle = 'border border-white/40 bg-white/10 text-[#2a2035]/40 opacity-60'
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleOptionSelect(index)}
                  disabled={selectedOption !== null}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-medium transition-all duration-200 cursor-pointer disabled:cursor-default ${optionStyle}`}
                >
                  <span className="mr-2 text-[#6040a0] font-bold">
                    {['①', '②', '③', '④'][index]}
                  </span>
                  {option}
                </button>
              )
            })}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div
            className={`rounded-2xl px-5 py-4 mb-4 text-sm leading-relaxed backdrop-blur-xl transition-all duration-300 ${
              selectedOption === question.correctIndex
                ? 'bg-emerald-100/50 border border-emerald-300/60 text-emerald-900'
                : 'bg-rose-100/50 border border-rose-300/60 text-rose-900'
            }`}
          >
            <p className="font-semibold mb-1">
              {selectedOption === question.correctIndex ? '정답입니다!' : '틀렸습니다.'}
            </p>
            <p>{question.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {showExplanation && (
          <button
            onClick={handleNext}
            className="w-full bg-[#6040a0] hover:bg-[#503590] text-white font-semibold py-3 px-6 rounded-2xl transition-colors"
          >
            {currentIndex + 1 >= totalQuestions ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  )
}
