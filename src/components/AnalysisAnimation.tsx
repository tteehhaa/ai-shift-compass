import { useEffect, useState } from 'react';

interface AnalysisAnimationProps {
  onComplete: () => void;
}

const RAINBOW_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899',
];

const MESSAGES = [
  '일상 데이터를 분석하고 있습니다...',
  'AI 대체 가능성을 계산하고 있습니다...',
  '시간 압축률을 산출하고 있습니다...',
  '경제적 가치를 환산하고 있습니다...',
  '당신의 AI 페르소나를 생성하고 있습니다...',
];

export default function AnalysisAnimation({ onComplete }: AnalysisAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, MESSAGES.length - 1));
    }, 700);
    return () => clearInterval(msgInterval);
  }, []);

  const getGradient = () => {
    const filledColors = RAINBOW_COLORS.slice(0, Math.ceil((progress / 100) * RAINBOW_COLORS.length));
    if (filledColors.length < 2) return `${RAINBOW_COLORS[0]}`;
    return `conic-gradient(${filledColors.map((c, i) => `${c} ${(i / filledColors.length) * 100}%`).join(', ')}, hsl(var(--border)) ${progress}%)`;
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-10">
      {/* Circular rainbow progress */}
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="100" cy="100" r="85"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="12"
          />
          {/* Rainbow segments */}
          {RAINBOW_COLORS.map((color, i) => {
            const segmentSize = 100 / RAINBOW_COLORS.length;
            const segmentStart = i * segmentSize;
            const segmentEnd = (i + 1) * segmentSize;
            const visible = progress >= segmentStart;
            const segmentProgress = visible
              ? Math.min((progress - segmentStart) / segmentSize, 1)
              : 0;
            const circumference = 2 * Math.PI * 85;
            const segmentLength = circumference / RAINBOW_COLORS.length;
            const dashLength = segmentLength * segmentProgress;
            const dashOffset = -(segmentLength * i);

            return (
              <circle
                key={i}
                cx="100" cy="100" r="85"
                fill="none"
                stroke={color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                className="transition-all duration-200"
                style={{ opacity: visible ? 1 : 0 }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground">{progress}%</span>
        </div>
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground animate-pulse">
          {MESSAGES[messageIndex]}
        </p>
        <div className="flex justify-center gap-1">
          {RAINBOW_COLORS.map((color, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: progress > (i / RAINBOW_COLORS.length) * 100 ? color : 'hsl(var(--border))',
                transform: progress > (i / RAINBOW_COLORS.length) * 100 ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
