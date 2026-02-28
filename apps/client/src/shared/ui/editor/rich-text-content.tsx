import { cn } from '@/shared/utils/classnames';
import './rich-text-content.css';

interface RichTextContentProps {
  children: string | null | undefined;
  className?: string;
}

/**
 * oembed 태그를 iframe으로 변환
 * CKEditor는 미디어 임베드 시 <oembed url="..."></oembed> 형태로 저장함
 */
function convertOembedToIframe(html: string): string {
  return html.replace(
    /<oembed\s+url="([^"]+)"[^>]*><\/oembed>/g,
    (_, url: string) => {
      const embedUrl = getEmbedUrl(url);
      if (!embedUrl) return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;

      return `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
    }
  );
}

/**
 * URL을 임베드 가능한 URL로 변환
 */
function getEmbedUrl(url: string): string | null {
  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

export function RichTextContent({ children, className }: RichTextContentProps) {
  if (!children) return null;

  const processedHtml = convertOembedToIframe(children);

  return (
    <div
      className={cn('rich-text-content', className)}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
