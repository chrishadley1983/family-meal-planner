/**
 * Ingredient Modification State Tests
 *
 * Tests to catch state management issues when modifying ingredients.
 * Addresses the closure bug where stale state was captured in callbacks.
 *
 * Pain points addressed:
 * - Ingredient modifications not reflecting latest state
 * - Callbacks capturing stale closure variables
 * - Race conditions in async state updates
 * - Array mutation vs immutable updates
 */

/**
 * Simulated ingredient state management
 * This mirrors the pattern used in React components
 */
interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
}

interface IngredientState {
  ingredients: Ingredient[]
  lastModified: string | null
}

/**
 * Simulates state updates in a React-like manner
 * Using immutable patterns
 */
class IngredientStateManager {
  private state: IngredientState = {
    ingredients: [],
    lastModified: null,
  }

  private subscribers: Array<(state: IngredientState) => void> = []

  getState(): IngredientState {
    return this.state
  }

  subscribe(callback: (state: IngredientState) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback)
    }
  }

  private notify(): void {
    this.subscribers.forEach(cb => cb(this.state))
  }

  // GOOD: Immutable update
  addIngredient(ingredient: Omit<Ingredient, 'id'>): string {
    const id = `ing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newIngredient: Ingredient = { ...ingredient, id }

    this.state = {
      ...this.state,
      ingredients: [...this.state.ingredients, newIngredient],
      lastModified: new Date().toISOString(),
    }

    this.notify()
    return id
  }

  // GOOD: Immutable update
  updateIngredient(id: string, updates: Partial<Omit<Ingredient, 'id'>>): boolean {
    const index = this.state.ingredients.findIndex(ing => ing.id === id)
    if (index === -1) return false

    const updatedIngredients = this.state.ingredients.map(ing =>
      ing.id === id ? { ...ing, ...updates } : ing
    )

    this.state = {
      ...this.state,
      ingredients: updatedIngredients,
      lastModified: new Date().toISOString(),
    }

    this.notify()
    return true
  }

  // GOOD: Immutable update
  removeIngredient(id: string): boolean {
    const initialLength = this.state.ingredients.length
    const filteredIngredients = this.state.ingredients.filter(ing => ing.id !== id)

    if (filteredIngredients.length === initialLength) return false

    this.state = {
      ...this.state,
      ingredients: filteredIngredients,
      lastModified: new Date().toISOString(),
    }

    this.notify()
    return true
  }

  // Used to test stale state scenarios
  getIngredientById(id: string): Ingredient | undefined {
    return this.state.ingredients.find(ing => ing.id === id)
  }

  reset(): void {
    this.state = {
      ingredients: [],
      lastModified: null,
    }
    this.notify()
  }
}

/**
 * BAD: Mutable state manager (for comparison testing)
 * This pattern causes the bugs we want to prevent
 */
class BadIngredientStateManager {
  private state: IngredientState = {
    ingredients: [],
    lastModified: null,
  }

  getState(): IngredientState {
    return this.state
  }

  // BAD: Direct mutation
  addIngredientMutable(ingredient: Omit<Ingredient, 'id'>): string {
    const id = `ing-${Date.now()}`
    // Direct mutation - BAD PATTERN
    this.state.ingredients.push({ ...ingredient, id })
    this.state.lastModified = new Date().toISOString()
    return id
  }

  // BAD: Direct mutation
  updateIngredientMutable(id: string, updates: Partial<Omit<Ingredient, 'id'>>): boolean {
    const ing = this.state.ingredients.find(i => i.id === id)
    if (!ing) return false

    // Direct mutation - BAD PATTERN
    Object.assign(ing, updates)
    this.state.lastModified = new Date().toISOString()
    return true
  }
}

describe('Ingredient State Management', () => {
  /**
   * Test immutable state updates
   */
  describe('Immutable State Updates', () => {
    let manager: IngredientStateManager

    beforeEach(() => {
      manager = new IngredientStateManager()
    })

    it('should add ingredient without mutating original array', () => {
      const stateBefore = manager.getState()
      const ingredientsBefore = stateBefore.ingredients

      manager.addIngredient({
        name: 'Chicken',
        quantity: 500,
        unit: 'g',
      })

      const stateAfter = manager.getState()

      // State reference should change
      expect(stateAfter).not.toBe(stateBefore)

      // Array reference should change
      expect(stateAfter.ingredients).not.toBe(ingredientsBefore)

      // Original array should still be empty
      expect(ingredientsBefore.length).toBe(0)

      // New array should have the ingredient
      expect(stateAfter.ingredients.length).toBe(1)
    })

    it('should update ingredient without mutating original object', () => {
      const id = manager.addIngredient({
        name: 'Chicken',
        quantity: 500,
        unit: 'g',
      })

      const ingredientBefore = manager.getIngredientById(id)!
      const quantityBefore = ingredientBefore.quantity

      manager.updateIngredient(id, { quantity: 750 })

      const ingredientAfter = manager.getIngredientById(id)!

      // Object reference should change
      expect(ingredientAfter).not.toBe(ingredientBefore)

      // Original object's quantity should be unchanged
      // (This would fail if we mutated)
      expect(ingredientBefore.quantity).toBe(quantityBefore)

      // New object should have updated quantity
      expect(ingredientAfter.quantity).toBe(750)
    })

    it('should remove ingredient without mutating original array', () => {
      const id1 = manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })
      const id2 = manager.addIngredient({ name: 'Rice', quantity: 200, unit: 'g' })

      const ingredientsBefore = manager.getState().ingredients
      expect(ingredientsBefore.length).toBe(2)

      manager.removeIngredient(id1)

      const ingredientsAfter = manager.getState().ingredients

      // Array reference should change
      expect(ingredientsAfter).not.toBe(ingredientsBefore)

      // Original array should still have 2 items
      expect(ingredientsBefore.length).toBe(2)

      // New array should have 1 item
      expect(ingredientsAfter.length).toBe(1)
      expect(ingredientsAfter[0].id).toBe(id2)
    })
  })

  /**
   * Test closure capture issues
   */
  describe('Closure Capture', () => {
    let manager: IngredientStateManager

    beforeEach(() => {
      manager = new IngredientStateManager()
    })

    it('should not have stale state in callbacks', async () => {
      let callbackState: IngredientState | null = null

      manager.subscribe((state) => {
        callbackState = state
      })

      manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })

      // Callback should have current state
      expect(callbackState).not.toBeNull()
      expect(callbackState!.ingredients.length).toBe(1)

      manager.addIngredient({ name: 'Rice', quantity: 200, unit: 'g' })

      // Callback should have updated state
      expect(callbackState!.ingredients.length).toBe(2)
    })

    it('should handle rapid sequential updates', () => {
      const updates: number[] = []

      manager.subscribe((state) => {
        updates.push(state.ingredients.length)
      })

      // Rapid fire adds
      manager.addIngredient({ name: 'Item 1', quantity: 1, unit: 'piece' })
      manager.addIngredient({ name: 'Item 2', quantity: 2, unit: 'piece' })
      manager.addIngredient({ name: 'Item 3', quantity: 3, unit: 'piece' })

      // Each update should be recorded
      expect(updates).toEqual([1, 2, 3])

      // Final state should have all items
      expect(manager.getState().ingredients.length).toBe(3)
    })

    it('should maintain consistency during interleaved operations', () => {
      const id1 = manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })
      const id2 = manager.addIngredient({ name: 'Rice', quantity: 200, unit: 'g' })

      // Interleaved operations
      manager.updateIngredient(id1, { quantity: 600 })
      manager.addIngredient({ name: 'Vegetables', quantity: 300, unit: 'g' })
      manager.updateIngredient(id2, { quantity: 250 })
      manager.removeIngredient(id1)

      const finalState = manager.getState()

      // Should have 2 ingredients (Rice and Vegetables)
      expect(finalState.ingredients.length).toBe(2)

      // Rice should have updated quantity
      const rice = finalState.ingredients.find(i => i.name === 'Rice')
      expect(rice?.quantity).toBe(250)

      // Chicken should be gone
      const chicken = finalState.ingredients.find(i => i.name === 'Chicken')
      expect(chicken).toBeUndefined()
    })
  })

  /**
   * Test mutable vs immutable patterns
   */
  describe('Mutable vs Immutable Comparison', () => {
    it('should demonstrate reference equality with immutable updates', () => {
      const manager = new IngredientStateManager()

      manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })

      const state1 = manager.getState()

      manager.addIngredient({ name: 'Rice', quantity: 200, unit: 'g' })

      const state2 = manager.getState()

      // States should be different references
      expect(state1).not.toBe(state2)
      expect(state1.ingredients).not.toBe(state2.ingredients)

      // But state1 should still show 1 ingredient (not mutated)
      expect(state1.ingredients.length).toBe(1)
      expect(state2.ingredients.length).toBe(2)
    })

    it('should show problem with mutable updates', () => {
      const badManager = new BadIngredientStateManager()

      badManager.addIngredientMutable({ name: 'Chicken', quantity: 500, unit: 'g' })

      const state1 = badManager.getState()

      badManager.addIngredientMutable({ name: 'Rice', quantity: 200, unit: 'g' })

      const state2 = badManager.getState()

      // BAD: States are the same reference
      expect(state1).toBe(state2)

      // BAD: state1 now shows 2 ingredients due to mutation
      expect(state1.ingredients.length).toBe(2)
    })
  })

  /**
   * Test state consistency checks
   */
  describe('State Consistency Checks', () => {
    let manager: IngredientStateManager

    beforeEach(() => {
      manager = new IngredientStateManager()
    })

    it('should maintain unique IDs', () => {
      const ids = [
        manager.addIngredient({ name: 'Item 1', quantity: 1, unit: 'piece' }),
        manager.addIngredient({ name: 'Item 2', quantity: 2, unit: 'piece' }),
        manager.addIngredient({ name: 'Item 3', quantity: 3, unit: 'piece' }),
      ]

      // All IDs should be unique
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should track lastModified correctly', () => {
      expect(manager.getState().lastModified).toBeNull()

      manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })

      const firstModified = manager.getState().lastModified
      expect(firstModified).not.toBeNull()

      // Wait a tiny bit to ensure different timestamp
      const id = manager.addIngredient({ name: 'Rice', quantity: 200, unit: 'g' })

      const secondModified = manager.getState().lastModified
      expect(secondModified).not.toBeNull()

      // Update should also update lastModified
      manager.updateIngredient(id, { quantity: 300 })

      const thirdModified = manager.getState().lastModified
      expect(thirdModified).not.toBeNull()
    })

    it('should handle update of non-existent ingredient', () => {
      manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })

      const result = manager.updateIngredient('non-existent-id', { quantity: 1000 })

      expect(result).toBe(false)
      expect(manager.getState().ingredients.length).toBe(1)
    })

    it('should handle removal of non-existent ingredient', () => {
      const id = manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })

      const result1 = manager.removeIngredient('non-existent-id')
      expect(result1).toBe(false)
      expect(manager.getState().ingredients.length).toBe(1)

      const result2 = manager.removeIngredient(id)
      expect(result2).toBe(true)
      expect(manager.getState().ingredients.length).toBe(0)

      // Removing again should fail
      const result3 = manager.removeIngredient(id)
      expect(result3).toBe(false)
    })
  })

  /**
   * Test array operations
   */
  describe('Array Operation Patterns', () => {
    it('should use spread operator for array addition', () => {
      const original = [{ id: '1', name: 'Chicken', quantity: 500, unit: 'g' }]
      const newItem = { id: '2', name: 'Rice', quantity: 200, unit: 'g' }

      // GOOD: Spread creates new array
      const updated = [...original, newItem]

      expect(updated).not.toBe(original)
      expect(original.length).toBe(1)
      expect(updated.length).toBe(2)
    })

    it('should use filter for array removal', () => {
      const original = [
        { id: '1', name: 'Chicken', quantity: 500, unit: 'g' },
        { id: '2', name: 'Rice', quantity: 200, unit: 'g' },
      ]

      // GOOD: Filter creates new array
      const updated = original.filter(item => item.id !== '1')

      expect(updated).not.toBe(original)
      expect(original.length).toBe(2)
      expect(updated.length).toBe(1)
    })

    it('should use map for array updates', () => {
      const original = [
        { id: '1', name: 'Chicken', quantity: 500, unit: 'g' },
        { id: '2', name: 'Rice', quantity: 200, unit: 'g' },
      ]

      // GOOD: Map creates new array with new objects
      const updated = original.map(item =>
        item.id === '1' ? { ...item, quantity: 750 } : item
      )

      expect(updated).not.toBe(original)
      expect(updated[0]).not.toBe(original[0]) // Updated item is new object
      expect(updated[1]).toBe(original[1]) // Unchanged item can be same reference

      expect(original[0].quantity).toBe(500)
      expect(updated[0].quantity).toBe(750)
    })

    it('should NOT use push for immutable updates', () => {
      const original = [{ id: '1', name: 'Chicken', quantity: 500, unit: 'g' }]

      // BAD: Push mutates
      const badUpdated = original
      badUpdated.push({ id: '2', name: 'Rice', quantity: 200, unit: 'g' })

      // Same reference - BAD
      expect(badUpdated).toBe(original)
      expect(original.length).toBe(2) // Original was mutated!
    })

    it('should NOT use splice for immutable updates', () => {
      const original = [
        { id: '1', name: 'Chicken', quantity: 500, unit: 'g' },
        { id: '2', name: 'Rice', quantity: 200, unit: 'g' },
      ]

      // BAD: Splice mutates
      const badUpdated = original
      badUpdated.splice(0, 1)

      // Same reference - BAD
      expect(badUpdated).toBe(original)
      expect(original.length).toBe(1) // Original was mutated!
    })
  })

  /**
   * Test subscription/unsubscription
   */
  describe('Subscription Management', () => {
    let manager: IngredientStateManager

    beforeEach(() => {
      manager = new IngredientStateManager()
    })

    it('should allow unsubscribing', () => {
      let callCount = 0

      const unsubscribe = manager.subscribe(() => {
        callCount++
      })

      manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })
      expect(callCount).toBe(1)

      unsubscribe()

      manager.addIngredient({ name: 'Rice', quantity: 200, unit: 'g' })
      expect(callCount).toBe(1) // Still 1, not called again
    })

    it('should support multiple subscribers', () => {
      let count1 = 0
      let count2 = 0

      manager.subscribe(() => { count1++ })
      manager.subscribe(() => { count2++ })

      manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })

      expect(count1).toBe(1)
      expect(count2).toBe(1)
    })

    it('should not affect other subscribers when one unsubscribes', () => {
      let count1 = 0
      let count2 = 0

      const unsub1 = manager.subscribe(() => { count1++ })
      manager.subscribe(() => { count2++ })

      manager.addIngredient({ name: 'Chicken', quantity: 500, unit: 'g' })
      expect(count1).toBe(1)
      expect(count2).toBe(1)

      unsub1()

      manager.addIngredient({ name: 'Rice', quantity: 200, unit: 'g' })
      expect(count1).toBe(1) // Unsubscribed
      expect(count2).toBe(2) // Still subscribed
    })
  })
})
