// TauriTavern-compatible implementation with no imports from SillyTavern internals.
// It uses the stable chat DOM contract, so it also works on mobile builds.
let observer = null;
let pendingTimer = null;
let lastScrolledMessage = null;

function getLastAssistantMessage() {
    const messages = [...document.querySelectorAll('#chat .mes, .mes')];
    const last = messages.at(-1);
    if (!last) return null;
    if (last.getAttribute('is_user') === 'true' || last.getAttribute('is_system') === 'true') return null;
    return last;
}

function scrollReplyTop() {
    const message = getLastAssistantMessage();
    if (!message || !document.contains(message)) return;
    message.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
    lastScrolledMessage = message;
}

function scheduleScroll() {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
        pendingTimer = null;
        scrollReplyTop();
    }, 1400);
}

function startObserver() {
    const chat = document.getElementById('chat');
    if (!chat) {
        setTimeout(startObserver, 500);
        return;
    }

    observer = new MutationObserver(scheduleScroll);
    observer.observe(chat, { childList: true, subtree: true, characterData: true });
    console.log('[TauriTavern Reply Top Scroll] enabled');
}

function init() {
    startObserver();
}

function exit() {
    observer?.disconnect();
    observer = null;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = null;
    lastScrolledMessage = null;
}

export { init, exit };
