import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useEffect, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";

const EXTENSIONS = (placeholder: string) => [
  StarterKit.configure({ heading: { levels: [2, 3] } }),
  Placeholder.configure({ placeholder, emptyEditorClass: "is-editor-empty" }),
  Link.configure({ openOnClick: false, autolink: true }),
  Underline,
];

export interface HtmlEditorHandle {
  getHTML: () => string;
  getText: () => string;
}

interface Props {
  defaultHtml?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const HtmlEditor = forwardRef<HtmlEditorHandle, Props>(
  ({ defaultHtml = "", placeholder = "Write your message...", className, autoFocus }, ref) => {
    const editor = useEditor({
      extensions: EXTENSIONS(placeholder),
      content: defaultHtml,
      autofocus: autoFocus ? "end" : false,
      editorProps: {
        attributes: {
          class: cn(
            "tiptap focus:outline-none min-h-[120px] py-2 px-3 text-sm text-foreground prose prose-sm dark:prose-invert max-w-none",
            className,
          ),
        },
      },
    });

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() ?? "",
      getText: () => editor?.getText() ?? "",
    }), [editor]);

    useEffect(() => {
      if (editor && defaultHtml && !editor.getText().trim()) {
        editor.commands.setContent(defaultHtml, { emitUpdate: false });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once on mount to set initial HTML content
    }, []);

    if (!editor) return null;

    return (
      <div className="relative flex-1 overflow-auto border rounded-md" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} className="h-full" />
      </div>
    );
  }
);
