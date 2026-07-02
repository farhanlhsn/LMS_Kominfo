'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
  /**
   * Jika true, tampilkan raw HTML tanpa sanitization (HATI-HATI — hanya untuk konten
   * dari sistem, BUKAN dari user).
   */
  dangerouslyAllowRawHtml?: boolean;
}

/**
 * Markdown renderer dengan sanitization & syntax highlighting.
 *
 * Whitelist tag berasal dari `rehype-sanitize` default schema (sudah aman).
 * Untuk konten user, sanitization WAJIB aktif (default).
 */
export function Markdown({ content, className, dangerouslyAllowRawHtml = false }: MarkdownProps) {
  const rehypePlugins = useMemo(
    () => (dangerouslyAllowRawHtml ? [rehypeHighlight] : [rehypeSanitize, rehypeHighlight]),
    [dangerouslyAllowRawHtml],
  );

  if (!content) {
    return <p className="text-sm text-muted-foreground italic">Konten belum tersedia.</p>;
  }

  return (
    <div
      className={cn(
        'prose prose-sm sm:prose-base dark:prose-invert max-w-none',
        'prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
        'prose-pre:bg-zinc-900 prose-pre:text-zinc-100',
        'prose-img:rounded-lg prose-img:border',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={{
          a: ({ href, children }) => {
            const external = href?.startsWith('http');
            return (
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
