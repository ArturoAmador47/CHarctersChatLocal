/**
 * Splits roleplay text into dialogue and *action* segments.
 *
 * Actions open and close on the same line: an unmatched asterisk, or one whose
 * pair only appears on a later line, stays literal text so the message still
 * renders intact. Runs of two or more asterisks (markdown bold) are literal too.
 *
 * Written as a scanner rather than a regex on purpose — the build targets
 * safari13, which predates lookbehind support.
 */

export interface RoleplaySegment {
  kind: 'text' | 'action';
  value: string;
}

/** Index of the closing `*` on the same line, or -1 if there isn't one. */
function findClosingAsterisk(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const char = text[i];
    if (char === '\n') return -1;
    if (char === '*') return i;
  }
  return -1;
}

export function parseRoleplay(content: string): RoleplaySegment[] {
  const segments: RoleplaySegment[] = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) {
      segments.push({ kind: 'text', value: buffer });
      buffer = '';
    }
  };

  while (i < content.length) {
    if (content[i] !== '*') {
      buffer += content[i];
      i++;
      continue;
    }

    let run = 0;
    while (content[i + run] === '*') run++;
    if (run > 1) {
      buffer += content.slice(i, i + run);
      i += run;
      continue;
    }

    const close = findClosingAsterisk(content, i + 1);
    const inner = close === -1 ? '' : content.slice(i + 1, close);

    if (close === -1 || !inner.trim()) {
      buffer += '*';
      i++;
      continue;
    }

    flush();
    segments.push({ kind: 'action', value: inner });
    i = close + 1;
  }

  flush();
  return segments;
}
