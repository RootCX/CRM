import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Editor, Range } from "@tiptap/core";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import { cn } from "@/lib/utils";

export interface CommandItem {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  cmd: (editor: Editor, range: Range) => void;
}

export interface CommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface Props {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export const CommandList = forwardRef<CommandListRef, Props>(({ items, command }, ref) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => setIdx(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp")   { setIdx(i => (i + items.length - 1) % items.length); return true; }
      if (event.key === "ArrowDown") { setIdx(i => (i + 1) % items.length); return true; }
      if (event.key === "Enter")     { command(items[idx]); return true; }
      return false;
    },
  }));

  if (!items.length) return (
    <div className="w-56 rounded-lg border bg-popover px-3 py-2 shadow-lg text-sm text-muted-foreground">
      No results
    </div>
  );

  return (
    <div className="w-56 rounded-lg border bg-popover p-1 shadow-lg">
      {items.map((item, i) => (
        <button
          key={item.title}
          onClick={() => command(item)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
            i === idx && "bg-accent"
          )}
        >
          <item.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">{item.title}</span>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = "CommandList";
