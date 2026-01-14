import React from "react";
import { ChevronDownIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { typographyVariants } from "@/components/ui/typography";

interface MarkdownRendererProps {
  content: string;
}

function YouTubeEmbed({ url }: { url: string }) {
  const getYouTubeId = (url: string) => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  const videoId = getYouTubeId(url);
  if (!videoId) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg my-4">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="[&_[data-slot=collapsible]+[data-slot=collapsible]]:border-t-0 [&_[data-slot=collapsible]+[data-slot=collapsible]]:mt-0 [&_[data-slot=collapsible]:has(+[data-slot=collapsible])]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Style paragraphs
          p: ({ children, ...props }) => (
            <p className={typographyVariants()} {...props}>
              {children}
            </p>
          ),
          // Style images - also handles YouTube embeds via ![](youtube-url) syntax
          img: ({ src, alt, ...props }) => {
            const youtubeRegex =
              /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/;
            if (src && youtubeRegex.test(src)) {
              return <YouTubeEmbed url={src} />;
            }
            return (
              <img
                src={src}
                alt={alt}
                className="rounded-lg w-full object-cover my-4"
                {...props}
              />
            );
          },
          // Style headings
          h1: ({ children, ...props }) => (
            <h1 className={typographyVariants({ variant: "h1" })} {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className={typographyVariants({ variant: "h2" })} {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className={typographyVariants({ variant: "h3" })} {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className={typographyVariants({ variant: "h4" })} {...props}>
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 className={typographyVariants({ variant: "h5" })} {...props}>
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 className={typographyVariants({ variant: "h6" })} {...props}>
              {children}
            </h6>
          ),
          // Style lists
          ul: ({ children, ...props }) => (
            <ul className={typographyVariants({ variant: "ul" })} {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className={typographyVariants({ variant: "ol" })} {...props}>
              {children}
            </ol>
          ),
          // Style blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote
              className={typographyVariants({ variant: "blockquote" })}
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Style inline code
          code: ({ children, ...props }) => (
            <code
              className={typographyVariants({ variant: "inlineCode" })}
              {...props}
            >
              {children}
            </code>
          ),
          // Style links
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Render accordions using Collapsible
          details: ({ children }) => {
            const childArray = React.Children.toArray(children);
            let summaryContent: React.ReactNode = "Details";
            const contentChildren: React.ReactNode[] = [];

            childArray.forEach((child) => {
              if (React.isValidElement(child)) {
                const props = child.props as {
                  node?: { tagName?: string };
                  children?: React.ReactNode;
                };
                if (
                  child.type === "summary" ||
                  props.node?.tagName === "summary"
                ) {
                  summaryContent = props.children;
                } else {
                  contentChildren.push(child);
                }
              } else {
                contentChildren.push(child);
              }
            });

            return (
              <Collapsible className="my-4 border-b">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 py-4 text-left text-sm font-medium transition-colors [&[data-state=open]>svg]:rotate-180">
                  {summaryContent}
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-4 text-sm">
                  {contentChildren}
                </CollapsibleContent>
              </Collapsible>
            );
          },
          // Summary is handled by details, render nothing here
          summary: () => null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
