import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import DefaultLayout from '../app/layouts/default.vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

function promptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as InstallPromptEvent
  const prompt = vi.fn<InstallPromptEvent['prompt']>().mockResolvedValue(undefined)
  let choose: (choice: { outcome: 'accepted' | 'dismissed', platform: string }) => void
  const userChoice = new Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>((resolve) => {
    choose = resolve
  })

  Object.assign(event, { prompt, userChoice })

  return { event, prompt, choose: () => choose({ outcome, platform: '' }) }
}

describe('visible app installation', () => {
  it('does not show the install action without a browser offer', async () => {
    const layout = await mountSuspended(DefaultLayout)

    expect(layout.find('button[aria-label="Instalar app"]').exists()).toBe(false)
    layout.unmount()
  })

  it('shows an accessible action when the browser offers installation', async () => {
    const layout = await mountSuspended(DefaultLayout)
    const { event } = promptEvent()

    window.dispatchEvent(event)
    await flushPromises()

    const button = layout.find('button[aria-label="Instalar app"]')

    expect(event.defaultPrevented).toBe(true)
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('Instalar app')
    layout.unmount()
  })

  it.each(['accepted', 'dismissed'] as const)('prompts once and hides after the user %s', async (outcome) => {
    const layout = await mountSuspended(DefaultLayout)
    const prompt = promptEvent(outcome)

    window.dispatchEvent(prompt.event)
    await flushPromises()
    const button = layout.find('button[aria-label="Instalar app"]')

    button.element.dispatchEvent(new MouseEvent('click'))
    button.element.dispatchEvent(new MouseEvent('click'))

    expect(prompt.prompt).toHaveBeenCalledOnce()

    prompt.choose()
    await flushPromises()

    expect(layout.find('button[aria-label="Instalar app"]').exists()).toBe(false)
    layout.unmount()
  })

  it('hides the action when the app is installed', async () => {
    const layout = await mountSuspended(DefaultLayout)
    const { event } = promptEvent()

    window.dispatchEvent(event)
    await flushPromises()
    window.dispatchEvent(new Event('appinstalled'))
    await flushPromises()

    expect(layout.find('button[aria-label="Instalar app"]').exists()).toBe(false)
    layout.unmount()
  })
})
