"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownViewProps {
  children: string;
  className?: string;
}

export function MarkdownView({ children, className }: MarkdownViewProps) {
  return (
    <div className={cn("text-sm leading-relaxed text-foreground/90 space-y-3 break-words", className)}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-lg font-semibold tracking-tight mt-4 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold tracking-tight mt-4 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:opacity-80">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 marker:text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 marker:text-muted-foreground">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground italic">{children}</blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !String(className || "").includes("language-");
            if (isInline) return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em] text-foreground" {...props}>{children}</code>;
            return <code className={cn("block font-mono text-[0.8em]", className)} {...props}>{children}</code>;
          },
          pre: ({ children }) => <pre className="overflow-x-auto rounded-md border bg-muted/60 p-3 text-[0.8em] leading-relaxed">{children}</pre>,
          hr: () => <hr className="border-border my-3" />,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
