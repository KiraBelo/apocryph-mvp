import sanitizeHtml from 'sanitize-html'

export function sanitizeBody(html: string | null | undefined): string | null {
  if (!html) return null

  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 's', 'u',
      'h1', 'h2', 'h3',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code', 'hr',
      'span', 'a', 'div',
      'iframe',
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'span': ['style'],
      'div': ['class'],
      'p': ['style'],
      'h1': ['style'],
      'h2': ['style'],
      'h3': ['style'],
      'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowtransparency', 'style'],
    },
    allowedStyles: {
      '*': {
        'color': [/.*/],
        'background-color': [/.*/],
        'font-family': [/.*/],
        'text-align': [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: {
      'a': ['https', 'http', 'mailto'],
    },
    allowedIframeHostnames: ['open.spotify.com', 'music.yandex.ru'],
    allowedClasses: {
      'div': ['sms-bubble'],
      'p': ['sms-meta'],
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
      'iframe': (tagName, attribs) => {
        const src = attribs.src ?? ''
        const allowed =
          src.startsWith('https://open.spotify.com/embed/') ||
          src.startsWith('https://music.yandex.ru/iframe/')
        if (!allowed) return { tagName: 'span', attribs: {} }
        return { tagName, attribs }
      },
    },
  })
}
