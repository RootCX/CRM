import { useAppCollection } from "@rootcx/sdk";
import { toast } from "@rootcx/ui";
import type { Favorite } from "@/lib/types";
import { APP_ID } from "@/lib/constants";

export function useFavorites() {
  const { data: favorites, create, remove } = useAppCollection<Favorite>(APP_ID, "favorites");

  const isFavorite = (entityType: Favorite["entity_type"], entityId: string) =>
    favorites.some(f => f.entity_type === entityType && f.entity_id === entityId);

  const toggle = async (entityType: Favorite["entity_type"], entityId: string, label: string) => {
    const existing = favorites.find(f => f.entity_type === entityType && f.entity_id === entityId);
    try {
      if (existing) { await remove(existing.id); toast.success("Removed from favorites"); }
      else { await create({ entity_type: entityType, entity_id: entityId, label, position: favorites.length }); toast.success("Added to favorites"); }
    } catch { toast.error("Failed to update favorites"); }
  };

  return { favorites, isFavorite, toggle };
}
