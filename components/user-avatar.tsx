import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md";

const avatarSizeClasses: Record<AvatarSize, string> = {
  sm: "size-7 text-[10px]",
  md: "size-7 text-[10px]",
};

type UserAvatarProps = {
  name?: string | null;
  login?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  className?: string;
  title?: string;
  size?: AvatarSize;
};

function initials(name?: string | null, login?: string | null, email?: string | null) {
  const source = name?.trim() || login?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  name,
  login,
  email,
  imageUrl,
  className,
  title,
  size = "md",
}: UserAvatarProps) {
  const label = title ?? name ?? login ?? email ?? "Colaborador";
  const sizeClass = avatarSizeClasses[size];

  if (imageUrl) {
    return (
      <span
        title={label}
        className={cn("inline-flex shrink-0 overflow-hidden rounded-none", sizeClass, className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={label} className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-none bg-muted font-mono font-semibold uppercase text-muted-foreground",
        sizeClass,
        className,
      )}
    >
      {initials(name, login, email)}
    </span>
  );
}
