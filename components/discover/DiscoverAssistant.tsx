'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { MasterRecipeSearchResult } from '@/lib/nutritionist/master-recipe-search'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestedRecipes?: MasterRecipeSearchResult[]
}

interface DiscoverAssistantProps {
  profileId: string
  onAddRecipe: (recipeId: string) => Promise<void>
}

export function DiscoverAssistant({ profileId, onAddRecipe }: DiscoverAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null)
  const [addedRecipeIds, setAddedRecipeIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch greeting when opened
  useEffect(() => {
    if (isOpen && !greeting && profileId) {
      fetchGreeting()
    }
  }, [isOpen, profileId, greeting])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchGreeting = async () => {
    try {
      const response = await fetch(`/api/discover/assistant?profileId=${profileId}`)
      if (response.ok) {
        const data = await response.json()
        setGreeting(data.greeting)
        setSuggestedPrompts(data.suggestedPrompts || [])
      }
    } catch (error) {
      console.error('Failed to fetch greeting:', error)
      setGreeting("Hi! I'm Emilia, your recipe assistant. What are you looking for today?")
    }
  }

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/discover/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          profileId,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          suggestedRecipes: data.suggestedRecipes,
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: "Sorry, I'm having trouble right now. Please try again.",
          },
        ])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, something went wrong. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddRecipe = async (recipe: MasterRecipeSearchResult) => {
    setAddingRecipeId(recipe.id)
    try {
      await onAddRecipe(recipe.id)
      setAddedRecipeIds(prev => new Set([...prev, recipe.id]))
    } catch (error) {
      console.error('Failed to add recipe:', error)
    } finally {
      setAddingRecipeId(null)
    }
  }

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt)
  }

  if (!isOpen) {
    // Floating action button
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50 text-2xl"
        title="Ask Emilia for recipe help"
      >
        <span role="img" aria-label="Emilia">👩‍🍳</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-zinc-900 rounded-xl shadow-2xl border border-zinc-700 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-xl">
            <span role="img" aria-label="Emilia">👩‍🍳</span>
          </div>
          <div>
            <h3 className="font-semibold text-white">Emilia</h3>
            <p className="text-xs text-zinc-400">Recipe Assistant</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial greeting */}
        {messages.length === 0 && greeting && (
          <div className="space-y-4">
            <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-200">
              {greeting}
            </div>
            {suggestedPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(prompt)}
                    className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversation */}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-lg p-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                {msg.content}
              </div>

              {/* Recipe suggestions */}
              {msg.suggestedRecipes && msg.suggestedRecipes.length > 0 && (
                <div className="space-y-2 mt-2">
                  {msg.suggestedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white text-sm truncate">
                            {recipe.name}
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {recipe.sourceSiteName}
                            {recipe.totalTimeMinutes && ` • ${recipe.totalTimeMinutes} mins`}
                          </p>
                          {recipe.caloriesPerServing && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {recipe.caloriesPerServing} kcal
                              {recipe.proteinPerServing && ` • ${recipe.proteinPerServing}g protein`}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={addedRecipeIds.has(recipe.id) ? 'ghost' : 'primary'}
                          onClick={() => handleAddRecipe(recipe)}
                          disabled={addingRecipeId === recipe.id || addedRecipeIds.has(recipe.id)}
                          className="shrink-0 text-xs"
                        >
                          {addedRecipeIds.has(recipe.id)
                            ? 'Added ✓'
                            : addingRecipeId === recipe.id
                            ? 'Adding...'
                            : 'Add'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-700">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about recipes..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </form>
      </div>
    </div>
  )
}
