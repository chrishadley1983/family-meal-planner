'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  ProfileSelector,
  Profile,
  ChatMessage,
  SuggestedPrompts,
  ActionConfirmationModal,
  ConversationList,
  ConversationPreview,
} from '@/components/nutritionist'
import { NutritionistAction } from '@/lib/nutritionist/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestedActions?: NutritionistAction[]
  suggestedPrompts?: string[]
}

export default function NutritionistPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // State
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  // Action confirmation modal
  const [actionToConfirm, setActionToConfirm] = useState<NutritionistAction | null>(null)
  const [isApplyingAction, setIsApplyingAction] = useState(false)
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch profiles on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfiles()
    }
  }, [status])

  // Fetch conversations when profile changes
  useEffect(() => {
    if (selectedProfileId) {
      fetchConversations(selectedProfileId)
    }
  }, [selectedProfileId])

  // Track if we just created a new conversation (to skip fetchConversation)
  const [isNewConversation, setIsNewConversation] = useState(false)

  // Fetch messages when conversation changes (skip if we just created it)
  useEffect(() => {
    if (selectedConversationId) {
      if (isNewConversation) {
        // Skip fetching - we already have the greeting message
        setIsNewConversation(false)
      } else {
        fetchConversation(selectedConversationId)
      }
    } else {
      setMessages([])
      setSuggestedPrompts([])
    }
  }, [selectedConversationId, isNewConversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      inputRef.current?.focus()
    }
  }, [selectedConversationId])

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles')
      const data = await response.json()
      if (data.profiles) {
        setProfiles(data.profiles)
        // Select main user profile by default
        const mainProfile = data.profiles.find((p: Profile) => p.isMainUser)
        if (mainProfile) {
          setSelectedProfileId(mainProfile.id)
        } else if (data.profiles.length > 0) {
          setSelectedProfileId(data.profiles[0].id)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching profiles:', error)
    }
  }

  const fetchConversations = async (profileId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/nutritionist/conversations?profileId=${profileId}`)
      const data = await response.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchConversation = async (conversationId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/nutritionist/conversations/${conversationId}`)
      const data = await response.json()

      if (data.conversation) {
        // Convert messages to our format
        const msgs: Message[] = data.conversation.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
          suggestedActions: m.metadata?.suggestedActions,
          suggestedPrompts: m.metadata?.suggestedPrompts,
        }))
        setMessages(msgs)

        // Get suggested prompts from last assistant message or fetch new ones
        const lastAssistantMsg = msgs.filter((m) => m.role === 'assistant').pop()
        if (lastAssistantMsg?.suggestedPrompts) {
          setSuggestedPrompts(lastAssistantMsg.suggestedPrompts)
        } else {
          fetchSuggestedPrompts(conversationId)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuggestedPrompts = async (conversationId?: string) => {
    if (!selectedProfileId) return

    try {
      let url = `/api/nutritionist/suggested-prompts?profileId=${selectedProfileId}`
      if (conversationId) {
        url += `&conversationId=${conversationId}`
      }

      const response = await fetch(url)
      const data = await response.json()
      if (data.prompts) {
        setSuggestedPrompts(data.prompts)
      }
    } catch (error) {
      console.error('❌ Error fetching suggested prompts:', error)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      console.log('🔷 Deleting conversation:', conversationId)
      const response = await fetch(`/api/nutritionist/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        console.log('🟢 Conversation deleted')
        // Remove from list
        setConversations((prev) => prev.filter((c) => c.id !== conversationId))
        // Clear selection if it was the deleted conversation
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null)
          setMessages([])
          setSuggestedPrompts([])
        }
      } else {
        console.error('❌ Failed to delete conversation')
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error)
    }
  }

  const createNewConversation = async () => {
    if (!selectedProfileId) return

    try {
      const response = await fetch('/api/nutritionist/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedProfileId }),
      })

      const data = await response.json()
      if (data.conversation) {
        // Add to conversations list
        setConversations((prev) => [
          {
            id: data.conversation.id,
            title: data.conversation.title,
            profileId: data.conversation.profileId,
            profile: data.conversation.profile,
            lastMessage: null,
            lastMessageAt: data.conversation.createdAt,
            createdAt: data.conversation.createdAt,
          },
          ...prev,
        ])

        // Mark as new conversation to prevent fetchConversation from overwriting
        setIsNewConversation(true)

        // Select the new conversation
        setSelectedConversationId(data.conversation.id)

        // Get initial greeting
        const greetingResponse = await fetch(
          `/api/nutritionist/chat?profileId=${selectedProfileId}`
        )
        const greetingData = await greetingResponse.json()

        if (greetingData.message) {
          // Add greeting as first message
          const greetingMsg: Message = {
            id: `greeting-${Date.now()}`,
            role: 'assistant',
            content: greetingData.message,
            timestamp: new Date(),
            suggestedPrompts: greetingData.suggestedPrompts,
          }
          setMessages([greetingMsg])
          setSuggestedPrompts(greetingData.suggestedPrompts || [])
        }
      }
    } catch (error) {
      console.error('❌ Error creating conversation:', error)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedConversationId || isSending) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setSuggestedPrompts([])
    setIsSending(true)

    // Add loading message
    const loadingId = `loading-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: 'assistant', content: '', timestamp: new Date() },
    ])

    try {
      const response = await fetch('/api/nutritionist/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          message: content.trim(),
        }),
      })

      const data = await response.json()

      // Remove loading message and add real response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingId)
        return [
          ...filtered,
          {
            id: data.messageId || `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.message || 'Sorry, I had trouble responding. Please try again.',
            timestamp: new Date(),
            suggestedActions: data.suggestedActions,
            suggestedPrompts: data.suggestedPrompts,
          },
        ]
      })

      // Update suggested prompts
      if (data.suggestedPrompts) {
        setSuggestedPrompts(data.suggestedPrompts)
      }

      // Store message ID for potential action confirmation
      if (data.messageId) {
        setCurrentMessageId(data.messageId)
      }

      // Update conversation in sidebar (including title if returned)
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversationId
            ? {
                ...conv,
                title: data.conversationTitle || conv.title,
                lastMessage: data.message?.substring(0, 100),
                lastMessageAt: new Date(),
              }
            : conv
        )
      )
    } catch (error) {
      console.error('❌ Error sending message:', error)
      // Remove loading message on error
      setMessages((prev) => prev.filter((m) => m.id !== loadingId))
    } finally {
      setIsSending(false)
    }
  }

  const handleActionClick = (action: NutritionistAction) => {
    setActionToConfirm(action)
  }

  const confirmAction = async () => {
    if (!actionToConfirm) return

    setIsApplyingAction(true)

    try {
      const response = await fetch('/api/nutritionist/apply-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          action: actionToConfirm,
          messageId: currentMessageId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Close modal
        setActionToConfirm(null)

        // Send a follow-up message to the conversation
        const followUpMessage =
          actionToConfirm.type === 'UPDATE_MACROS'
            ? 'I\'ve applied those macro targets to my profile.'
            : actionToConfirm.type === 'CREATE_RECIPE'
            ? 'I\'ve added that recipe to my collection.'
            : actionToConfirm.type === 'ADD_INVENTORY_ITEM'
            ? 'I\'ve added that to my inventory.'
            : 'I\'ve added that to my staples.'

        await sendMessage(followUpMessage)
      } else {
        console.error('❌ Action failed:', data.error)
        // Could show error toast here
      }
    } catch (error) {
      console.error('❌ Error applying action:', error)
    } finally {
      setIsApplyingAction(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <div className="h-[calc(100vh-64px)] flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        {showSidebar && (
          <div className="w-72 flex-shrink-0 hidden md:block">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              onNewConversation={createNewConversation}
              onDelete={deleteConversation}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-zinc-950">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-3">
              {/* Toggle sidebar on mobile */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden p-2 text-zinc-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-900/50 to-blue-900/50 overflow-hidden border border-green-700/30">
                  <Image
                    src="/sarah-nutritionist.png"
                    alt="Emilia"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Ask the Nutritionist</h1>
                  <p className="text-xs text-zinc-400">Chat with Emilia about your nutrition goals</p>
                </div>
              </div>
            </div>

            <ProfileSelector
              profiles={profiles}
              selectedProfileId={selectedProfileId}
              onSelect={(id) => {
                setSelectedProfileId(id)
                setSelectedConversationId(null)
              }}
            />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!selectedConversationId ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-900/30 to-blue-900/30 overflow-hidden border border-green-700/20 mb-4">
                  <Image
                    src="/sarah-nutritionist.png"
                    alt="Emilia"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Hi, I&apos;m Emilia!
                </h2>
                <p className="text-zinc-400 max-w-md mb-6">
                  I&apos;m your nutrition guide. I can help you set macro targets,
                  suggest recipes, analyze your meal plans, and more.
                </p>
                <button
                  onClick={createNewConversation}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                >
                  Start a Conversation
                </button>
              </div>
            ) : messages.length === 0 && isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-zinc-400">Loading conversation...</div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    suggestedActions={msg.suggestedActions}
                    onActionClick={handleActionClick}
                    isLoading={msg.content === '' && msg.role === 'assistant'}
                  />
                ))}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          {selectedConversationId && (
            <div className="border-t border-zinc-800 bg-zinc-900 p-4">
              {/* Suggested prompts */}
              {suggestedPrompts.length > 0 && !isSending && (
                <div className="mb-3">
                  <SuggestedPrompts
                    prompts={suggestedPrompts}
                    onSelect={sendMessage}
                    disabled={isSending}
                  />
                </div>
              )}

              {/* Input field */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Emilia about nutrition, macros, recipes..."
                  disabled={isSending}
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 disabled:opacity-60"
                />
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isSending}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Confirmation Modal */}
      <ActionConfirmationModal
        isOpen={!!actionToConfirm}
        onClose={() => setActionToConfirm(null)}
        action={actionToConfirm}
        onConfirm={confirmAction}
        isLoading={isApplyingAction}
      />
    </AppLayout>
  )
}
