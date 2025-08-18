"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simple Select component using native HTML select
interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const Select = ({ value, onValueChange, defaultValue, children, className, disabled, placeholder }: SelectProps) => {
  // Extract SelectItems from children (for backward compatibility)
  const selectItems: React.ReactElement[] = [];
  let extractedPlaceholder = placeholder;
  
  const extractElements = (elements: React.ReactNode) => {
    React.Children.forEach(elements, (child: any) => {
      if (React.isValidElement(child)) {
        if (child.type === SelectItem) {
          selectItems.push(child);
        } else if (child.type === SelectTrigger) {
          // Extract placeholder from SelectValue inside SelectTrigger
          React.Children.forEach(child.props.children, (triggerChild: any) => {
            if (React.isValidElement(triggerChild) && triggerChild.type === SelectValue) {
              extractedPlaceholder = triggerChild.props.placeholder || extractedPlaceholder;
            }
          });
        } else if (child.type === SelectContent) {
          extractElements(child.props.children);
        } else if (child.props?.children) {
          extractElements(child.props.children);
        }
      }
    });
  };
  
  extractElements(children);
  
  // If we found SelectItems, use them; otherwise render children directly
  const optionsToRender = selectItems.length > 0 ? selectItems : children;
  
  return (
    <select
      value={value || defaultValue || ''}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {extractedPlaceholder && (
        <option value="" disabled>
          {extractedPlaceholder}
        </option>
      )}
      {optionsToRender}
    </select>
  );
};

// Simple option component
interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const SelectItem = ({ value, children, disabled }: SelectItemProps) => {
  // Extract text content from complex children (for backward compatibility)
  const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return node.toString();
    if (Array.isArray(node)) return node.map(getTextContent).join(' ');
    if (React.isValidElement(node)) {
      return getTextContent(node.props.children);
    }
    return '';
  };
  
  const textContent = getTextContent(children);
  
  return (
    <option value={value} disabled={disabled}>
      {textContent}
    </option>
  );
};

// Compatibility components (these do nothing but maintain API compatibility)
interface SelectTriggerProps {
  children?: React.ReactNode;
  className?: string;
}

const SelectTrigger = ({ children, className }: SelectTriggerProps) => {
  return <>{children}</>;
};

const SelectValue = ({ placeholder }: { placeholder?: string }) => null;

const SelectContent = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const SelectGroup = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const SelectLabel = ({ children }: { children: React.ReactNode }) => {
  return <optgroup label={children as string} />;
};

const SelectSeparator = () => <hr />;
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};