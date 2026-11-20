// TauriTavern-compatible implementation with no imports from SillyTavern internals.
// Waits until the assistant message stops changing, then scrolls once.
// Manual scrolling does not mutate the message text and is never intercepted.
let chatObserver = null;
let messageObserver = null;
let retryTimer = null;
let settleTimer = null;
let observedMessage = null;

function getLastAssistantMessage() {
    const messages = [...document.querySelectorAll('#chat .mes, .mes')];
    const last = messages.at(-1);
    if (!last) return null;
    if (last.getAttribute('is_user') === 'true' || last.getAttribute('is_system') === 'true') return null;
    return last;
}

function scrollToReplyTop() {
    const message = getLastAssistantMessage();
    if (message && document.contains(message)) {
        message.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
    }
}

function scheduleAfterTextSettles() {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
        settleTimer = null;
        scrollToReplyTop();
    }, 1200);
}

function observeLatestMessage() {
    const message = getLastAssistantMessage();
    if (!message || message === observedMessage) return;
    observedMessage = message;

    messageObserver?.disconnect();
    const text = message.querySelector('.mes_text') || message;
    messageObserver = new MutationObserver(scheduleAfterTextSettles);
    messageObserver.observe(text, {
        childList: true,
        subtree: true,
        characterData: true
    });

    // Allow the stream to render, then position the completed reply.
    scheduleAfterTextSettles();
}

function onChatStructureChange(mutations) {
    if (mutations.some(mutation => [...mutation.addedNodes].some(node =>
        node instanceof Element && (node.matches('.mes') || node.querySelector('.mes'))
    ))) {
        observeLatestMessage();
    }
}

function startObserver() {
    const chat = document.getElementById('chat');
    if (!chat) {
        retryTimer = setTimeout(startObserver, 500);
        return;
    }

    chatObserver = new MutationObserver(onChatStructureChange);
    chatObserver.observe(chat, { childList: true, subtree: true });
    console.log('[TauriTavern Reply Top Scroll] enabled');
}

function init() {
    startObserver();
}

function exit() {
    chatObserver?.disconnect();
    messageObserver?.disconnect();
    chatObserver = null;
    messageObserver = null;
    if (retryTimer) clearTimeout(retryTimer);
    if (settleTimer) clearTimeout(settleTimer);
    retryTimer = null;
    settleTimer = null;
    observedMessage = null;
}

export { init, exit };
