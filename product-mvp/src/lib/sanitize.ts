import sanitizeHtml from 'sanitize-html'

export function sanitizeNickname(name: string): string {
  return sanitizeHtml(name, { allowedTags: [], allowedAttributes: {} }).trim()
}

export function sanitizeBody(html: string | null | undefined): string | null {
  if (!html) return null

  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 's', 'u',
      'h1', 'h2', 'h3',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code', 'hr',
      'span', 'a', 'div',
      'mark',
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'span': ['style', 'class'],
      'div': ['class'],
      'p': ['style'],
      'h1': ['style'],
      'h2': ['style'],
      'h3': ['style'],
      'mark': ['data-color', 'style'],
    },
    allowedStyles: {
      '*': {
        'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/],
        'text-align': [/^(left|right|center|justify)$/],
        'font-family': [/^[a-zA-Z0-9\s,'-]+$/],
      },
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: {
      'a': ['https', 'http', 'mailto'],
    },
    allowedClasses: {
      'div': ['sms-bubble'],
      'p': ['sms-meta'],
      'span': ['ooc-spoiler'],
    },
    transformTags: {
      'a': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    },
  })
}
