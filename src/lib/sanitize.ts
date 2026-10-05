import DOMPurify from 'dompurify';

export function sanitizeHtml(rawHtml: string): string {
  if (typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'a', 'b', 'i', 'strong', 'em', 'strike', 's', 'del', 'code', 'pre',
        'blockquote', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'br', 'img', 'span', 'div', 'input', 'sub', 'sup', 'mark'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
        'type', 'checked', 'disabled', 'width', 'height', 'data-task'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|blob|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ALLOW_DATA_ATTR: true,
    });
  }
  return rawHtml;
}

