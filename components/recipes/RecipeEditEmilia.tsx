'use client'

import Image from 'next/image'
import { ChatMessage, ProjectedNutrition, ValidatedNutrition } from '@/lib/types/nutritionist'

interface RecipeEditEmiliaProps {
  nutritionistFeedback: string
  chatMessages: ChatMessage[]
  chatInput: string
  suggestedPrompts: string[]
  chatLoading: boolean
  projectedNutrition: ProjectedNutrition | null
  validatedNutrition: ValidatedNutrition | null
  onChatInputChange: (input: string) => void
  onSendMessage: (message: string) => void
  onClearProjectedNutrition: () => void
  className?: string
}

export function RecipeEditEmilia({
  nutritionistFeedback,
  chatMessages,
  chatInput,
  suggestedPrompts,
  chatLoading,
  projectedNutrition,
  validatedNutrition,
  onChatInputChange,
  onSendMessage,
  onClearProjectedNutrition,
  className = '',
}: RecipeEditEmiliaProps) {
  if (!nutritionistFeedback) return null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage(chatInput)
    }
  }

  // Filter out the initial feedback message from chat messages to avoid duplication
  // The initial message has id 'initial-feedback'
  const chatMessagesWithoutInitial = chatMessages.filter(m => m.id !== 'initial-feedback')

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-700/30 p-5 ${className}`}>
      <div className="flex items-start gap-4 mb-4">
        {/* Emilia Avatar */}
        <div className="flex-shrink-0">
          <Image
            src="/sarah-nutritionist.png"
            alt="Emilia - Your AI Nutritionist"
            width={48}
            height={48}
            className="rounded-full border-2 border-purple-500/50"
          />
        </div>

        {/* Header & Initial Feedback */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-purple-200">Emilia&apos;s Nutritionist Tips</h3>
            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
              Interactive
            </span>
          </div>

          {/* Initial feedback text - always show this, it's the baseline tips */}
          <p className="text-sm text-purple-100/80 leading-relaxed">
            {nutritionistFeedback}
          </p>
        </div>
      </div>

      {/* Suggested Prompts - Quick Action Buttons */}
      {suggestedPrompts.length > 0 && !chatLoading && (
        <div className="flex flex-wrap gap-2 mb-4 ml-16">
          {suggestedPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(prompt)}
              className="text-sm bg-gray-800/50 hover:bg-gray-700/50 text-white px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages - only show messages AFTER the initial feedback */}
      {chatMessagesWithoutInitial.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto mb-4 ml-16">
          {chatMessagesWithoutInitial.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/50 text-zinc-200'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800/50 text-zinc-400 rounded-lg px-4 py-2">
                <p className="text-sm">Emilia is typing...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projected Nutrition */}
      {projectedNutrition && (
        <div className={`rounded-lg p-3 mb-4 ml-16 ${validatedNutrition?.isValidated ? 'bg-green-900/30 border border-green-600/50' : 'bg-gray-800/50 border border-gray-600/50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium ${validatedNutrition?.isValidated ? 'text-green-400' : 'text-zinc-400'}`}>
              {validatedNutrition?.isValidated ? '✓ Validated Nutrition Impact' : 'Estimated (will recalculate)'}
            </span>
            <button
              onClick={onClearProjectedNutrition}
              className="text-xs text-zinc-500 hover:text-zinc-400"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <p className="text-zinc-400">Calories</p>
              <p className="text-blue-400 font-semibold">{Math.round(projectedNutrition.calories)}</p>
              {validatedNutrition?.impact && (
                <p className={`text-[10px] ${validatedNutrition.impact.calories <= 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {validatedNutrition.impact.calories > 0 ? '+' : ''}{validatedNutrition.impact.calories}
                </p>
              )}
            </div>
            <div>
              <p className="text-zinc-400">Protein</p>
              <p className="text-purple-400 font-semibold">{Math.round(projectedNutrition.protein)}g</p>
              {validatedNutrition?.impact && (
                <p className={`text-[10px] ${validatedNutrition.impact.protein >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {validatedNutrition.impact.protein > 0 ? '+' : ''}{validatedNutrition.impact.protein}g
                </p>
              )}
            </div>
            <div>
              <p className="text-zinc-400">Carbs</p>
              <p className="text-green-400 font-semibold">{Math.round(projectedNutrition.carbs)}g</p>
              {validatedNutrition?.impact && (
                <p className={`text-[10px] ${validatedNutrition.impact.carbs <= 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {validatedNutrition.impact.carbs > 0 ? '+' : ''}{validatedNutrition.impact.carbs}g
                </p>
              )}
            </div>
            <div>
              <p className="text-zinc-400">Fat</p>
              <p className="text-yellow-400 font-semibold">{Math.round(projectedNutrition.fat)}g</p>
              {validatedNutrition?.impact && (
                <p className={`text-[10px] ${validatedNutrition.impact.fat <= 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {validatedNutrition.impact.fat > 0 ? '+' : ''}{validatedNutrition.impact.fat}g
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="flex gap-2 ml-16">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tweak this recipe (e.g. add protein, reduce fat)..."
          className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          disabled={chatLoading}
        />
        <button
          onClick={() => onSendMessage(chatInput)}
          disabled={chatLoading || !chatInput.trim()}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
