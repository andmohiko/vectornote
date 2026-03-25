import { isTweetUrl } from '@vectornote/common'
import type { TweetInfo } from '~/lib/twitter'
import { fetchTweetInfo } from '~/lib/twitter'
import { extractFirstUrl } from '~/utils/ogp'

/** ツイート引用ブロックを生成する */
const buildTweetQuoteBlock = (info: TweetInfo): string => {
  return `> ${info.authorName} (@${info.screenName})\n> ${info.text}`
}

/** content 内のツイートURLの直前に引用ブロックを挿入する */
export const insertTweetQuote = async (
  content: string,
): Promise<{ content: string; changed: boolean }> => {
  const url = extractFirstUrl(content)
  if (!url || !isTweetUrl(url)) {
    return { content, changed: false }
  }

  // 既に引用が挿入済みならスキップ（URLの直前に引用ブロックがある）
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const alreadyInserted = new RegExp(
    `> .+ \\(@\\w+\\)\\n>[^\\n]+\\n${escaped}`,
  )
  if (alreadyInserted.test(content)) {
    return { content, changed: false }
  }

  const info = await fetchTweetInfo(url)
  if (!info) {
    return { content, changed: false }
  }

  const quoteBlock = buildTweetQuoteBlock(info)
  const updatedContent = content.replace(url, `${quoteBlock}\n${url}`)
  return { content: updatedContent, changed: true }
}
