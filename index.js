// TauriTavern-compatible implementation with no imports from SillyTavern internals.
// Locates the actual scroll container and moves it to the newest assistant reply.
// A short correction window handles TauriTavern's final layout update, then stops.

let pollTimer = null;
let retryTimer = null;
let scrollTimer = null;
let correctionTimer = null;
let turnStarted = false;
let settled = false;
let lastAssistantNode = null;
let correctionCount = 0;

function getMessages() {
    const scoped = [...document.querySelectorAll('#chat .mes')];
    return scoped.length ? scoped : [...document.querySelectorAll('.mes')];
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

function findScrollContainer(message) {
    let element = message.parentElement;
    while (element && element !== document.body) {
        const style = getComputedStyle(element);
        const scrollable = ['auto', 'scroll', 'overlay'].includes(style.overflowY);
        if (scrollable && element.scrollHeight > element.clientHeight + 2) {
            return element;
        }
        element = element.parentElement;
    }
    return document.scrollingElement || document.documentElement;
}

function moveReplyToTop(message) {
    if (!message || !document.contains(message)) return;

    const container = findScrollContainer(message);
    const messageRect = message.getBoundingClientRect();

    if (container === document.scrollingElement || container === document.documentElement) {
        const top = messageRect.top + window.scrollY;
        window.scrollTo({ top: Math.max(0, top - 4), behavior: 'auto' });
    } else {
        const containerRect = container.getBoundingClientRect();
        const top = container.scrollTop + messageRect.top - containerRect.top;
        container.scrollTop = Math.max(0, top - 4);
    }
}

function clearTurn() {
    if (scrollTimer) clearTimeout(scrollTimer);
    if (correctionTimer) clearInterval(correctionTimer);
    scrollTimer = null;
    correctionTimer = null;
    turnStarted = false;
    settled = false;
    lastAssistantNode = null;
    correctionCount = 0;
}

function correctLatestReply() {
    const message = getLatestAssistant();
    if (!message) return;

    moveReplyToTop(message);
    correctionCount += 1;
    if (correctionCount >= 4) {
        if (correctionTimer) clearInterval(correctionTimer);
        correctionTimer = null;
        settled = true;
        lastAssistantNode = message;
    }
}

function scrollLatestAssistantToTop() {
    scrollTimer = null;
    correctionCount = 0;
    correctLatestReply();
    correctionTimer = setInterval(correctLatestReply, 1000);
}

function beginTurn(message) {
    turnStarted = true;
    settled = false;
    lastAssistantNode = message;
    // Three seconds gives a quick response while the correction window handles
    // any later layout changes during streaming.
    scrollTimer = setTimeout(scrollLatestAssistantToTop, 3000);
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
    if (correctionTimer) clearInterval(correctionTimer);
    pollTimer = null;
    retryTimer = null;
    scrollTimer = null;
    correctionTimer = null;
    turnStarted = false;
    settled = false;
    lastAssistantNode = null;
    correctionCount = 0;
}

export { init, exit };
