import { describe, it, expect, vi, beforeEach } from 'vitest'

// claudeService.ts does not exist yet — these tests will fail (RED phase)
// Once the implementation is written, all tests will pass (GREEN phase)

// Mock import.meta.env
vi.stubGlobal('importMeta', { env: { VITE_CLAUDE_PROXY_URL: 'http://localhost:3838' } })

describe('claudeService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('module exports processBookmarksWithClaude function', async () => {
    const mod = await import('./claudeService')
    expect(typeof mod.processBookmarksWithClaude).toBe('function')
  })

  it('does NOT export getTrialInfo', async () => {
    const mod = await import('./claudeService') as Record<string, unknown>
    expect(mod.getTrialInfo).toBeUndefined()
  })

  it('returns ProcessedTweetResult[] on successful proxy response', async () => {
    const mockResult = {
      originalId: '123',
      isAI: true,
      title: 'Test title',
      categories: ['AI'],
      externalLinks: ['https://example.com'],
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResult,
    }))

    const { processBookmarksWithClaude } = await import('./claudeService')
    const tweets = [{ id_str: '123', full_text: 'Hello world tweet about AI' }]
    const results = await processBookmarksWithClaude(
      tweets,
      ['AI', 'Tech'],
      () => {},
      () => {},
    )

    expect(results).toHaveLength(1)
    expect(results[0].originalId).toBe('123')
    expect(results[0].isAI).toBe(true)
  })

  it('creates fallback bookmark when proxy is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    const { processBookmarksWithClaude } = await import('./claudeService')
    const tweets = [{ id_str: '456', full_text: 'A tweet that fails to process via proxy' }]
    const results = await processBookmarksWithClaude(
      tweets,
      ['AI'],
      () => {},
      () => {},
    )

    expect(results).toHaveLength(1)
    expect(results[0].isAI).toBe(false)
    expect(results[0].categories).toContain('Altres')
    expect(results[0].originalId).toBe('456')
  })

  it('throws AbortError when signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const { processBookmarksWithClaude } = await import('./claudeService')
    const tweets = [{ id_str: '789', full_text: 'Some tweet' }]

    await expect(
      processBookmarksWithClaude(tweets, ['AI'], () => {}, () => {}, controller.signal)
    ).rejects.toThrow('Aborted')
  })
})
