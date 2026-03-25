/** Twitter/X のツイートURLパターン */
const TWEET_URL_REGEX =
  /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/

/** URLがツイートURLかどうかを判定する */
export const isTweetUrl = (url: string): boolean => {
  return TWEET_URL_REGEX.test(url)
}

/** ツイートURLからツイートIDを抽出する */
export const extractTweetId = (url: string): string | null => {
  const match = url.match(TWEET_URL_REGEX)
  return match ? match[1] : null
}
