import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

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
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Custom renderer for paragraphs to detect YouTube links
          p: ({ children, ...props }) => {
            const childrenArray = React.Children.toArray(children);
            const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/;

            // Helper to extract YouTube URL from a child element
            const getYouTubeUrl = (child: unknown): string | null => {
              if (
                typeof child === "object" &&
                child !== null &&
                "props" in child
              ) {
                const childElement = child as { props?: { href?: string } };
                const href = childElement.props?.href;
                if (href && youtubeRegex.test(href)) {
                  return href;
                }
              }
              return null;
            };

            // Check if paragraph contains only a single YouTube link (as text or anchor)
            if (childrenArray.length === 1) {
              const child = childrenArray[0];

              // Case 1: Plain text YouTube URL
              if (typeof child === "string" && youtubeRegex.test(child.trim())) {
                return <YouTubeEmbed url={child.trim()} />;
              }

              // Case 2: YouTube URL wrapped in an anchor tag (markdown link)
              const url = getYouTubeUrl(child);
              if (url) {
                return <YouTubeEmbed url={url} />;
              }
            }

            // Case 3: YouTube link appears inline with other content
            // Find YouTube links and render them as embeds after the paragraph
            const youtubeLinks: string[] = [];
            const processedChildren = childrenArray.map((child) => {
              const url = getYouTubeUrl(child);
              if (url) {
                youtubeLinks.push(url);
                // Return null to remove the link from inline content
                return null;
              }
              return child;
            }).filter(Boolean);

            if (youtubeLinks.length > 0) {
              return (
                <>
                  {processedChildren.length > 0 && (
                    <p {...props}>{processedChildren}</p>
                  )}
                  {youtubeLinks.map((url, index) => (
                    <YouTubeEmbed key={index} url={url} />
                  ))}
                </>
              );
            }

            return <p {...props}>{children}</p>;
          },
          // Style images
          img: ({ src, alt, ...props }) => (
            <img
              src={src}
              alt={alt}
              className="rounded-lg w-full object-cover my-4"
              {...props}
            />
          ),
          // Style headings
          h1: ({ children, ...props }) => (
            <h1 className="text-3xl font-bold mt-6 mb-4" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-2xl font-semibold mt-5 mb-3" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xl font-semibold mt-4 mb-2" {...props}>
              {children}
            </h3>
          ),
          // Style lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside space-y-2 my-4" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 my-4" {...props}>
              {children}
            </ol>
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
