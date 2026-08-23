import { nextTick, watch } from 'vue'
import type { Ref } from 'vue'

/** Focus the action that becomes available after a form state changes. */
export function useFocusOnChange(state: Ref<unknown>) {
  watch(state, async (value) => {
    await nextTick()
    const selector = value ? '[data-focus-target]' : '[data-focus-input]'
    const target = [...document.querySelectorAll<HTMLElement>(selector)].find(element => element.isConnected)

    target?.focus()
  })
}
