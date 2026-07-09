'use client';

import React from 'react';

interface SolidityHighlighterProps {
  code: string;
}

export default function SolidityHighlighter({ code }: SolidityHighlighterProps) {
  const lines = code.split('\n');

  const highlightLine = (line: string) => {
    if (line.trim().startsWith('//')) {
      return <span className="text-slate-500 italic">{line}</span>;
    }

    const words = line.split(/(\s+|[{}();,=\[\]!<>+\-*\/])/);

    return words.map((word, idx) => {
      if (/^\s+$/.test(word)) {
        return <span key={idx}>{word}</span>;
      }

      const trimmed = word.trim();
      if (!trimmed) return <span key={idx}>{word}</span>;

      // Keywords
      if (
        [
          'pragma',
          'solidity',
          'import',
          'contract',
          'is',
          'constructor',
          'function',
          'returns',
          'require',
          'if',
          'return',
          'super',
          'event',
          'mapping',
          'indexed',
          'emit',
        ].includes(trimmed)
      ) {
        return (
          <span key={idx} className="text-pink-400 font-medium">
            {word}
          </span>
        );
      }

      // Types
      if (['uint256', 'address', 'bool', 'string', 'uint'].includes(trimmed)) {
        return (
          <span key={idx} className="text-teal-300">
            {word}
          </span>
        );
      }

      // Modifiers / visibility
      if (
        [
          'public',
          'private',
          'external',
          'internal',
          'view',
          'pure',
          'override',
          'onlyOwner',
          'constant',
          'virtual',
        ].includes(trimmed)
      ) {
        return (
          <span key={idx} className="text-sky-300 font-medium">
            {word}
          </span>
        );
      }

      // Strings (starts and ends with " or ')
      if (/^".*"$/.test(trimmed) || /^'.*'$/.test(trimmed)) {
        return (
          <span key={idx} className="text-amber-200">
            {word}
          </span>
        );
      }

      // Numbers
      if (/^\d+$/.test(trimmed)) {
        return (
          <span key={idx} className="text-purple-300">
            {word}
          </span>
        );
      }

      // Comments within lines
      if (trimmed.startsWith('//')) {
        return (
          <span key={idx} className="text-slate-500 italic">
            {word}
          </span>
        );
      }

      // Symbols
      if (['{', '}', '(', ')', ';', ',', '[', ']', '='].includes(trimmed)) {
        return (
          <span key={idx} className="text-slate-400">
            {word}
          </span>
        );
      }

      return (
        <span key={idx} className="text-slate-200">
          {word}
        </span>
      );
    });
  };

  return (
    <pre className="font-mono text-[11px] md:text-xs overflow-auto h-[450px] p-4 bg-slate-950 rounded-xl text-slate-100 border border-slate-800 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
      <code>
        {lines.map((line, i) => (
          <div key={i} className="flex hover:bg-slate-900/50 px-2 py-0.5 rounded">
            <span className="w-8 inline-block text-slate-600 text-right select-none pr-3 border-r border-slate-800 mr-3 text-[10px]">
              {i + 1}
            </span>
            <span className="whitespace-pre">{highlightLine(line)}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}
