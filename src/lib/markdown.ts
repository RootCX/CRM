// Plain-text preview for notes stored as markdown (with legacy HTML support).
export const stripMarkdown = (src: string, max?: number): string => {
  // Slice early so we only regex the relevant prefix, not the full note body.
  const work = max ? src.slice(0, max * 4) : src;
  const text = work
    .replace(/<[^>]+>/g, " ")                // legacy HTML tags
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")   // images → drop
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → label
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return max && text.length > max ? text.slice(0, max) + "…" : text;
};
