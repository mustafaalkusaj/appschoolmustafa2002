import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

// ── Tabs Component (Container) ────────────────────────────────────────────────

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onValueChange,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue || ""
    );

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (newValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [isControlled, onValueChange]
    );

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn("", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

// ── TabsList Component ────────────────────────────────────────────────────────

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    const { onValueChange } = useTabsContext();
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    
    // Combine refs
    const setRefs = React.useCallback((node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    // Arrow key navigation
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      const tabs = innerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      if (!tabs || tabs.length === 0) return;

      const tabArray = Array.from(tabs);
      const currentIndex = tabArray.findIndex(tab => tab.getAttribute("data-state") === "active");
      let nextIndex = currentIndex;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight": {
          e.preventDefault();
          const isRTL = document.documentElement.getAttribute("dir") === "rtl";
          const isNext = e.key === "ArrowRight" ? !isRTL : isRTL;
          nextIndex = isNext 
            ? (currentIndex + 1) % tabArray.length 
            : (currentIndex - 1 + tabArray.length) % tabArray.length;
          break;
        }
        case "ArrowDown":
          e.preventDefault();
          nextIndex = (currentIndex + 1) % tabArray.length;
          break;
        case "ArrowUp":
          e.preventDefault();
          nextIndex = (currentIndex - 1 + tabArray.length) % tabArray.length;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = tabArray.length - 1;
          break;
        default:
          return;
      }

      // Focus and activate the new tab
      const nextTab = tabArray[nextIndex];
      nextTab?.focus();
      const nextValue = nextTab?.getAttribute("data-value");
      if (nextValue) {
        onValueChange(nextValue);
      }
    }, [onValueChange]);

    return (
      <div
        ref={setRefs}
        role="tablist"
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles
          "flex items-center",
          // Bottom border
          "border-b border-[var(--border)]",
          // Horizontal scroll on mobile
          "overflow-x-auto scrollbar-hide",
          // RTL support
          "rtl:flex-row-reverse",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsList.displayName = "TabsList";

// ── TabsTrigger Component ─────────────────────────────────────────────────────

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isSelected = selectedValue === value;

    return (
      <button
        ref={ref}
        id={`tab-${value}`}
        type="button"
        role="tab"
        aria-selected={isSelected}
        aria-controls={`tabpanel-${value}`}
        data-state={isSelected ? "active" : "inactive"}
        data-value={value}
        onClick={() => onValueChange(value)}
        className={cn(
          // Base styles
          "relative flex items-center justify-center",
          "px-4 py-3",
          "text-sm font-medium",
          "whitespace-nowrap",
          "transition-colors duration-150",
          // Focus styles
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[var(--focus-ring-color)]",
          "focus-visible:ring-offset-[var(--focus-ring-offset)]",
          // Inactive state
          !isSelected && [
            "text-[var(--text-secondary)]",
            "hover:text-[var(--text-primary)]",
          ],
          // Active state (underline style)
          isSelected && [
            "text-[var(--primary)]",
            "font-semibold",
            "border-b-2 border-[var(--primary)]",
            // Offset the border to align with bottom
            "-mb-px",
          ],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

// ── TabsContent Component ─────────────────────────────────────────────────────

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${value}`}
        aria-labelledby={`tab-${value}`}
        data-state={isSelected ? "active" : "inactive"}
        hidden={!isSelected}
        className={cn(
          "pt-4",
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[var(--focus-ring-color)]",
          "focus-visible:ring-offset-[var(--focus-ring-offset)]",
          className
        )}
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";

// ── Exports ───────────────────────────────────────────────────────────────────

export { Tabs, TabsList, TabsTrigger, TabsContent };
