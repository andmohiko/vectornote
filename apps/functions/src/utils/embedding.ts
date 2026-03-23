/** 埋め込み対象テキストを生成する */
export const buildEmbeddingText = (
  title: string | null,
  content: string,
  keywords: string,
  tags: string[],
  ogpTitle?: string | null,
  ogpDescription?: string | null,
): string =>
  [title || '', content || '', keywords || '', ...(tags || []), ogpTitle || '', ogpDescription || '']
    .filter(Boolean)
    .join(' ')
