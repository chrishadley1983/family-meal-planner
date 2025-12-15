'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
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

interface MealPlanSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export function MealPlanSettingsModal({ isOpen, onClose, onSave }: MealPlanSettingsModalProps) {
  const [settings, setSettings] = useState<MealPlanSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['variety', 'shopping'])
  )

  useEffect(() => {
    if (isOpen) {
      fetchSettings()
    }
  }, [isOpen])

  async function fetchSettings() {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/meal-planning')
      const data = await response.json()

      if (response.ok) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
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

      if (response.ok) {
        setSaveMessage('✓ Settings saved!')
        setTimeout(() => {
          setSaveMessage('')
          onSave?.()
          onClose()
        }, 1000)
      } else {
        const data = await response.json()
        setSaveMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setSaveMessage('Error saving settings')
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Meal Plan Settings" maxWidth="2xl">
      <div className="p-4 max-h-[75vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-zinc-400">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recipe Variety & Repeat Days */}
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
              <button
                onClick={() => toggleSection('variety')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-700/50 rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔄</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Recipe Variety & Repeat Days</h3>
                    <p className="text-xs text-zinc-400">Prevent meal repetition</p>
                  </div>
                </div>
                <span className="text-zinc-400">{expandedSections.has('variety') ? '▼' : '▶'}</span>
              </button>

              {expandedSections.has('variety') && (
                <div className="px-4 pb-4 space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.varietyEnabled}
                      onChange={(e) => setSettings({ ...settings, varietyEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-white">Enable variety tracking</span>
                  </label>

                  {settings.varietyEnabled && (
                    <>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Dinners: days until repeat</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="7"
                            max="30"
                            value={settings.dinnerCooldown}
                            onChange={(e) => setSettings({ ...settings, dinnerCooldown: parseInt(e.target.value) })}
                            className="flex-1 accent-purple-500"
                          />
                          <span className="w-8 text-right text-purple-400 font-mono text-sm">{settings.dinnerCooldown}d</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Lunches: days until repeat</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="3"
                            max="21"
                            value={settings.lunchCooldown}
                            onChange={(e) => setSettings({ ...settings, lunchCooldown: parseInt(e.target.value) })}
                            className="flex-1 accent-purple-500"
                          />
                          <span className="w-8 text-right text-purple-400 font-mono text-sm">{settings.lunchCooldown}d</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Breakfasts: days until repeat</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1"
                            max="14"
                            value={settings.breakfastCooldown}
                            onChange={(e) => setSettings({ ...settings, breakfastCooldown: parseInt(e.target.value) })}
                            className="flex-1 accent-purple-500"
                          />
                          <span className="w-8 text-right text-purple-400 font-mono text-sm">{settings.breakfastCooldown}d</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Snacks: days until repeat</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1"
                            max="7"
                            value={settings.snackCooldown}
                            onChange={(e) => setSettings({ ...settings, snackCooldown: parseInt(e.target.value) })}
                            className="flex-1 accent-purple-500"
                          />
                          <span className="w-8 text-right text-purple-400 font-mono text-sm">{settings.snackCooldown}d</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Shopping Efficiency */}
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
              <button
                onClick={() => toggleSection('shopping')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-700/50 rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛒</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Shopping Efficiency</h3>
                    <p className="text-xs text-zinc-400">Minimize unique ingredients</p>
                  </div>
                </div>
                <span className="text-zinc-400">{expandedSections.has('shopping') ? '▼' : '▶'}</span>
              </button>

              {expandedSections.has('shopping') && (
                <div className="px-4 pb-4">
                  <div className="flex justify-between text-xs text-zinc-500 mb-2">
                    <span>More variety</span>
                    <span>Simpler shopping</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={settings.shoppingMode === 'mild' ? 0 : settings.shoppingMode === 'moderate' ? 1 : 2}
                    onChange={(e) => {
                      const modes: ShoppingMode[] = ['mild', 'moderate', 'aggressive']
                      setSettings({ ...settings, shoppingMode: modes[parseInt(e.target.value)] })
                    }}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                  <div className="mt-2 p-2 bg-zinc-900/50 rounded text-sm">
                    <span className="text-purple-400 font-medium">
                      {settings.shoppingMode === 'mild' ? 'Low' : settings.shoppingMode === 'moderate' ? 'Medium' : 'High'}
                    </span>
                    <span className="text-zinc-400 ml-2">{SHOPPING_MODE_DESCRIPTIONS[settings.shoppingMode]}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Inventory & Expiry */}
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
              <button
                onClick={() => toggleSection('expiry')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-700/50 rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📦</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Inventory & Expiry</h3>
                    <p className="text-xs text-zinc-400">Use expiring items efficiently</p>
                  </div>
                </div>
                <span className="text-zinc-400">{expandedSections.has('expiry') ? '▼' : '▶'}</span>
              </button>

              {expandedSections.has('expiry') && (
                <div className="px-4 pb-4 space-y-3">
                  {(['soft', 'moderate', 'strong'] as ExpiryPriority[]).map(priority => (
                    <label key={priority} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="expiryPriority"
                        value={priority}
                        checked={settings.expiryPriority === priority}
                        onChange={(e) => setSettings({ ...settings, expiryPriority: e.target.value as ExpiryPriority })}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm text-white capitalize">{priority}</div>
                        <div className="text-xs text-zinc-400">{EXPIRY_PRIORITY_DESCRIPTIONS[priority]}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Cooking */}
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
              <button
                onClick={() => toggleSection('batch')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-700/50 rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🍲</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Batch Cooking</h3>
                    <p className="text-xs text-zinc-400">Cook once, eat multiple times</p>
                  </div>
                </div>
                <span className="text-zinc-400">{expandedSections.has('batch') ? '▼' : '▶'}</span>
              </button>

              {expandedSections.has('batch') && (
                <div className="px-4 pb-4 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.batchCookingEnabled}
                      onChange={(e) => setSettings({ ...settings, batchCookingEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-white">Enable batch cooking suggestions</span>
                  </label>

                  {settings.batchCookingEnabled && (
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Maximum leftover days: {settings.maxLeftoverDays}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="7"
                        value={settings.maxLeftoverDays}
                        onChange={(e) => setSettings({ ...settings, maxLeftoverDays: parseInt(e.target.value) })}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer with Save Button */}
        <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center justify-between">
          <div className="text-sm">
            {saveMessage && (
              <span className={saveMessage.startsWith('✓') ? 'text-green-400' : 'text-red-400'}>
                {saveMessage}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
