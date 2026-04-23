import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SlashCommand } from "./slashCommands";

declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

interface Props {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

const MARKS = [
  { label: "B", mark: "bold",      cls: "font-bold" },
  { label: "I", mark: "italic",    cls: "italic" },
  { label: "U", mark: "underline", cls: "underline" },
  { label: "S", mark: "strike",    cls: "line-through" },
] as const;

const EXTENSIONS = (placeholder: string) => [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Placeholder.configure({ placeholder, emptyEditorClass: "is-editor-empty" }),
  Link.configure({ openOnClick: false, autolink: true }),
  Underline,
  Typography,
  // html: true — still render legacy HTML notes; transformPastedText: true — parse pasted markdown
  Markdown.configure({ html: true, transformPastedText: true, breaks: true }),
  SlashCommand,
];

export function RichTextEditor({ content, onChange, placeholder = "Write something, or '/' for commands…", className }: Props) {
  // Track the last value we emitted so we can ignore `content` prop echoes
  // from the parent without re-serializing the ProseMirror doc to compare.
  const lastEmitted = useRef<string>(content);

  const editor = useEditor({
    extensions: EXTENSIONS(placeholder),
    content,
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown();
      lastEmitted.current = md;
      onChange(md);
    },
    editorProps: {
      attributes: { class: cn("tiptap focus:outline-none min-h-[160px] py-2 text-sm text-foreground", className) },
    },
  });

  useEffect(() => {
    if (!editor || content === lastEmitted.current) return;
    lastEmitted.current = content;
    editor.commands.setContent(content, { emitUpdate: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  return (
    <div className="relative cursor-text" onClick={() => editor.commands.focus()}>
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md">
          {MARKS.map(({ label, mark, cls }) => (
            <button
              key={mark}
              type="button"
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleMark(mark).run(); }}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded text-sm transition-colors hover:bg-accent",
                cls,
                editor.isActive(mark) && "bg-accent text-accent-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  );
}
