export function i(data) {
  console.info('INFO  > ' + data.toString());
}

export function e(data) {
  console.info('ERROR > ' + data.toString());
}

export function w(data) {
  console.warn('WARN  > ' + data.toString());
}

export default { i, e, w };
