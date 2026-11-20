// TauriTavern-compatible implementation with no imports from SillyTavern internals.
// Starts one delayed top-scroll for each newly created assistant turn.
// It does not observe scroll events, so manual scrolling is never interrupted.

let pollTimer = null;
let retryTimer = null;
let scrollTimer = null;
let turnStarted = false;
let settled = false;
let lastAssistantNode = null;

function getMessages() {
    return [...document.querySelectorAll('#chat .mes, .mes')];
}

function getLatestMessage() {
    return getMessages().at(-1) || null;
}

function getLatestAssistant() {
    const latest = getLatestMessage();
    if (!latest) return null;
    if (latest.getAttribute('is_user') === 'true' || latest.getAttribute('is_system') === 'true') {
        return null;
    }
    return latest;
}

function clearTurn() {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = null;
    turnStarted = false;
    settled = false;
    lastAssistantNode = null;
}

function scrollLatestAssistantToTop() {
    scrollTimer = null;
    const message = getLatestAssistant();
    if (!message || !document.contains(message)) return;

    message.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior: 'auto'
    });
    settled = true;
    lastAssistantNode = message;
}

function beginTurn(message) {
    turnStarted = true;
    settled = false;
    lastAssistantNode = message;

    // TauriTavern may keep streaming or rebuild the message node. We wait
    // independently of those DOM changes, then use the newest assistant node.
    scrollTimer = setTimeout(scrollLatestAssistantToTop, 8000);
}

function poll() {
    const latest = getLatestMessage();
    if (!latest) return;

    const isUserOrSystem = latest.getAttribute('is_user') === 'true' ||
        latest.getAttribute('is_system') === 'true';

    if (isUserOrSystem) {
        if (turnStarted || settled) clearTurn();
        return;
    }

    const assistant = latest;
    if (!turnStarted) {
        beginTurn(assistant);
        return;
    }

    // If a completed/regenerated reply is replaced by a new DOM node, allow
    // one new delayed scroll. Normal manual scrolling keeps the same node and
    // therefore does not retrigger anything.
    if (settled && assistant !== lastAssistantNode) {
        beginTurn(assistant);
    }
}

function startPolling() {
    if (!document.getElementById('chat')) {
        retryTimer = setTimeout(startPolling, 500);
        return;
    }

    pollTimer = setInterval(poll, 500);
    poll();
    console.log('[TauriTavern Reply Top Scroll] enabled');
}

function init() {
    startPolling();
}

function exit() {
    if (pollTimer) clearInterval(pollTimer);
    if (retryTimer) clearTimeout(retryTimer);
    if (scrollTimer) clearTimeout(scrollTimer);
    pollTimer = null;
    retryTimer = null;
    scrollTimer = null;
    turnStarted = false;
    settled = false;
    lastAssistantNode = null;
}

export { init, exit };
