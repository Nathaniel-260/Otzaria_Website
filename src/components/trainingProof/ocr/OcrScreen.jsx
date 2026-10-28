'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/components/providers/DialogContext'
import { OCR_KEYS } from '@/lib/trainingProof/vocab'
import { useRound } from '../common/useRound'
import { progress, countBy, nextIndex, isTypingTarget } from '../common/roundModel'
import RoundHeader from '../common/RoundHeader'
import RoundEnd from '../common/RoundEnd'
import RoundStates, { LostNotice } from '../common/RoundStates'
import GuideBox from '../common/GuideBox'
import FullPageDialog from '../common/FullPageDialog'
import Kbd from '../common/Kbd'
import OcrLineCard from './OcrLineCard'

const HOME = '/library/page-proof'

// זיהוי-הטקסט (docs/75 §2): 30 שורות מכל הספרים והכתבים, כמו מסך ההגהה בתחנה.
// מקשים: 1 נכון · 2 תקן · 3 חיתוך גרוע · 4 דלג · 5 לא קריא · 6 הכתב שגוי · ↑↓ שורה.
// כל סימון נשמר מיד; אחריו עוברים לשורה הבאה שלא טופלה.
export default function OcrScreen() {
  const round = useRound('ocr')
  const router = useRouter()
  if (round.status !== 'ready') return <RoundStates round={round} onHome={() => router.push(HOME)} />
  // key — סבב חדש מתחיל ממצב נקי (השורה הנוכחית, הטיוטות)
  return <OcrRound key={round.round} round={round} />
}

function OcrRound({ round }) {
  const router = useRouter()
  const { showAlert } = useDialog()
  const [cur, setCur] = useState(0)
  const [editing, setEditing] = useState(null)
  const [ctxOf, setCtxOf] = useState(null)
  const scrollNext = useRef(false)
  const { items } = round
  const { done, total } = progress(items)

  useEffect(() => {
    if (!scrollNext.current) return
    scrollNext.current = false
    const id = items[cur]?.id
    if (id) document.getElementById(`tp-line-${id}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [cur, items])

  const move = useCallback((i) => {
    scrollNext.current = true
    setCur(Math.max(0, Math.min(items.length - 1, i)))
  }, [items.length])

  const mark = useCallback(
    async (i, action, text) => {
      const it = items[i]
      if (!it || it.skipped) return
      setEditing(null)
      const r = await round.mark(it.id, action === 'fixed' ? { action, text } : { action })
      if (!r.ok) return showAlert('השמירה נכשלה', r.error)
      if (action === 'router') showAlert('הועבר לנתב הכתב', 'אחרי שייקבע הכתב הנכון — השורה תחזור להגהה')
      if (i === cur) move(nextIndex(items, i))
    },
    [items, round, cur, move, showAlert]
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target) || ctxOf) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        move(cur + (e.key === 'ArrowDown' ? 1 : -1))
        return
      }
      const action = OCR_KEYS[e.key]
      if (!action) return
      e.preventDefault()
      if (action === 'fixed') setEditing(items[cur]?.id || null)
      else mark(cur, action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cur, items, mark, move, ctxOf])

  const goHome = async () => {
    await round.release()
    router.push(HOME)
  }

  const by = countBy(items, (it) => it.result?.action)
  const summary = `${by.ok || 0} נכונות · ${by.fixed || 0} תוקנו · ${(by.seg || 0) + (by.bad || 0)} חיתוך גרוע / לא קריא · ${by.skip || 0} דילגתם · ${by.router || 0} חזרו לנתב`

  return (
    <div className="flex flex-col gap-3">
      <RoundHeader title="זיהוי טקסט" done={done} total={total} onHome={goHome} />
      {round.lost ? <LostNotice onRetake={round.take} /> : null}
      <p className="text-body-sm leading-8 text-on-surface-variant">
        <Kbd>1</Kbd> נכון · <Kbd>2</Kbd> תקן (ואז <Kbd>Enter</Kbd> שומר, <Kbd>Esc</Kbd> מבטל) · <Kbd>3</Kbd> חיתוך גרוע · <Kbd>4</Kbd> דלג ·{' '}
        <Kbd>5</Kbd> לא קריא · <Kbd>6</Kbd> הכתב שגוי · <Kbd>↓</Kbd>/<Kbd>↑</Kbd> שורה אחרת. כל לחיצה נשמרת מיד.
      </p>
      <GuideBox section="ocr" />
      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <OcrLineCard
            key={it.id}
            item={it}
            index={i}
            total={total}
            current={i === cur}
            saving={!!round.saving[it.id]}
            editing={editing === it.id}
            onSelect={() => setCur(i)}
            onMark={(action, text) => {
              setCur(i)
              mark(i, action, text)
            }}
            onEdit={() => {
              setCur(i)
              setEditing(it.id)
            }}
            onCancelEdit={() => setEditing(null)}
            onShowCtx={() => setCtxOf(it)}
          />
        ))}
      </div>
      <RoundEnd done={done} total={total} summary={summary} onMore={round.take} onStop={goHome} />
      {ctxOf?.ctx ? <FullPageDialog ctx={ctxOf.ctx} alias={ctxOf.alias} page={ctxOf.page} onClose={() => setCtxOf(null)} /> : null}
    </div>
  )
}
