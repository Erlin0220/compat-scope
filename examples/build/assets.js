export async function exportSelection(records) {
  const last = records.at(-1);
  if (!Object.hasOwn(last, 'text')) return;
  await navigator.clipboard.writeText(last.text);
  return crypto.randomUUID();
}
export function watchPreview(element, onResize) {
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(element);
  return element.dataset?.preview ?? '';
}
export function transcribe() {
  return new SpeechRecognition();
}
export function isPinch(event) {
  return typeof GestureEvent !== 'undefined' && event instanceof GestureEvent;
}
