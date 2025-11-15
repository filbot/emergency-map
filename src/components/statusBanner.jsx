import { memo } from 'react';
import './statusBanner.css';

/**
 * Renders a dismissible status banner for background service issues.
 * @param {Object} props React props.
 * @param {Array<Object>} [props.errors] Collection of active errors to surface.
 * @param {(error: Object) => void} [props.onRetry] Optional retry handler injected per error.
 * @returns {JSX.Element|null}
 */
function StatusBanner({ errors = [], onRetry }) {
    if (!Array.isArray(errors) || errors.length === 0) {
        return null;
    }

    const hasRetryHandler = typeof onRetry === 'function';

    return (
        <section className="status-banner" role="status" aria-live="polite">
            <div className="status-banner__icon" aria-hidden="true">!</div>
            <div className="status-banner__body">
                <h2 className="status-banner__title">We&apos;re working on reconnecting</h2>
                <ul className="status-banner__list">
                    {errors.map((error) => {
                        const key = error.id ?? error.source ?? error.message;
                        return (
                            <li key={key} className="status-banner__item">
                                <p className="status-banner__label">{error.friendlyName ?? 'Service'}</p>
                                <p className="status-banner__message">{error.message}</p>
                                {error.detail && (
                                    <details className="status-banner__details">
                                        <summary>Technical info</summary>
                                        <pre>{error.detail}</pre>
                                    </details>
                                )}
                                {error.canRetry && hasRetryHandler && (
                                    <button
                                        type="button"
                                        className="status-banner__action"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            onRetry(error);
                                        }}
                                        disabled={Boolean(error.isRetrying)}
                                    >
                                        {error.isRetrying ? 'Trying again...' : 'Try again now'}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}

export default memo(StatusBanner);
