import { range } from 'd3-array';

export function Undoer({
  historyLimit = 200,
  onUpdateValue,
  storageKey,
}) {
  var pastValues = [range(800).map(() => 0)];
  var storedJSON = localStorage.getItem(storageKey);
  if (storedJSON) {
    pastValues[0] = JSON.parse(storedJSON);
  }
  var undoer = { onChange, onUndo, getCurrentValue };
  return undoer;

  function onChange(newValue) {
    pastValues.push(newValue);
    if (pastValues.length > historyLimit) {
      pastValues.shift();
    }
    localStorage.setItem(storageKey, JSON.stringify(newValue));
  }

  function onUndo() {
    if (pastValues.length < 2) {
      return;
    }
    // TODO: Avoid "going back" to the most recent change, which is sort
    // of not undoing at all.
    var prevValue = pastValues.pop();
    if (prevValue) {
      onUpdateValue(prevValue, undoer);
    }
  }

  function getCurrentValue() {
    if (pastValues.length > 0) {
      return pastValues[pastValues.length - 1];
    }
  }
}
