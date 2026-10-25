import { nextTick, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * Focus what becomes available after a form state changes: the action once an answer is
 * corrected, the answer of the next exercise, and the heading of the result once the round is
 * done. Leaving the result for another round brings the focus back to the first answer.
 */
export function useFocusOnChange(state: Ref<unknown>, done?: Ref<boolean>) {
  watch([state, () => done?.value], async ([value, finished]) => {
    await nextTick()
    const selector = finished ? '[data-focus-result]' : value ? '[data-focus-target]' : '[data-focus-input]'
    const target = [...document.querySelectorAll<HTMLElement>(selector)].find(element => element.isConnected)

    target?.focus()
  })
}
