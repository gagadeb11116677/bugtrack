import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border placeholder:text-muted-foreground focus-visible:border-accent aria-invalid:border-destructive aria-invalid:shadow-[3px_3px_0_0_var(--destructive)] dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border-[3px] bg-card px-3 py-2 text-base shadow-[2px_2px_0_0_var(--border)] transition-[box-shadow,transform] outline-none focus-visible:shadow-[3px_3px_0_0_var(--accent)] focus-visible:translate-x-[-1px] focus-visible:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-sans font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
