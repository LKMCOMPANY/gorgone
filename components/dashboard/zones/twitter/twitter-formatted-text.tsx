"use client";

import { cn } from "@/lib/utils";

interface FormattedTextProps {
  text: string;
  entities?: {
    urls?: Array<{
      url: string;
      display_url?: string;
      expanded_url?: string;
      indices?: [number, number];
    }>;
    user_mentions?: Array<{
      screen_name: string;
      name: string;
      indices?: [number, number];
    }>;
    hashtags?: Array<{
      text: string;
      indices?: [number, number];
    }>;
  };
  className?: string;
}

/**
 * Formats tweet text with clickable links, styled mentions, and hashtags
 * Respects Twitter's display rules
 */
export function TwitterFormattedText({ text, entities, className }: FormattedTextProps) {
  if (!entities || (!entities.urls && !entities.user_mentions && !entities.hashtags)) {
    return <div className={cn("text-body leading-relaxed whitespace-pre-wrap break-words", className)}>{text}</div>;
  }

  // Build array of all entities with their positions
  const allEntities: Array<{
    start: number;
    end: number;
    type: "url" | "mention" | "hashtag";
    data: any;
  }> = [];

  // Add URLs
  entities.urls?.forEach((url) => {
    if (url.indices) {
      allEntities.push({
        start: url.indices[0],
        end: url.indices[1],
        type: "url",
        data: url,
      });
    }
  });

  // Add mentions
  entities.user_mentions?.forEach((mention) => {
    if (mention.indices) {
      allEntities.push({
        start: mention.indices[0],
        end: mention.indices[1],
        type: "mention",
        data: mention,
      });
    }
  });

  // Add hashtags
  entities.hashtags?.forEach((hashtag) => {
    if (hashtag.indices) {
      allEntities.push({
        start: hashtag.indices[0],
        end: hashtag.indices[1],
        type: "hashtag",
        data: hashtag,
      });
    }
  });

  // Sort by start position
  allEntities.sort((a, b) => a.start - b.start);

  // Build formatted text
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  allEntities.forEach((entity, idx) => {
    // Add text before entity
    if (entity.start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, entity.start)}
        </span>
      );
    }

    // Add entity
    if (entity.type === "url") {
      const displayUrl = entity.data.display_url || entity.data.url;
      parts.push(
        <a
          key={`url-${idx}`}
          href={entity.data.expanded_url || entity.data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline transition-all duration-[var(--transition-fast)]"
          onClick={(e) => e.stopPropagation()}
        >
          {displayUrl}
        </a>
      );
    } else if (entity.type === "mention") {
      parts.push(
        <a
          key={`mention-${idx}`}
          href={`https://twitter.com/${entity.data.screen_name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline transition-all duration-[var(--transition-fast)]"
          onClick={(e) => e.stopPropagation()}
        >
          @{entity.data.screen_name}
        </a>
      );
    } else if (entity.type === "hashtag") {
      parts.push(
        <a
          key={`hashtag-${idx}`}
          href={`https://twitter.com/hashtag/${entity.data.text}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline transition-all duration-[var(--transition-fast)]"
          onClick={(e) => e.stopPropagation()}
        >
          #{entity.data.text}
        </a>
      );
    }

    lastIndex = entity.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  return (
    <div className={cn("text-body leading-relaxed whitespace-pre-wrap break-words", className)}>
      {parts}
    </div>
  );
}

