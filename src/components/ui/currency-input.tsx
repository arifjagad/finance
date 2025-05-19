import React from "react";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<InputProps, "onChange"> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  prefix?: string;
  decimals?: number;
  allowNegative?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  prefix = "$",
  decimals = 2,
  allowNegative = false,
  className,
  ...props
}: CurrencyInputProps) {
  // Format number to string with proper decimals
  const formatValue = (num: number | undefined): string => {
    if (num === undefined) return "";
    return num.toFixed(decimals);
  };

  // Parse string to number
  const parseValue = (str: string): number | undefined => {
    // Remove prefix and any non-numeric characters except decimals and minus
    const cleaned = str.replace(prefix, "").replace(/[^\d.-]/g, "");
    
    if (!cleaned || cleaned === "-") return undefined;
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return undefined;
    
    // Handle negative values
    if (!allowNegative && parsed < 0) return 0;
    
    return parsed;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseValue(e.target.value);
    onChange(parsed);
  };

  // Format for display
  const displayValue = value !== undefined ? `${prefix}${formatValue(value)}` : "";

  return (
    <Input
      value={displayValue}
      onChange={handleChange}
      className={cn("text-right", className)}
      {...props}
    />
  );
}