import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { headingId } from '@/lib/wiki';
import { PROSE, SCROLL_REGION } from '@/components/docs/proseClasses';

// הסגנון של כל אלמנט מגיע מ-components/docs/proseClasses (מקור אחד לכל דפי המדריכים).
// התוכן עצמו — כפי שהגיע מהוויקי, בלי שינוי.

// קישור פנימי → Link של Next (ניווט SPA ללא טעינת דף); חיצוני → טאב חדש
function SmartLink({ href = '', children }) {
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} className={PROSE.link}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={PROSE.link}>
      {children}
    </a>
  );
}

// תמונה: בתוך <p> של Markdown, ולכן span (בלוק) ולא figure. ה-title נשאר מאפיין (כמו בוויקי) — לא כיתוב גלוי.
function WikiImage({ src, alt, title }) {
  return (
    <span className={`block ${PROSE.figure}`}>
      <img src={src} alt={alt || ''} title={title} className={PROSE.img} loading="lazy" decoding="async" />
    </span>
  );
}

const components = {
  h2: ({ children }) => (
    <h2 id={headingId(childrenToText(children))} className={PROSE.h2}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 id={headingId(childrenToText(children))} className={PROSE.h3}>
      {children}
    </h3>
  ),
  h4: ({ children }) => <h4 className={PROSE.h4}>{children}</h4>,
  p: ({ children }) => <p className={PROSE.p}>{children}</p>,
  ul: ({ children }) => <ul className={`mb-5 ${PROSE.ul}`}>{children}</ul>,
  ol: ({ children }) => <ol className={`mb-5 ${PROSE.ol}`}>{children}</ol>,
  li: ({ children }) => <li className={PROSE.li}>{children}</li>,
  a: SmartLink,
  strong: ({ children }) => <strong className={PROSE.strong}>{children}</strong>,
  blockquote: ({ children }) => <blockquote className={PROSE.blockquote}>{children}</blockquote>,
  hr: () => <hr className={PROSE.hr} />,
  code: ({ children }) => (
    <code dir="ltr" className={PROSE.code}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    // אזור גלילה: נגיש במקלדת (tabIndex) ובעל שם
    <pre dir="ltr" tabIndex={0} role="region" aria-label="קוד" className={`my-6 ${PROSE.pre} ${SCROLL_REGION}`}>
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div tabIndex={0} role="region" aria-label="טבלה" className={`${PROSE.tableWrap} ${SCROLL_REGION}`}>
      <table className={PROSE.table}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className={PROSE.thead}>{children}</thead>,
  th: ({ children }) => <th className={PROSE.th}>{children}</th>,
  td: ({ children }) => <td className={PROSE.td}>{children}</td>,
  img: WikiImage,
};

function childrenToText(children) {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return childrenToText(children.props.children);
  }
  return '';
}

export default function WikiMarkdown({ markdown }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {markdown}
    </ReactMarkdown>
  );
}
