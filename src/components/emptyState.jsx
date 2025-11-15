import './emptyState.css';

/**
 * Lightweight status notice used to explain empty data states.
 * @param {Object} props React props.
 * @param {string} props.title Short message headline.
 * @param {string} [props.body] Optional supporting copy.
 * @param {string} [props.hint] Additional hint or action text.
 * @param {string} [props.icon='!'] Character to display inside the badge.
 * @param {('map'|'panel')} [props.context='panel'] Layout variant that controls positioning.
 * @param {('info'|'warning'|'loading')} [props.tone='info'] Visual tone for the notice.
 * @returns {JSX.Element}
 */
export default function EmptyState({
    title,
    body = '',
    hint = '',
    icon = '!',
    context = 'panel',
    tone = 'info'
}) {
    if (!title) {
        return null;
    }

    return (
        <section
            className={`empty-state empty-state--${context} empty-state--${tone}`}
            role="status"
            aria-live="polite"
        >
            <span className="empty-state__icon" aria-hidden="true">{icon}</span>
            <div className="empty-state__content">
                <p className="empty-state__title">{title}</p>
                {body && <p className="empty-state__body">{body}</p>}
                {hint && <p className="empty-state__hint">{hint}</p>}
            </div>
        </section>
    );
}
