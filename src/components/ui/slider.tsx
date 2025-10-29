import * as React from "react";

type SliderProps = {
  value: number[];
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  onValueChange?: (value: number[]) => void;
};

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  className = "",
  onValueChange,
}: SliderProps) {
  const v = value?.[0] ?? 0;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={v}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onValueChange?.([Number(e.target.value)])
      }
      className={`w-full h-2 rounded-full bg-white/10 accent-white ${className}`}
    />
  );
}
