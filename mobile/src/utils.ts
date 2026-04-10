export function resolveAuthorFromUrl(url: string): string {
  if (/github\.com/i.test(url)) return 'github';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  return 'web';
}

export interface ShareParams {
  url: string;
  title: string;
  text: string;
}

export function parseShareParams(search: string): ShareParams {
  const params = new URLSearchParams(search);
  const url = params.get('url') || '';
  const title = params.get('title') || '';
  const text = params.get('text') || '';
  // Si no hi ha url, potser la URL ve dins de text
  const resolvedUrl = url || text;
  return { url: resolvedUrl, title, text: url ? text : '' };
}
