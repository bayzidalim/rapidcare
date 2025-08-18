// Simple replacement for class-variance-authority
type ClassValue = string | number | boolean | undefined | null
type ClassArray = ClassValue[]
type ClassDictionary = Record<string, any>
type ClassProp = ClassValue | ClassArray | ClassDictionary

export function cn(...classes: ClassProp[]): string {
  return classes
    .flat()
    .filter(Boolean)
    .join(' ')
    .trim()
}

type VariantProps<T> = T extends (...args: any[]) => any
  ? Parameters<T>[0]
  : never

interface CVAConfig {
  variants?: Record<string, Record<string, string>>
  defaultVariants?: Record<string, string>
}

export function cva(base: string, config?: CVAConfig) {
  return (props: Record<string, any> = {}) => {
    let classes = [base]
    
    if (config?.variants) {
      Object.entries(config.variants).forEach(([key, variants]) => {
        const value = props[key] || config.defaultVariants?.[key]
        if (value && variants[value]) {
          classes.push(variants[value])
        }
      })
    }
    
    if (props.className) {
      classes.push(props.className)
    }
    
    return cn(...classes)
  }
}

export type { VariantProps }