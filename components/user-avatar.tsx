import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  login?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  className?: string;
  title?: string;
};

function initials(name?: string | null, login?: string | null, email?: string | null) {
  const source = name?.trim() || login?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, login, email, imageUrl, className, title }: UserAvatarProps) {
  const label = title ?? name ?? login ?? email ?? "Colaborador";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={label}
        title={label}
        className={cn("size-7 rounded-none object-cover", className)}
      />
    );
  }

  return (
    <span
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-none bg-muted font-mono text-[10px] font-semibold uppercase text-muted-foreground",
        className,
      )}
    >
      {initials(name, login, email)}
    </span>
  );
}
