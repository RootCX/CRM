import { Editor, Extension, Range } from "@tiptap/core";
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { CommandList, CommandListRef, CommandItem } from "./CommandList";
import { IconH1, IconH2, IconH3, IconList, IconListNumbers, IconBlockquote, IconCode, IconSeparator } from "@tabler/icons-react";

const ITEMS: CommandItem[] = [
  { title: "Heading 1",     description: "Large section title",  Icon: IconH1,          cmd: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 1 }).run() },
  { title: "Heading 2",     description: "Medium section title", Icon: IconH2,          cmd: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run() },
  { title: "Heading 3",     description: "Small section title",  Icon: IconH3,          cmd: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run() },
  { title: "Bullet List",   description: "Unordered list",       Icon: IconList,        cmd: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: "Numbered List", description: "Ordered list",         Icon: IconListNumbers, cmd: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: "Quote",         description: "Blockquote",           Icon: IconBlockquote,  cmd: (e, r) => e.chain().focus().deleteRange(r).setBlockquote().run() },
  { title: "Code Block",    description: "Code snippet",         Icon: IconCode,        cmd: (e, r) => e.chain().focus().deleteRange(r).setCodeBlock().run() },
  { title: "Divider",       description: "Horizontal rule",      Icon: IconSeparator,   cmd: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
];

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: CommandItem }) => props.cmd(editor, range),
        items: ({ query }: { query: string }) => query ? ITEMS.filter(i => i.title.toLowerCase().includes(query.toLowerCase())) : ITEMS,
        render: () => {
          let component: ReactRenderer<CommandListRef>;
          let popup: TippyInstance[];
          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(CommandList, { props, editor: props.editor });
              if (!props.clientRect) return;
              // @ts-expect-error tippy accepts string selector
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate: (props: SuggestionProps) => {
              component?.updateProps(props);
              if (props.clientRect) popup?.[0].setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") { popup?.[0].hide(); return true; }
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => { popup?.[0].destroy(); component?.destroy(); },
          };
        },
      }),
    ];
  },
});
