export function getSafe(object, path, fallback = null) {
  let obj = { ...object }

  const arrToPath = path
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/^\./, '')
    .split('.')

  try {
    let i = 0

    while (i < arrToPath.length) {
      if (arrToPath[i] in obj) {
        obj = obj[arrToPath[i]]
        i += 1
      } else {
        return fallback
      }
    }

    return obj
  } catch (err) {
    return fallback
  }
}
