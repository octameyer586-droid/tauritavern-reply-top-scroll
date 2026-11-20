// TauriTavern-compatible reply positioning.
// Native auto-scroll should be disabled so this extension is the only scroll owner.
// It positions an already-open chat once, then handles each new assistant turn once.

let pollTimer = null;
let retryTimer = null;
let scrollTimer = null;
let correctionTimer = null;
let turnStarted = false;
let settled = false;
let initialHandled = false;
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

    // Fallback for WebView layouts where the scroll owner is not exposed through
    // computed overflow styles.
    if (message.getBoundingClientRect().top > window.innerHeight * 0.65) {
        message.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
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

function scrollInitialChatToLatest() {
    const message = getLatestMessage();
    if (!message) return;
    moveReplyToTop(message);
}

function beginTurn(message, delay = 3000) {
    turnStarted = true;
    settled = false;
    lastAssistantNode = message;
    scrollTimer = setTimeout(scrollLatestAssistantToTop, delay);
}

function poll() {
    const latest = getLatestMessage();
    if (!latest) return;

    // Existing chats open at the first message by default on TauriTavern.
    // Handle that once, independently of whether the latest message is user
    // or assistant content.
    if (!initialHandled) {
        initialHandled = true;
        setTimeout(scrollInitialChatToLatest, 300);
    }

    const isUserOrSystem = latest.getAttribute('is_user') === 'true' ||
        latest.getAttribute('is_system') === 'true';

    if (isUserOrSystem) {
        if (turnStarted || settled) clearTurn();
        return;
    }

    const assistant = latest;
    if (!turnStarted) {
        beginTurn(assistant, 3000);
        return;
    }

    if (settled && assistant !== lastAssistantNode) {
        beginTurn(assistant, 3000);
    }
}

function startPolling() {
    if (!document.getElementById('chat')) {
        retryTimer = setTimeout(startPolling, 500);
        return;
    }

    pollTimer = setInterval(poll, 250);
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
    initialHandled = false;
    lastAssistantNode = null;
    correctionCount = 0;
}

export { init, exit };
