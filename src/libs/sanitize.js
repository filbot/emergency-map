const HTML_ESCAPE_LOOKUP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

const HTML_ESCAPE_REGEX = /[&<>"']/g;

export function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value).replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_LOOKUP[char] ?? char);
}
