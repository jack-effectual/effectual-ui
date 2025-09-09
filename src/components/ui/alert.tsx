import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-md p-4",
        variant === "info" && "bg-blue-100 text-blue-800",
        variant === "success" && "bg-green-100 text-green-800",
        variant === "warning" && "bg-yellow-100 text-yellow-800",
        variant === "error" && "bg-red-100 text-red-800",
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = "Alert";