import { cn } from '@/lib/utils';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISTP', 'ESTJ', 'ESTP',
  'ISFJ', 'ISFP', 'ESFJ', 'ESFP',
];

interface MBTIGridProps {
  selected: string;
  onSelect: (mbti: string) => void;
}

export default function MBTIGrid({ selected, onSelect }: MBTIGridProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {MBTI_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              'rounded-xl py-3 text-sm font-medium transition-all duration-200',
              'hover:scale-[1.02] active:scale-[0.98]',
              selected === type
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            )}
          >
            {type}
          </button>
        ))}
      </div>
      <button
        onClick={() => onSelect('UNKNOWN')}
        className={cn(
          'w-full rounded-xl py-3 text-sm font-medium transition-all duration-200',
          'hover:scale-[1.01] active:scale-[0.99]',
          selected === 'UNKNOWN'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-secondary text-secondary-foreground hover:bg-accent'
        )}
      >
        🤷 MBTI 모름
      </button>
    </div>
  );
}
