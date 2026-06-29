export function splitArr(val: string): string[] {
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

export function joinArr(arr: string[]): string {
  return arr.join(',')
}
