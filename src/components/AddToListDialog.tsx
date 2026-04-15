import { useState } from "react";
import { useAppCollection, useRuntimeClient } from "@rootcx/sdk";
import {
  Button, Input, toast,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Separator,
} from "@rootcx/ui";
import { IconPlus } from "@tabler/icons-react";
import type { WhereClause } from "@rootcx/sdk";
import { APP_ID } from "@/lib/constants";
import type { List } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "contacts" | "companies" | "deals";
  where?: WhereClause;
  totalCount: number;
  lists: List[];
  onListCreated?: () => void;
}

export function AddToListDialog({ open, onOpenChange, entityType, where, totalCount, lists, onListCreated }: Props) {
  const [mode, setMode] = useState<"pick" | "create">("pick");
  const [selectedListId, setSelectedListId] = useState("");
  const [newListName, setNewListName] = useState("");
  const [loading, setLoading] = useState(false);

  const client = useRuntimeClient();
  const { create: createList } = useAppCollection<List>(APP_ID, "lists");

  const compatibleLists = lists.filter(l => l.entity_type === entityType);

  const reset = () => { setMode("pick"); setSelectedListId(""); setNewListName(""); };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let listId = selectedListId;

      if (mode === "create") {
        if (!newListName.trim()) return;
        const created = await createList({ name: newListName.trim(), entity_type: entityType, position: lists.length });
        listId = (created as any)?.id;
        if (!listId) throw new Error("Failed to create list");
        onListCreated?.();
      }

      if (!listId) return;

      const result = await client.rpc(APP_ID, "add_filtered_to_list", {
        list_id: listId,
        entity_type: entityType,
        where,
      });

      toast.success(`${(result as any)?.added ?? 0} records added to list`);
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Failed to add records to list");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to list</DialogTitle>
          <DialogDescription>Add {totalCount.toLocaleString()} records to a list</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {compatibleLists.length > 0 && mode === "pick" && (
            <>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger><SelectValue placeholder="Choose a list…" /></SelectTrigger>
                <SelectContent>
                  {compatibleLists.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Separator />
              <button onClick={() => setMode("create")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                <IconPlus className="h-3.5 w-3.5" /> Create new list
              </button>
            </>
          )}

          {(mode === "create" || compatibleLists.length === 0) && (
            <Input
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              placeholder="New list name…"
              autoFocus
            />
          )}

          <Button
            className="w-full"
            disabled={loading || (mode === "pick" && !selectedListId) || (mode === "create" && !newListName.trim())}
            onClick={handleSubmit}
          >
            {loading ? "Adding…" : `Add ${totalCount.toLocaleString()} records`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
