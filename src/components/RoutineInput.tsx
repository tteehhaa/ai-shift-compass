import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import type { RoutineEntry } from '@/lib/types';

interface RoutineInputProps {
  routines: RoutineEntry[];
  onChange: (routines: RoutineEntry[]) => void;
}

const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8];

function addTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes % (24 * 60) / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function formatDuration(d: number): string {
  if (d === Math.floor(d)) return `${d}시간`;
  const h = Math.floor(d);
  const m = (d - h) * 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export default function RoutineInput({ routines, onChange }: RoutineInputProps) {
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const flashHighlight = (index: number) => {
    setHighlightIndex(index);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setHighlightIndex(null), 800);
  };

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const addRoutine = () => {
    const last = routines[routines.length - 1];
    const nextTime = last ? addTime(last.time, last.duration) : '09:00';
    onChange([...routines, { time: nextTime, activity: '', duration: 1 }]);
  };

  const updateRoutine = (index: number, field: keyof RoutineEntry, value: string | number) => {
    const updated = routines.map((r, i) => i === index ? { ...r, [field]: value } : r);

    // Auto-cascade: when time or duration changes, update subsequent routine start times
    if (field === 'time' || field === 'duration') {
      for (let j = index + 1; j < updated.length; j++) {
        const prev = updated[j - 1];
        updated[j] = { ...updated[j], time: addTime(prev.time, prev.duration) };
      }
      if (index + 1 < updated.length) {
        flashHighlight(index + 1);
      }
    }

    onChange(updated);
  };

  const removeRoutine = (index: number) => {
    const updated = routines.filter((_, i) => i !== index);
    // Re-cascade times after removal
    for (let j = Math.max(1, index); j < updated.length; j++) {
      const prev = updated[j - 1];
      updated[j] = { ...updated[j], time: addTime(prev.time, prev.duration) };
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {routines.map((routine, i) => (
        <div
          key={i}
          className={`glass-card rounded-2xl p-4 flex items-start gap-3 group transition-all hover:shadow-md ${
            highlightIndex === i ? 'ring-2 ring-primary/50 bg-primary/5 animate-pulse' : ''
          }`}
          style={{
            transition: 'box-shadow 0.3s, background-color 0.5s, ring-color 0.5s',
          }}
        >
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
                onChange={(e) => updateRoutine(i, 'duration', parseFloat(e.target.value))}
                className="bg-transparent text-sm text-muted-foreground outline-none cursor-pointer"
              >
                {DURATION_OPTIONS.map((h) => (
                  <option key={h} value={h}>{formatDuration(h)}</option>
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
