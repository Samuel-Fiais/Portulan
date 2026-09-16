"use client"

import * as React from "react"
import { CheckIcon, MinusIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox peer size-4 shrink-0 rounded-none border-2 border-border bg-background shadow-none transition-[color,border-color,background-color] outline-none",
        "focus-visible:border-primary focus-visible:ring-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon className="size-3 stroke-[3] group-data-[state=indeterminate]/checkbox:hidden" />
        <MinusIcon className="hidden size-3 stroke-[3] group-data-[state=indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

function CheckboxField({
  label,
  className,
  checkboxClassName,
  ...props
}: React.ComponentProps<typeof Checkbox> & {
  label: React.ReactNode
  checkboxClassName?: string
}) {
  const id = React.useId()

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-foreground select-none",
        "has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className
      )}
    >
      <Checkbox id={id} className={cn("mt-0.5", checkboxClassName)} {...props} />
      <span>{label}</span>
    </label>
  )
}

export { Checkbox, CheckboxField }
