import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "$") {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === "$" ? "USD" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getMonthName(month: number) {
  const date = new Date();
  date.setMonth(month - 1);
  return date.toLocaleString('en-US', { month: 'long' });
}

export function getLastNMonths(n: number) {
  const result = [];
  const today = new Date();
  
  for (let i = 0; i < n; i++) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    result.push({
      month: month.getMonth() + 1,
      year: month.getFullYear(),
      name: month.toLocaleString('en-US', { month: 'short' }),
    });
  }
  
  return result.reverse();
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function generateColors(count: number) {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  
  // If we need more colors than available, generate them
  if (count > colors.length) {
    const moreColors = Array.from({ length: count - colors.length }, (_, i) => {
      const hue = Math.floor((i * 137.5) % 360);
      return `hsl(${hue}, 70%, 60%)`;
    });
    return [...colors, ...moreColors];
  }
  
  return colors.slice(0, count);
}

export function getGradient(ctx: any, chartArea: any, color: string) {
  const gradient = ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom
  );
  gradient.addColorStop(0, `${color}90`);
  gradient.addColorStop(1, `${color}10`);
  return gradient;
}