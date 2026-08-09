import { useCallback, useEffect, useRef, useState } from 'react'

/** 兩次變更間隔小於此毫秒數視為同一步，拖曳／滑桿才不會塞爆歷史 */
const COALESCE_MS = 400
/** 最多記幾步 */
const LIMIT = 50

export interface History<T> {
  past:    T[]
  future:  T[]
  present: T
}

/** 記下一步：現在這包推進 past，重做鏈作廢 */
export function pushHistory<T>(state: History<T>, next: T): History<T> {
  return {
    past:    [...state.past, state.present].slice(-LIMIT),
    future:  [],
    present: next,
  }
}

/** 回上一步／重做：把該邊最上面那包換成現在，現在那包丟到另一邊 */
export function applyStep<T>(state: History<T>, dir: 'undo' | 'redo'): History<T> {
  const from = dir === 'undo' ? state.past : state.future
  if (!from.length) return state
  const snapshot = from[from.length - 1]
  const rest     = from.slice(0, -1)
  const other    = [...(dir === 'undo' ? state.future : state.past), state.present]
  return dir === 'undo'
    ? { past: rest,  future: other, present: snapshot }
    : { past: other, future: rest,  present: snapshot }
}

/**
 * 快照式 undo/redo：把「目前這份文件」整包記起來，回上一步就是換回舊的那包。
 * 專案狀態都是不可變更新（每次編輯換新物件），所以快照只是存參考——沒有複製成本。
 *
 * ponytail: 不做 command pattern。要精細到「只回復某個欄位」再說。
 */
export function useHistory<T extends Record<string, unknown>>(doc: T, restore: (snapshot: T) => void) {
  const stateRef     = useRef<History<T>>({ past: [], future: [], present: doc })
  const restoringRef = useRef(false)
  const lastEditRef  = useRef(0)
  const restoreRef   = useRef(restore)
  restoreRef.current = restore

  const [depth, setDepth] = useState({ undo: 0, redo: 0 })
  const sync = () => setDepth({ undo: stateRef.current.past.length, redo: stateRef.current.future.length })

  useEffect(() => {
    const state = stateRef.current
    const changed = (Object.keys(doc) as (keyof T)[]).some(key => doc[key] !== state.present[key])
    if (!changed) return

    if (restoringRef.current) {
      restoringRef.current = false
      stateRef.current = { ...state, present: doc }
      return
    }
    // 連續變更（拖曳）併成一步：只有靜下來超過 COALESCE_MS 的那次才真的記一筆
    const now = Date.now()
    stateRef.current = now - lastEditRef.current >= COALESCE_MS
      ? pushHistory(state, doc)
      : { ...state, future: [], present: doc }
    lastEditRef.current = now
    sync()
  })

  const step = useCallback((dir: 'undo' | 'redo') => {
    const next = applyStep(stateRef.current, dir)
    if (next === stateRef.current) return
    stateRef.current = next
    restoringRef.current = true
    lastEditRef.current = 0
    restoreRef.current(next.present)
    sync()
  }, [])

  const undo = useCallback(() => step('undo'), [step])
  const redo = useCallback(() => step('redo'), [step])

  // ⌘/Ctrl+Z 回上一步、⌘⇧Z 或 Ctrl+Y 重做。焦點在輸入框時讓瀏覽器處理文字 undo。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      event.preventDefault()
      if (key === 'y' || event.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return { undo, redo, canUndo: depth.undo > 0, canRedo: depth.redo > 0 }
}
