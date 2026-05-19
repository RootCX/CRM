import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/meetings";

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  seed: string;
  size?: "sm" | "md";
  className?: string;
}

const SIZE: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-6 w-6 text-xs",
};

export function Avatar({ firstName, lastName, displayName, avatarUrl, seed, size = "sm", className }: AvatarProps) {
  const dims = SIZE[size];
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className={cn("rounded-md object-cover", dims, className)} />;
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md font-semibold ring-1 ring-background",
        avatarColor(seed),
        dims,
        className,
      )}
    >
      {initials(firstName ?? "", lastName ?? "", displayName ?? seed)}
    </div>
  );
}
