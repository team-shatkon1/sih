import React from 'react';

/**
 * Strips raw markdown syntax for clean speech synthesis (TTS)
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^[\s]*[-*•]\s+/gm, '')       // remove list bullets at line start
    .replace(/\s+[*•]\s+/g, '. ')          // replace inline bullets with natural speech pause
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // remove bold asterisks safely
    .replace(/\*([^*]+)\*/g, '$1')         // remove italic asterisks safely
    .replace(/#{1,6}\s+/g, '')             // remove headers
    .replace(/`{1,3}[^`]*`{1,3}/g, '')     // remove code
    .replace(/[-_]{3,}/g, '')             // remove hr
    .replace(/^\s*\d+\.\s+/gm, '')        // remove list numbers
    .replace(/\*/g, '')                   // remove any remaining stray asterisks
    .replace(/\s+/g, ' ')                 // normalize spaces
    .trim();
}

/**
 * Parses inline formatting like **bold**, *italic*, and `code`
 */
function parseInline(text: string): React.ReactNode[] {
  // Regex to split by bold (**...**), italic (*...*), or code (`...`)
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      const content = token.slice(2, -2);
      return <strong key={i} className="msg-strong">{content}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      const content = token.slice(1, -1);
      return <em key={i} className="msg-em">{content}</em>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      const content = token.slice(1, -1);
      return <code key={i} className="msg-code">{content}</code>;
    }
    // Clean any stray asterisks that were unmatched
    const cleaned = token.replace(/\*\*/g, '').replace(/\*/g, '');
    return <span key={i}>{cleaned}</span>;
  });
}

/**
 * Renders structured markdown content cleanly into React elements
 * without displaying raw asterisks or markdown artifacts
 */
export function renderFormattedMessage(rawText: string): React.ReactNode {
  if (!rawText) return null;

  // Split lines
  const lines = rawText.split('\n');
  const elements: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (currentListItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="msg-ol">
            {currentListItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="msg-ul">
            {currentListItems}
          </ul>
        );
      }
      currentListItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      flushList();
      return;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${idx}`} className="msg-hr" />);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${idx}`} className="msg-h4">
          {parseInline(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${idx}`} className="msg-h3">
          {parseInline(trimmed.replace(/^#{1,2}\s+/, ''))}
        </h3>
      );
      return;
    }

    // Bullet points (* or - or •)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (isNumberedList && currentListItems.length > 0) flushList();
      isNumberedList = false;
      currentListItems.push(
        <li key={`li-${idx}`} className="msg-li">
          {parseInline(bulletMatch[1])}
        </li>
      );
      return;
    }

    // Numbered list items (1. 2. etc)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!isNumberedList && currentListItems.length > 0) flushList();
      isNumberedList = true;
      currentListItems.push(
        <li key={`li-${idx}`} className="msg-li">
          {parseInline(numMatch[2])}
        </li>
      );
      return;
    }

    // Normal paragraph line
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="msg-p">
        {parseInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="formatted-msg-container">{elements}</div>;
}
