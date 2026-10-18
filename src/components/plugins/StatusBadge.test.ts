import { describe, it, expect } from 'vitest'
import { statusTone, STATUS_TONES, LIFECYCLE_BADGES } from './StatusBadge'

describe('statusTone', () => {
  it('maps each release status to a badge tone, from quiet to prominent', () => {
    expect(statusTone('stable')).toBe('primary')
    expect(statusTone('beta')).toBe('neutral')
    expect(statusTone('experimental')).toBe('warning')
  })

  it('falls back to neutral for unknown statuses', () => {
    expect(statusTone('unknown-status')).toBe('neutral')
  })

  it('covers every release status', () => {
    expect(Object.keys(STATUS_TONES).sort()).toEqual(['beta', 'experimental', 'stable'])
  })
})

describe('LIFECYCLE_BADGES', () => {
  it('keeps the existing site wording for every lifecycle state', () => {
    expect(LIFECYCLE_BADGES.suspended.label).toBe('מושהה')
    expect(LIFECYCLE_BADGES.historical.label).toBe('גרסה ישנה')
    expect(LIFECYCLE_BADGES.pendingNew.label).toBe('תוסף חדש')
    expect(LIFECYCLE_BADGES.pendingUpdate.label).toBe('עריכה ממתינה')
  })
})
