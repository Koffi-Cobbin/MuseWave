import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  "data-testid"?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, "data-testid": testId, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(false)
    const isChecked = checked ?? internalChecked

    const handleClick = () => {
      if (disabled) return
      const next = !isChecked
      onCheckedChange?.(next)
      if (checked === undefined) setInternalChecked(next)
    }

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        data-testid={testId}
        className={cn(
          "inline-flex cursor-pointer rounded-full",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
        style={{
          width: "36px",
          minWidth: "36px",
          maxWidth: "36px",
          height: "20px",
          minHeight: "20px",
          maxHeight: "20px",
          padding: "0",
          border: "none",
          flexShrink: 0,
          flexGrow: 0,
          boxSizing: "border-box",
          alignItems: "center",
          backgroundColor: isChecked
            ? "hsl(var(--primary))"
            : "hsl(var(--muted-foreground) / 0.4)",
          transition: "background-color 0.15s ease",
        }}
        {...props}
      >
        <span
          className="block rounded-full bg-background shadow-md"
          style={{
            width: "16px",
            minWidth: "16px",
            height: "16px",
            minHeight: "16px",
            borderRadius: "9999px",
            transform: `translateX(${isChecked ? "18px" : "2px"})`,
            transition: "transform 0.15s ease",
          }}
        />
      </button>
    )
  },
)
Switch.displayName = "Switch"

export { Switch }