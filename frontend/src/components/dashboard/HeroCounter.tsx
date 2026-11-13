import React, { useEffect, useState } from "react";

interface HeroCounterProps {
  value: number;
  duration?: number;
  masked?: boolean;
}

export const HeroCounter: React.FC<HeroCounterProps> = ({
  value,
  duration = 900,
  masked = false,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(easeOut * value);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  if (masked) {
    return <span className="tabular-nums font-mono tracking-wider">₦••••••</span>;
  }

  return (
    <span className="tabular-nums font-mono">
      ₦{Math.round(displayValue).toLocaleString()}
    </span>
  );
};
