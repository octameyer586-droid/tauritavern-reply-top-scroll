import { eventSource, event_types } from '../../../script.js';

const timers = new Set();

function findMessage(messageId) {
    const id = Number(messageId);
    if (Number.isInteger(id) && id >= 0) {
        const exact = document.querySelector(`.mes[mesid="${id}"]`);
        if (exact) return exact;
    }
    return [...document.querySelectorAll('#chat .mes, .mes')].at(-1) ?? null;
}

function moveToTop(messageId) {
    const message = findMessage(messageId);
    if (!message) return;

    const move = () => {
        if (document.contains(message)) {
            message.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
        }
    };

    move();
    for (const delay of [120, 400, 900, 1800]) {
        const timer = setTimeout(() => {
            timers.delete(timer);
            move();
        }, delay);
        timers.add(timer);
    }
}

function onMessageRendered(messageId) {
    moveToTop(messageId);
}

function init() {
    eventSource.makeLast(event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.on(event_types.MESSAGE_RECEIVED, onMessageRendered);
    eventSource.on(event_types.GENERATION_ENDED, () => moveToTop());
    console.log('[TauriTavern Reply Top Scroll] enabled');
}

function exit() {
    eventSource.removeListener(event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.removeListener(event_types.MESSAGE_RECEIVED, onMessageRendered);
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
}

export { init, exit };
