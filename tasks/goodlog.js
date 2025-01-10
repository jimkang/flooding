var logOn = false;

export function enableGoodlog() {
  logOn = true;
}

export function goodlog() {
  if (!logOn) {
    return;
  }
  console.log.apply(console, arguments);
}
