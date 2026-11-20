// TauriTavern-compatible implementation with no imports from SillyTavern internals.
// Polls the newest assistant reply until its text is quiet, then scrolls to its top once.
// It never listens to scroll events, so manual scrolling cannot create an auto-scroll loop.

let pollTimer = null;
let retryTimer = null;
let currentMessage = null;
let settledMessage = null;
let lastFingerprint = '';
let stableSince = 0;

function getCurrentAssistantMessage() {
    const messages = [...document.querySelectorAll('#chat .mes, .mes')];
    const last = messages.at(-1);
    if (!last) return null;

    // If the newest message is the user's message (or a system message), do not
    // scroll the previous assistant reply while the user is composing/sending.
    if (last.getAttribute('is_user') === 'true' || last.getAttribute('is_system') === 'true') {
        return null;
    }
    return last;
}

function getMessageKey(message) {
    return message.getAttribute('mesid') || message.getAttribute('data-mesid') || message;
}

function getFingerprint(message) {
    const text = message.querySelector('.mes_text') || message;
    const value = text.textContent || '';
    return value.length + ':' + value.slice(-160);
}

function pollReply() {
    const message = getCurrentAssistantMessage();
    if (!message) {
        currentMessage = null;
        lastFingerprint = '';
        stableSince = 0;
        return;
    }

    const key = getMessageKey(message);
    if (key !== currentMessage) {
        currentMessage = key;
        settledMessage = null;
        lastFingerprint = getFingerprint(message);
        stableSince = Date.now();
        return;
    }

    if (key === settledMessage) return;

    const fingerprint = getFingerprint(message);
    if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        stableSince = Date.now();
        return;
    }

    // Wait for a quiet period after the last streamed text change. This lets
    // TauriTavern finish its own automatic scroll-to-bottom first.
    if (Date.now() - stableSince < 6000) return;

    if (document.contains(message)) {
        message.scrollIntoView({
            block: 'start',
            inline: 'nearest',
            behavior: 'auto'
        });
        settledMessage = key;
    }
}

function startPolling() {
    if (!document.getElementById('chat')) {
        retryTimer = setTimeout(startPolling, 500);
        return;
    }

    pollTimer = setInterval(pollReply, 500);
    pollReply();
    console.log('[TauriTavern Reply Top Scroll] enabled');
}

function init() {
    startPolling();
}

function exit() {
    if (pollTimer) clearInterval(pollTimer);
    if (retryTimer) clearTimeout(retryTimer);
    pollTimer = null;
    retryTimer = null;
    currentMessage = null;
    settledMessage = null;
    lastFingerprint = '';
    stableSince = 0;
}

export { init, exit };
