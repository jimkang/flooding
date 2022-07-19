import { range } from 'd3-array';

// The object constructed here assumes that it's going to be working on an array value.
export function Undoer({
  historyLimit = 200,
  onUpdateValue,
  storageKey,
}) {
  var history = [range(800).map(() => 0)];
  var storedJSON = localStorage.getItem(storageKey);
  if (storedJSON) {
    history[0] = JSON.parse(storedJSON);
  }
  console.log('history length:', history.length);
  var undoer = { onChange, onUndo, getCurrentValue };
  return undoer;

  function onChange(newValue) {
    //if (history.length > 0 && history[history.length - 1].every((x, i) => x === newValue[i])) {
    //console.log('newValue is the same as the last one.');
    //return;
    //}
    history.push(newValue);
    if (history.length > historyLimit) {
      history.shift();
    }
    console.log('history length:', history.length);
    localStorage.setItem(storageKey, JSON.stringify(newValue));
  }

  function onUndo() {
    if (history.length < 2) {
      return;
    }
    history.pop();
    var prevValue = history[history.length - 1];
    if (prevValue) {
      // Return a copy so that things don't edit things in our history.
      onUpdateValue(prevValue.slice(), undoer);
      localStorage.setItem(storageKey, JSON.stringify(prevValue));
    }
    console.log('history length:', history.length);
  }

  function getCurrentValue() {
    if (history.length > 0) {
      // Return a copy so that things don't edit things in our history.
      return history[history.length - 1].slice();
    }
  }
}
