import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-border flex h-11 w-full min-w-0 rounded-md border-[3px] bg-card px-3 py-1 text-base shadow-[2px_2px_0_0_var(--border)] transition-[box-shadow,transform] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-sans font-medium",
        "focus-visible:border-accent focus-visible:shadow-[3px_3px_0_0_var(--accent)] focus-visible:translate-x-[-1px] focus-visible:translate-y-[-1px]",
        "aria-invalid:border-destructive aria-invalid:shadow-[3px_3px_0_0_var(--destructive)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
