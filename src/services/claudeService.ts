import type { TweetRaw, ProcessedTweetResult } from '../types'

const BATCH_SIZE = 1
const MAX_RETRIES = 3
const DELAY_MS = 2000
const TIMEOUT_MS = 90000

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const sanitizeText = (text: string): string => {
  return text
    .replace(/#\w+/g, '')           // Remove hashtags
    .replace(/@\w+/g, '')           // Remove mentions
    .replace(/[\r\n]+/g, ' ')       // Replace newlines with spaces
    .replace(/\t/g, ' ')            // Replace tabs with spaces
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ')           // Compress multiple spaces
    .trim()
    .substring(0, 700)              // Truncate to 700 chars
}

export const processBookmarksWithClaude = async (
  rawTweets: TweetRaw[],
  currentCategories: string[],
  onProgress: (current: number, total: number) => void,
  onLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void,
  signal?: AbortSignal
): Promise<ProcessedTweetResult[]> => {
  const proxyUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLAUDE_PROXY_URL)
    ? import.meta.env.VITE_CLAUDE_PROXY_URL as string
    : 'https://ailinksdb.masellas.info/api'

  const results: ProcessedTweetResult[] = []
  const validTweets = rawTweets.filter(t => t.full_text || t.text)

  for (let i = 0; i < validTweets.length; i += BATCH_SIZE) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const tweet = validTweets[i]
    const tweetId = tweet.id_str || tweet.id || Math.random().toString()
    const tweetText = tweet.full_text || tweet.text || ''
    const tweetUrls = tweet.entities?.urls?.map(u => u.expanded_url) || []

    onProgress(i, validTweets.length)
    onLog(`Analitzant tweet ${i + 1} de ${validTweets.length}...`, 'info')

    let attempts = 0
    let success = false

    while (attempts < MAX_RETRIES && !success) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      try {
        const response = await fetch(`${proxyUrl}/process-tweet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tweet: {
              id: tweetId,
              text: sanitizeText(tweetText),
              urls: tweetUrls,
            },
            categories: currentCategories,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json() as ProcessedTweetResult
        results.push(result)
        success = true
        onLog('Tweet processat correctament', 'success')

      } catch (error: unknown) {
        attempts++
        const errorMessage = error instanceof Error ? error.message : String(error)

        if (attempts < MAX_RETRIES) {
          onLog(`Reintentant (intent ${attempts}/${MAX_RETRIES}): ${errorMessage}`, 'warning')
          await delay(DELAY_MS)
        }
      }
    }

    if (!success) {
      const fallbackTitle = tweetText.length > 80
        ? tweetText.substring(0, 77) + '...'
        : tweetText || 'Tweet sense processar'

      const fallbackResult: ProcessedTweetResult = {
        originalId: tweetId,
        isAI: false,
        title: fallbackTitle,
        categories: ['Altres'],
        externalLinks: tweetUrls.filter(
          url => !url.includes('twitter.com') && !url.includes('x.com')
        ),
      }

      results.push(fallbackResult)
      onLog('⚠️ No s\'ha pogut processar el tweet via proxy. Creant entrada de reserva...', 'warning')
    }
  }

  onProgress(validTweets.length, validTweets.length)
  return results
}
