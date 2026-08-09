export interface Clip {
  id:    string
  start: number
  end:   number
}

/**
 * 同一列不允許重疊：`anchorId`（剛被拖曳／縮放的那塊）留在新位置，
 * 其他片段往左右推開，長度不變。被推到 0 之前的話整列再往右擠回來。
 */
export function rippleRow<T extends Clip>(clips: T[], anchorId: string): T[] {
  const ordered = [...clips].sort((a, b) =>
    a.start - b.start || (a.id === anchorId ? -1 : b.id === anchorId ? 1 : 0))
  const anchor = ordered.findIndex(clip => clip.id === anchorId)
  if (anchor < 0) return clips

  const moveTo = (clip: T, start: number): T => ({ ...clip, start, end: start + (clip.end - clip.start) })

  // 後面的往右推
  let cursor = ordered[anchor].end
  for (let i = anchor + 1; i < ordered.length; i++) {
    if (ordered[i].start < cursor) ordered[i] = moveTo(ordered[i], cursor)
    cursor = ordered[i].end
  }
  // 前面的往左推
  cursor = ordered[anchor].start
  for (let i = anchor - 1; i >= 0; i--) {
    if (ordered[i].end > cursor) ordered[i] = moveTo(ordered[i], cursor - (ordered[i].end - ordered[i].start))
    cursor = ordered[i].start
  }
  // 左推越界（< 0）時，從 0 開始重新往右擠——連 anchor 也可能被擠走
  cursor = 0
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].start < cursor) ordered[i] = moveTo(ordered[i], cursor)
    cursor = ordered[i].end
  }
  return ordered
}
