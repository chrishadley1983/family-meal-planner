'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MealPlanSettings,
  DEFAULT_SETTINGS,
  MACRO_MODE_DESCRIPTIONS,
  SHOPPING_MODE_DESCRIPTIONS,
  EXPIRY_PRIORITY_DESCRIPTIONS,
  FEEDBACK_DETAIL_DESCRIPTIONS,
  PRIORITY_LABELS,
  MacroMode,
  ShoppingMode,
  ExpiryPriority,
  FeedbackDetail,
  PriorityType
} from '@/lib/types/meal-plan-settings'

export default function MealPlanningSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<MealPlanSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['macros', 'variety', 'shopping', 'expiry', 'batch', 'priority', 'feedback'])
  )

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/meal-planning')
      const data = await response.json()

      if (response.ok) {
        setSettings(data.settings)
        console.log('🟢 Settings loaded:', data.settings)
      } else {
        console.error('❌ Failed to load settings:', data.error)
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      setSaveMessage('')

      const response = await fetch('/api/settings/meal-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (response.ok) {
        setSaveMessage('✓ Settings saved successfully!')
        console.log('🟢 Settings saved')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage(`Error: ${data.error}`)
        console.error('❌ Failed to save settings:', data.error)
      }
    } catch (error) {
      setSaveMessage('Error saving settings')
      console.error('❌ Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  function toggleSection(section: string) {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  function movePriority(index: number, direction: 'up' | 'down') {
    const newOrder = [...settings.priorityOrder]
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]]
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    }
    setSettings({ ...settings, priorityOrder: newOrder })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-purple-400 hover:text-purple-300 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">Meal Plan Settings</h1>
          <p className="text-zinc-400 mt-2">
            Configure how AI generates your weekly meal plans
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Section 1: Macro Targeting Mode */}
          <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
            <button
              onClick={() => toggleSection('macros')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Macro Targeting Mode</h2>
                  <p className="text-sm text-zinc-400">How strictly to track macros</p>
                </div>
              </div>
              <span className="text-zinc-500">{expandedSections.has('macros') ? '▼' : '▶'}</span>
            </button>

            {expandedSections.has('macros') && (
              <div className="px-6 pb-6 space-y-4">
                {(['balanced', 'strict', 'weekday_discipline', 'calorie_banking'] as MacroMode[]).map(mode => (
                  <label key={mode} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="macroMode"
                      value={mode}
                      checked={settings.macroMode === mode}
                      onChange={(e) => setSettings({ ...settings, macroMode: e.target.value as MacroMode })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-white">
                        {mode.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </div>
                      <div className="text-sm text-zinc-400">{MACRO_MODE_DESCRIPTIONS[mode]}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Recipe Variety & Cooldowns */}
          <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
            <button
              onClick={() => toggleSection('variety')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Recipe Variety & Cooldowns</h2>
                  <p className="text-sm text-zinc-400">Prevent meal repetition and ensure diversity</p>
                </div>
              </div>
              <span className="text-zinc-500">{expandedSections.has('variety') ? '▼' : '▶'}</span>
            </button>

            {expandedSections.has('variety') && (
              <div className="px-6 pb-6 space-y-6">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.varietyEnabled}
                    onChange={(e) => setSettings({ ...settings, varietyEnabled: e.target.checked })}
                  />
                  <span className="font-medium text-white">Enable variety tracking</span>
                </label>

                {settings.varietyEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Dinner Cooldown: {settings.dinnerCooldown} days
                      </label>
                      <input
                        type="range"
                        min="7"
                        max="30"
                        value={settings.dinnerCooldown}
                        onChange={(e) => setSettings({ ...settings, dinnerCooldown: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Lunch Cooldown: {settings.lunchCooldown} days
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="21"
                        value={settings.lunchCooldown}
                        onChange={(e) => setSettings({ ...settings, lunchCooldown: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Breakfast Cooldown: {settings.breakfastCooldown} days
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="14"
                        value={settings.breakfastCooldown}
                        onChange={(e) => setSettings({ ...settings, breakfastCooldown: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Snack Cooldown: {settings.snackCooldown} days
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="7"
                        value={settings.snackCooldown}
                        onChange={(e) => setSettings({ ...settings, snackCooldown: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Min Different Cuisines
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="7"
                          value={settings.minCuisines}
                          onChange={(e) => setSettings({ ...settings, minCuisines: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-zinc-700 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Max Same Cuisine
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="7"
                          value={settings.maxSameCuisine}
                          onChange={(e) => setSettings({ ...settings, maxSameCuisine: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-zinc-700 rounded"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Shopping Efficiency */}
          <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
            <button
              onClick={() => toggleSection('shopping')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Shopping Efficiency</h2>
                  <p className="text-sm text-zinc-400">Minimize unique ingredients</p>
                </div>
              </div>
              <span className="text-zinc-500">{expandedSections.has('shopping') ? '▼' : '▶'}</span>
            </button>

            {expandedSections.has('shopping') && (
              <div className="px-6 pb-6 space-y-4">
                {(['mild', 'moderate', 'aggressive'] as ShoppingMode[]).map(mode => (
                  <label key={mode} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="shoppingMode"
                      value={mode}
                      checked={settings.shoppingMode === mode}
                      onChange={(e) => setSettings({ ...settings, shoppingMode: e.target.value as ShoppingMode })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-white capitalize">{mode}</div>
                      <div className="text-sm text-zinc-400">{SHOPPING_MODE_DESCRIPTIONS[mode]}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Inventory & Expiry */}
          <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
            <button
              onClick={() => toggleSection('expiry')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📦</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Inventory & Expiry Management</h2>
                  <p className="text-sm text-zinc-400">Use expiring items efficiently</p>
                </div>
              </div>
              <span className="text-zinc-500">{expandedSections.has('expiry') ? '▼' : '▶'}</span>
            </button>

            {expandedSections.has('expiry') && (
              <div className="px-6 pb-6 space-y-6">
                <div className="space-y-4">
                  {(['soft', 'moderate', 'strong'] as ExpiryPriority[]).map(priority => (
                    <label key={priority} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="expiryPriority"
                        value={priority}
                        checked={settings.expiryPriority === priority}
                        onChange={(e) => setSettings({ ...settings, expiryPriority: e.target.value as ExpiryPriority })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-white capitalize">{priority}</div>
                        <div className="text-sm text-zinc-400">{EXPIRY_PRIORITY_DESCRIPTIONS[priority]}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Expiry Window: {settings.expiryWindow} days
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="14"
                    value={settings.expiryWindow}
                    onChange={(e) => setSettings({ ...settings, expiryWindow: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    Consider items expiring within this many days
                  </p>
                </div>

                <div className="bg-zinc-800/50 p-4 rounded border border-zinc-800">
                  <p className="text-sm text-zinc-400">
                    <strong>Note:</strong> "Use It Up" item selection will be available once you have inventory items added to the system.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Batch Cooking */}
          <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
            <button
              onClick={() => toggleSection('batch')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍲</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Batch Cooking / Meal Prep</h2>
                  <p className="text-sm text-zinc-400">Cook once, eat multiple times</p>
                </div>
              </div>
              <span className="text-zinc-500">{expandedSections.has('batch') ? '▼' : '▶'}</span>
            </button>

            {expandedSections.has('batch') && (
              <div className="px-6 pb-6 space-y-6">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.batchCookingEnabled}
                    onChange={(e) => setSettings({ ...settings, batchCookingEnabled: e.target.checked })}
                  />
                  <span className="font-medium text-white">Enable batch cooking suggestions</span>
                </label>

                {settings.batchCookingEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Maximum Leftover Days: {settings.maxLeftoverDays}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={settings.maxLeftoverDays}
                      onChange={(e) => setSettings({ ...settings, maxLeftoverDays: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-zinc-400 mt-1">
                      Limit how far ahead batch-cooked meals can be used
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 6: Priority Ordering */}
          <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
            <button
              onClick={() => toggleSection('priority')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Priority Ordering</h2>
                  <p className="text-sm text-zinc-400">What matters most when constraints conflict</p>
                </div>
              </div>
              <span className="text-zinc-500">{expandedSections.has('priority') ? '▼' : '▶'}</span>
            </button>

            {expandedSections.has('priority') && (
              <div className="px-6 pb-6">
                <p className="text-sm text-zinc-400 mb-4">
                  When AI can't satisfy all constraints, it will prioritize in this order (top to bottom):
                </p>
                <div className="space-y-2">
                  {settings.priorityOrder.map((priority, index) => (
                    <div key={priority} className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded">
                      <span className="font-semibold text-zinc-400 w-6">{index + 1}.</span>
                      <span className="flex-1 font-medium text-white">{PRIORITY_LABELS[priority]}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => movePriority(index, 'up')}
                          disabled={index === 0}
                          className="px-2 py-1 text-sm bg-white border border-zinc-700 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => movePriority(index, 'down')}
                          disabled={index === settings.priorityOrder.length - 1}
                          className="px-2 py-1 text-sm bg-white border border-zinc-700 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 7: Sarah's Feedback */}
          <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
            <button
              onClick={() => toggleSection('feedback')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Sarah's Nutritional Feedback</h2>
                  <p className="text-sm text-zinc-400">How much detail in weekly summaries</p>
                </div>
              </div>
              <span className="text-zinc-500">{expandedSections.has('feedback') ? '▼' : '▶'}</span>
            </button>

            {expandedSections.has('feedback') && (
              <div className="px-6 pb-6 space-y-4">
                {(['light', 'medium', 'detailed'] as FeedbackDetail[]).map(detail => (
                  <label key={detail} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="feedbackDetail"
                      value={detail}
                      checked={settings.feedbackDetail === detail}
                      onChange={(e) => setSettings({ ...settings, feedbackDetail: e.target.value as FeedbackDetail })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-white capitalize">{detail}</div>
                      <div className="text-sm text-zinc-400">{FEEDBACK_DETAIL_DESCRIPTIONS[detail]}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex items-center justify-between bg-zinc-900 rounded-lg shadow-sm border border-zinc-800 p-6">
          <div>
            {saveMessage && (
              <p className={`text-sm ${saveMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage}
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
