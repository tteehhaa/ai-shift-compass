import { Plus, Trash2, Clock } from 'lucide-react';
import type { RoutineEntry } from '@/lib/types';

interface RoutineInputProps {
  routines: RoutineEntry[];
  onChange: (routines: RoutineEntry[]) => void;
}

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function RoutineInput({ routines, onChange }: RoutineInputProps) {
  const addRoutine = () => {
    onChange([...routines, { time: '09:00', activity: '', duration: 1 }]);
  };

  const updateRoutine = (index: number, field: keyof RoutineEntry, value: string | number) => {
    const updated = routines.map((r, i) => i === index ? { ...r, [field]: value } : r);
    onChange(updated);
  };

  const removeRoutine = (index: number) => {
    onChange(routines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {routines.map((routine, i) => (
        <div key={i} className="glass-card rounded-2xl p-4 flex items-start gap-3 group transition-all hover:shadow-md">
          <div className="flex flex-col gap-2 shrink-0">
            <select
              value={routine.time}
              onChange={(e) => updateRoutine(i, 'time', e.target.value)}
              className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 text-sm font-medium appearance-none cursor-pointer"
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 px-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={routine.duration}
                onChange={(e) => updateRoutine(i, 'duration', parseInt(e.target.value))}
                className="bg-transparent text-sm text-muted-foreground outline-none cursor-pointer"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>{h}시간</option>
                ))}
              </select>
            </div>
          </div>
          <input
            value={routine.activity}
            onChange={(e) => updateRoutine(i, 'activity', e.target.value)}
            placeholder="예: 이메일 확인 및 답장, AI로 리서치 자료 정리..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none text-sm leading-relaxed py-2"
          />
          <button
            onClick={() => removeRoutine(i)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addRoutine}
        className="w-full rounded-2xl border-2 border-dashed border-border hover:border-muted-foreground/30 py-4 flex items-center justify-center gap-2 text-muted-foreground text-sm transition-colors"
      >
        <Plus className="w-4 h-4" />
        활동 추가
      </button>
    </div>
  );
}
