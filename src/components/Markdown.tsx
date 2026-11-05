/**
 * Minimal, dependency-free Markdown renderer for Search Agent answers.
 *
 * The agent streams `text/markdown`, but we render only the small subset it
 * actually produces: headings (##, ###), unordered lists (-, *), ordered lists
 * (1.), bold (**text**), italic (*text*), inline links, and paragraphs. This
 * avoids pulling in a full markdown library while fixing the literal "**" and
 * "##" that were showing through when we rendered the answer as plain text.
 *
 * Nested lists: the agent commonly emits an ordered item per product followed
 * by an indented unordered sub-list of attributes, e.g.
 *
 *   1. **E-flite Rogue FPV Racer**
 *      - Color: White
 *      - Scale: 1/16
 *   2. **Horizon Hobby Hurricane FPV Racer**
 *      - ...
 *
 * We parse indentation so those sub-items nest inside their parent ordered
 * item, which keeps the ordered list continuous (1, 2, 3…) instead of resetting
 * to "1." for every product.
 *
 * Scope note: this is intentionally not a complete CommonMark implementation.
 * If answers start using tables, code fences, or blockquotes, switch to
 * react-markdown behind this same component interface.
 *
 * Product thumbnails are intentionally NOT rendered inline — the answer's
 * matching products are shown in the "Products" carousel beneath the answer,
 * so inline images would be redundant. The `products` prop is kept for API
 * compatibility but ignored.
 */
import { type ReactNode } from 'react';

export interface MarkdownProduct {
  title: string;
  image?: string;
  href?: string;
}

/** Render inline markdown (bold/italic/links/code) within a single line. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[4] !== undefined) nodes.push(<strong key={key++}>{m[4]}</strong>);
    else if (m[6] !== undefined) nodes.push(<em key={key++}>{m[6]}</em>);
    else if (m[8] !== undefined) nodes.push(<em key={key++}>{m[8]}</em>);
    else if (m[10] !== undefined) nodes.push(<code key={key++}>{m[10]}</code>);
    else if (m[12] !== undefined) {
      nodes.push(
        <a key={key++} href={m[13]} target="_blank" rel="noreferrer">
          {m[12]}
        </a>,
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ─── Block model ────────────────────────────────────────────────────────────

interface ListItemNode {
  text: string;
  children: Block[]; // nested blocks (sub-lists) belonging to this item
}

type Block =
  | { type: 'h'; level: number; text: string }
  | { type: 'ul'; items: ListItemNode[] }
  | { type: 'ol'; items: ListItemNode[] }
  | { type: 'p'; text: string };

interface RawLine {
  indent: number;
  content: string;
}

/** Leading whitespace width (tabs count as 2). */
function indentOf(line: string): number {
  const m = /^[ \t]*/.exec(line);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[0]) n += ch === '\t' ? 2 : 1;
  return n;
}

/**
 * Parse a run of list lines (at >= baseIndent) into list blocks, recursively
 * nesting deeper-indented items under the item that precedes them.
 */
function parseList(lines: RawLine[], start: number, baseIndent: number): { blocks: Block[]; next: number } {
  const blocks: Block[] = [];
  let i = start;
  let current: { type: 'ul' | 'ol'; items: ListItemNode[] } | null = null;

  const pushCurrent = () => {
    if (current) {
      blocks.push(current);
      current = null;
    }
  };

  while (i < lines.length) {
    const { indent, content } = lines[i];
    if (content.trim() === '') { i++; continue; }
    if (indent < baseIndent) break; // dedent — this list is done

    const ulMatch = /^[-*]\s+(.*)$/.exec(content.trim());
    const olMatch = /^\d+\.\s+(.*)$/.exec(content.trim());
    if (!ulMatch && !olMatch) break; // not a list line at this level

    const kind: 'ul' | 'ol' = olMatch ? 'ol' : 'ul';
    const itemText = (olMatch ? olMatch[1] : ulMatch![1]).trim();

    if (!current || current.type !== kind) {
      pushCurrent();
      current = { type: kind, items: [] };
    }

    // Collect any deeper-indented lines as this item's nested children.
    i++;
    const childStart = i;
    let childEnd = i;
    while (childEnd < lines.length) {
      const l = lines[childEnd];
      if (l.content.trim() === '') { childEnd++; continue; }
      if (l.indent > baseIndent) { childEnd++; continue; }
      break;
    }

    let children: Block[] = [];
    if (childEnd > childStart) {
      const childIndent = Math.min(
        ...lines.slice(childStart, childEnd)
          .filter((l) => l.content.trim() !== '')
          .map((l) => l.indent),
      );
      const parsed = parseList(lines, childStart, childIndent);
      children = parsed.blocks;
      i = parsed.next;
    }

    current.items.push({ text: itemText, children });
  }

  pushCurrent();
  return { blocks, next: i };
}

/** Group lines into block-level elements (headings, lists, paragraphs). */
function parseBlocks(src: string): Block[] {
  const rawLines: RawLine[] = src
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => ({ indent: indentOf(l), content: l }));

  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') });
      para = [];
    }
  };

  let i = 0;
  while (i < rawLines.length) {
    const { content } = rawLines[i];
    const trimmed = content.trim();

    if (trimmed === '') { flushPara(); i++; continue; }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushPara();
      blocks.push({ type: 'h', level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushPara();
      const baseIndent = rawLines[i].indent;
      const { blocks: listBlocks, next } = parseList(rawLines, i, baseIndent);
      blocks.push(...listBlocks);
      i = next;
      continue;
    }

    para.push(trimmed);
    i++;
  }
  flushPara();
  return blocks;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function ListItem({ item }: { item: ListItemNode }) {
  return (
    <li className="md-li">
      {renderInline(item.text)}
      {item.children.length > 0 && (
        <div className="md-li-children">{renderBlocks(item.children)}</div>
      )}
    </li>
  );
}

function renderBlocks(blocks: Block[]): ReactNode[] {
  return blocks.map((b, i) => {
    if (b.type === 'h') {
      const inline = renderInline(b.text);
      if (b.level <= 1) return <h3 key={i} className="md-h">{inline}</h3>;
      if (b.level === 2) return <h4 key={i} className="md-h">{inline}</h4>;
      return <h5 key={i} className="md-h">{inline}</h5>;
    }
    if (b.type === 'ul') {
      return (
        <ul key={i} className="md-ul">
          {b.items.map((it, j) => (
            <ListItem key={j} item={it} />
          ))}
        </ul>
      );
    }
    if (b.type === 'ol') {
      return (
        <ol key={i} className="md-ol">
          {b.items.map((it, j) => (
            <ListItem key={j} item={it} />
          ))}
        </ol>
      );
    }
    return (
      <p key={i} className="md-p">
        {renderInline(b.text)}
      </p>
    );
  });
}

export function Markdown({
  text,
}: {
  text: string;
  /** Kept for API compatibility; inline thumbnails are intentionally not rendered. */
  products?: MarkdownProduct[];
}) {
  const blocks = parseBlocks(text);
  return <div className="md">{renderBlocks(blocks)}</div>;
}
