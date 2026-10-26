'use client'

import { useState } from 'react'
import Link from 'next/link'
import { diagnosisQuestions, calculateLevel } from '@/lib/diagnosis'

type QuizState = 'quiz' | 'result'

export default function DiagnosisPage() {
  const [state, setState] = useState<QuizState>('quiz')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [showExplanation, setShowExplanation] = useState(false)

  const question = diagnosisQuestions[currentIndex]
  const totalQuestions = diagnosisQuestions.length
  const progressPercent = ((currentIndex) / totalQuestions) * 100

  const correctCount = answers.filter(Boolean).length
  const result = calculateLevel(correctCount)

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
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-6">
          <h2 className="text-2xl font-bold text-gray-800">진단 완료!</h2>

          {/* Level Badge */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-white text-3xl font-extrabold">{finalResult.label}</span>
            </div>
            <p className="text-lg font-semibold text-indigo-700 text-center">{finalResult.description}</p>
          </div>

          {/* Score */}
          <div className="bg-indigo-50 rounded-xl px-8 py-4 text-center">
            <p className="text-sm text-indigo-500 font-medium mb-1">내 점수</p>
            <p className="text-4xl font-extrabold text-indigo-700">
              {finalCorrect}
              <span className="text-2xl font-semibold text-indigo-400"> / {totalQuestions}</span>
            </p>
          </div>

          {/* Answer summary */}
          <div className="flex gap-2 flex-wrap justify-center">
            {answers.map((correct, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  correct ? 'bg-emerald-500' : 'bg-red-400'
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
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-center py-3 px-6 rounded-xl transition-colors"
            >
              회원가입하고 내 레벨에 맞는 콘텐츠 보기
            </Link>
            <button
              onClick={handleReset}
              className="w-full border border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold py-3 px-6 rounded-xl transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-800 mb-1">문해력 진단 테스트</h1>
          <p className="text-sm text-gray-500">비즈니스 한국어 이해 능력을 확인해보세요</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>질문 {currentIndex + 1} / {totalQuestions}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
          <p className="text-base font-semibold text-gray-800 leading-relaxed mb-6">
            {question.question}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {question.options.map((option, index) => {
              let optionStyle =
                'border border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'

              if (selectedOption !== null) {
                if (index === question.correctIndex) {
                  optionStyle = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700'
                } else if (index === selectedOption) {
                  optionStyle = 'border-2 border-red-400 bg-red-50 text-red-700'
                } else {
                  optionStyle = 'border border-gray-200 text-gray-400 opacity-60'
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleOptionSelect(index)}
                  disabled={selectedOption !== null}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer disabled:cursor-default ${optionStyle}`}
                >
                  <span className="mr-2 text-indigo-400 font-bold">
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
            className={`rounded-xl px-5 py-4 mb-4 text-sm leading-relaxed transition-all duration-300 ${
              selectedOption === question.correctIndex
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
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
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {currentIndex + 1 >= totalQuestions ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  )
}
