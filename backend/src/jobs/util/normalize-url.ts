/** Bare domains (no scheme) aren't valid `fetch()` targets — default to https:// rather
 *  than surfacing a confusing "Failed to parse URL" error for the common "google.com" case. */
export function normalizeUrl(url: string): string {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) {
    return url;
  }
  // Protocol-relative ("//example.com") already has the authority slashes — only
  // the scheme itself is missing, so prepending the full "https://" would double
  // them up (`https:////example.com`, harmless but needlessly ugly once stored).
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return `https://${url}`;
}
