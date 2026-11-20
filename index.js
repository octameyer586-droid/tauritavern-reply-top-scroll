// TauriTavern-compatible implementation with no imports from SillyTavern internals.
// Scrolls once when a new assistant message node is added, then never fights
// the user's manual scrolling for that same message.
let observer = null;
let retryTimer = null;
let lastHandledMessageId = null;

function getLastAssistantMessage() {
    const messages = [...document.querySelectorAll('#chat .mes, .mes')];
    const last = messages.at(-1);
    if (!last) return null;
    if (last.getAttribute('is_user') === 'true' || last.getAttribute('is_system') === 'true') return null;
    return last;
}

function scrollNewReplyOnce() {
    const message = getLastAssistantMessage();
    if (!message || !document.contains(message)) return;

    const id = message.getAttribute('mesid') ?? message;
    if (id === lastHandledMessageId) return;
    lastHandledMessageId = id;

    message.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
}

function isMessageNode(node) {
    return node instanceof Element && (node.matches('.mes') || node.querySelector('.mes'));
}

function onChatMutation(mutations) {
    if (mutations.some(mutation => [...mutation.addedNodes].some(isMessageNode))) {
        scrollNewReplyOnce();
    }
}

function startObserver() {
    const chat = document.getElementById('chat');
    if (!chat) {
        retryTimer = setTimeout(startObserver, 500);
        return;
    }

    observer = new MutationObserver(onChatMutation);
    observer.observe(chat, { childList: true, subtree: true });
    console.log('[TauriTavern Reply Top Scroll] enabled');
}

function init() {
    startObserver();
}

function exit() {
    observer?.disconnect();
    observer = null;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    lastHandledMessageId = null;
}

export { init, exit };
