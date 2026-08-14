"use client";

import styles from "./Stepper.module.css";

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  ariaLabel: string;
}

export default function Stepper({
  value,
  min = 1,
  max = 20,
  step = 1,
  onChange,
  formatValue,
  ariaLabel,
}: StepperProps) {
  const decrease = () => onChange(Math.max(min, value - step));
  const increase = () => onChange(Math.min(max, value + step));

  return (
    <div className={styles.stepper} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={styles.btn}
        onClick={decrease}
        disabled={value <= min}
        aria-label="Giảm"
      >
        −
      </button>
      <span className={styles.value}>{formatValue ? formatValue(value) : value}</span>
      <button
        type="button"
        className={styles.btn}
        onClick={increase}
        disabled={value >= max}
        aria-label="Tăng"
      >
        +
      </button>
    </div>
  );
}
