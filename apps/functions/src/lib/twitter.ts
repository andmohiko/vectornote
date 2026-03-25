type TweetOembedResponse = {
  html: string
  author_name: string
  author_url: string
  url: string
}

export type TweetInfo = {
  authorName: string
  screenName: string
  text: string
}

/** oEmbed レスポンスの HTML からツイート本文を抽出する */
const extractTweetText = (html: string): string | null => {
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/)
  if (!pMatch) return null

  return pMatch[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/** author_url からスクリーンネームを抽出する */
const extractScreenName = (authorUrl: string): string | null => {
  const match = authorUrl.match(
    /https?:\/\/(?:twitter\.com|x\.com)\/(\w+)/,
  )
  return match ? match[1] : null
}

/** Twitter oEmbed API を使用してツイート情報を取得する */
export const fetchTweetInfo = async (
  url: string,
): Promise<TweetInfo | null> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
    const response = await fetch(oembedUrl, {
      signal: controller.signal,
    })

    if (!response.ok) return null

    const data = (await response.json()) as TweetOembedResponse
    const screenName = extractScreenName(data.author_url)
    const text = extractTweetText(data.html)

    if (!screenName || !text) return null

    return { authorName: data.author_name, screenName, text }
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
