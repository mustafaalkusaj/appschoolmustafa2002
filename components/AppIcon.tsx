
import { APP_ICON_MAP } from "@/lib/icons";

export function AppIcon({
  token,
  size = 16,
  strokeWidth = 2,
  className,
}: {
  token: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = APP_ICON_MAP[token] || CircleFallback;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}

function CircleFallback({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return <div className={className} style={{ width: size, height: size, borderRadius: "999px", background: "currentColor", opacity: 0.25 }} />;
}
