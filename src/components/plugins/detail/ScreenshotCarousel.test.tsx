import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScreenshotCarousel from './ScreenshotCarousel'
import { AUTOPLAY_INTERVAL_MS } from './carouselModel'

const shots = ['/a.png', '/b.png', '/c.png']

function track() {
  return screen.getByTestId('carousel-track')
}
function currentSlide() {
  return screen.getAllByRole('group', { hidden: true }).find((g) => !g.hasAttribute('aria-hidden'))
}

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn()
  }))
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ScreenshotCarousel', () => {
  it('אפס תמונות — לא מרנדר דבר', () => {
    const { container } = render(<ScreenshotCarousel screenshots={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('תמונה אחת — בלי חצים, נקודות וכפתור השהיה', () => {
    render(<ScreenshotCarousel screenshots={['/a.png']} />)
    expect(screen.getByRole('region', { name: 'צילומי מסך' })).toHaveAttribute('aria-roledescription', 'carousel')
    expect(screen.queryByRole('button', { name: 'הבא' })).toBeNull()
    expect(screen.queryByRole('button', { name: /המעבר האוטומטי/ })).toBeNull()
  })

  it('שקופיות מתויגות "תמונה X מתוך N"; רק הנוכחית גלויה; רק הנוכחית והבאה טעונות', () => {
    const { container } = render(<ScreenshotCarousel screenshots={['/a.png', '/b.png', '/c.png', '/d.png']} />)
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 1 מתוך 4')
    expect(currentSlide()).toHaveAttribute('aria-roledescription', 'slide')
    const srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(srcs).toEqual(['/a.png', '/b.png'])
  })

  it('חצים ונקודות מנווטים, מעגלית; aria-live=polite בניווט ידני', async () => {
    const user = userEvent.setup()
    render(<ScreenshotCarousel screenshots={shots} />)
    await user.click(screen.getByRole('button', { name: 'הקודם' }))
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 3 מתוך 3')
    await user.click(screen.getByRole('button', { name: 'הבא' }))
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 1 מתוך 3')
    await user.click(screen.getByRole('button', { name: 'תמונה 2 מתוך 3' }))
    expect(screen.getByRole('button', { name: 'תמונה 2 מתוך 3' })).toHaveAttribute('aria-current', 'true')
    // הפוקוס בתוך הקרוסלה — המעבר האוטומטי עצור
    expect(track()).toHaveAttribute('aria-live', 'polite')
  })

  it('מעבר אוטומטי כל 5 שניות (aria-live=off), ונעצר בכפתור', () => {
    vi.useFakeTimers()
    render(<ScreenshotCarousel screenshots={shots} />)
    expect(track()).toHaveAttribute('aria-live', 'off')
    act(() => { vi.advanceTimersByTime(AUTOPLAY_INTERVAL_MS) })
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 2 מתוך 3')

    fireEvent.click(screen.getByRole('button', { name: 'השהיית המעבר האוטומטי' }))
    fireEvent.blur(screen.getByRole('button', { name: 'הפעלת המעבר האוטומטי' }))
    act(() => { vi.advanceTimersByTime(AUTOPLAY_INTERVAL_MS * 2) })
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 2 מתוך 3')
  })

  it('נעצר ב-hover ובפוקוס', () => {
    vi.useFakeTimers()
    render(<ScreenshotCarousel screenshots={shots} />)
    const region = screen.getByRole('region', { name: 'צילומי מסך' })
    fireEvent.mouseEnter(region)
    act(() => { vi.advanceTimersByTime(AUTOPLAY_INTERVAL_MS * 2) })
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 1 מתוך 3')
    fireEvent.mouseLeave(region)
    fireEvent.focus(screen.getByRole('button', { name: 'הבא' }))
    act(() => { vi.advanceTimersByTime(AUTOPLAY_INTERVAL_MS * 2) })
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 1 מתוך 3')
  })

  it('prefers-reduced-motion — בלי מעבר אוטומטי ובלי כפתור השהיה', () => {
    mockReducedMotion(true)
    vi.useFakeTimers()
    render(<ScreenshotCarousel screenshots={shots} />)
    act(() => { vi.advanceTimersByTime(AUTOPLAY_INTERVAL_MS * 2) })
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 1 מתוך 3')
    expect(screen.queryByRole('button', { name: /המעבר האוטומטי/ })).toBeNull()
  })

  it('החלקה באצבע ב-RTL: ימינה → הבאה', () => {
    render(<ScreenshotCarousel screenshots={shots} />)
    const frame = track().parentElement as HTMLElement
    fireEvent.pointerDown(frame, { pointerType: 'touch', clientX: 100, clientY: 100 })
    fireEvent.pointerUp(frame, { pointerType: 'touch', clientX: 200, clientY: 105 })
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 2 מתוך 3')
  })

  it('אחרי החלקה (בלי click מהדפדפן) — הנגיעה הבאה פותחת את התצוגה המוגדלת', async () => {
    render(<ScreenshotCarousel screenshots={shots} />)
    const frame = track().parentElement as HTMLElement
    fireEvent.pointerDown(frame, { pointerType: 'touch', clientX: 100, clientY: 100 })
    fireEvent.pointerUp(frame, { pointerType: 'touch', clientX: 200, clientY: 105 })
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 2 מתוך 3')
    // נגיעה רגילה: pointerdown + pointerup באותו מקום, ואז click
    const shot = screen.getByRole('button', { name: 'צילום מסך 2' })
    fireEvent.pointerDown(shot, { pointerType: 'touch', clientX: 150, clientY: 100 })
    fireEvent.pointerUp(shot, { pointerType: 'touch', clientX: 150, clientY: 100 })
    fireEvent.click(shot)
    // התצוגה המוגדלת נטענת דינמית — זמן המתנה נדיב למכונה עמוסה
    expect(await screen.findByRole('dialog', { name: 'צילומי מסך' }, { timeout: 10000 })).toBeInTheDocument()
  })

  it('click שמגיע מיד אחרי החלקה נבלע (לא פותח תצוגה מוגדלת)', () => {
    render(<ScreenshotCarousel screenshots={shots} />)
    const frame = track().parentElement as HTMLElement
    fireEvent.pointerDown(frame, { pointerType: 'touch', clientX: 100, clientY: 100 })
    fireEvent.pointerUp(frame, { pointerType: 'touch', clientX: 200, clientY: 105 })
    fireEvent.click(screen.getByRole('button', { name: 'צילום מסך 2' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('רשימה חדשה (עריכה בעמוד) — חוזרת לתמונה הראשונה, בלי מצב שבור מהרשימה הקודמת', async () => {
    const user = userEvent.setup()
    const { container, rerender } = render(<ScreenshotCarousel screenshots={shots} />)
    await user.click(screen.getByRole('button', { name: 'הקודם' }))
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 3 מתוך 3')
    fireEvent.error(container.querySelector('img[src="/a.png"]') as HTMLImageElement)

    rerender(<ScreenshotCarousel screenshots={['/x.png', '/y.png']} />)
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 1 מתוך 2')
    expect(Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))).toEqual(['/x.png', '/y.png'])

    // אותו תוכן במערך חדש — המיקום נשמר
    await user.click(screen.getByRole('button', { name: 'הבא' }))
    rerender(<ScreenshotCarousel screenshots={['/x.png', '/y.png']} />)
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 2 מתוך 2')
  })

  it('תמונה שבורה — placeholder במקום אייקון שבור', () => {
    const { container } = render(<ScreenshotCarousel screenshots={shots} />)
    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    expect(container.querySelector('img[src="/a.png"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'צילום מסך 1' })).toBeInTheDocument()
  })

  it('לחיצה פותחת תצוגה מוגדלת נגישה; חצים בתוכה ו-Esc סוגר, והקרוסלה ממשיכה מאותה תמונה', async () => {
    const user = userEvent.setup()
    render(<ScreenshotCarousel screenshots={shots} />)
    await user.click(screen.getByRole('button', { name: 'צילום מסך 1' }))
    const dialog = await screen.findByRole('dialog', { name: 'צילומי מסך' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await waitFor(() => expect(dialog).toHaveFocus())
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(currentSlide()).toHaveAttribute('aria-label', 'תמונה 3 מתוך 3')
    expect(screen.getByRole('button', { name: 'צילום מסך 3' })).toHaveFocus()
  })
})
