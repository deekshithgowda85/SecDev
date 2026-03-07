import { cn } from "@/lib/utils";

interface MenuToggleIconProps {
  open: boolean;
  className?: string;
  duration?: number;
}

export function MenuToggleIcon({ open, className, duration = 300 }: MenuToggleIconProps) {
  return (
    <div className={cn("relative flex flex-col justify-center gap-[5px]", className)}>
      <span
        style={{ transitionDuration: `${duration}ms` }}
        className={cn(
          "block h-0.5 w-full rounded-full bg-current transition-transform origin-center",
          open && "translate-y-[7px] rotate-45"
        )}
      />
      <span
        style={{ transitionDuration: `${duration}ms` }}
        className={cn(
          "block h-0.5 w-full rounded-full bg-current transition-opacity",
          open && "opacity-0"
        )}
      />
      <span
        style={{ transitionDuration: `${duration}ms` }}
        className={cn(
          "block h-0.5 w-full rounded-full bg-current transition-transform origin-center",
          open && "-translate-y-[7px] -rotate-45"
        )}
      />
    </div>
  );
}
