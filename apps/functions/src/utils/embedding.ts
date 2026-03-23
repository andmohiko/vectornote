/** 埋め込み対象テキストを生成する */
export const buildEmbeddingText = (
  title: string | null,
  content: string,
  keywords: string,
  tags: string[],
): string =>
  [title || '', content || '', keywords || '', ...(tags || [])]
    .filter(Boolean)
    .join(' ')
