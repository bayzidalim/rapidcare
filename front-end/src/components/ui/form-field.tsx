"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"
import { AlertCircle, CheckCircle } from "lucide-react"

interface FormFieldProps {
  children: React.ReactNode
  className?: string
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  )
)
FormField.displayName = "FormField"

interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean
}

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FormLabelProps
>(({ className, required, children, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
    {...props}
  >
    {children}
    {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
  </Label>
))
FormLabel.displayName = "FormLabel"

interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  type?: "error" | "success" | "info"
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, type = "error", children, ...props }, ref) => {
    if (!children) return null

    const Icon = type === "error" ? AlertCircle : type === "success" ? CheckCircle : null

    return (
      <p
        ref={ref}
        className={cn(
          "text-sm flex items-center gap-2",
          {
            "text-red-600": type === "error",
            "text-green-600": type === "success", 
            "text-blue-600": type === "info",
          },
          className
        )}
        role={type === "error" ? "alert" : "status"}
        aria-live={type === "error" ? "assertive" : "polite"}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {children}
      </p>
    )
  }
)
FormMessage.displayName = "FormMessage"

interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
FormDescription.displayName = "FormDescription"

// Enhanced input wrapper with validation states
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  success?: string
  loading?: boolean
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, error, success, loading, ...props }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          {
            "border-red-500 focus-visible:ring-red-500": error,
            "border-green-500 focus-visible:ring-green-500": success && !error,
            "pr-10": error || success || loading,
          },
          className
        )}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${props.id}-error` : success ? `${props.id}-success` : undefined}
        {...props}
      />
      {(error || success || loading) && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
          ) : error ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : null}
        </div>
      )}
    </div>
  )
)
FormInput.displayName = "FormInput"

export {
  FormField,
  FormLabel,
  FormMessage,
  FormDescription,
  FormInput,
}