import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RoutineEntry, TagCategory, TagGroup } from '@/lib/types';
import { TAG_CONFIG, TAG_GROUPS } from '@/lib/types';

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

const MAX_CHARS = 40;
const WARN_CHARS = 30;

function formatDuration(d: number): string {
  if (d === Math.floor(d)) return `${d}시간`;
  const h = Math.floor(d);
  const m = (d - h) * 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function sortByTime(routines: RoutineEntry[]): RoutineEntry[] {
  return [...routines].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

const GROUP_LABELS: { group: TagGroup; color: string }[] = [
  { group: '생산성', color: '#3b82f6' },
  { group: '디지털 소비', color: '#ef4444' },
  { group: '오프라인/에너지', color: '#22c55e' },
  { group: '생활 루틴', color: '#6b7280' },
];

function TagSelector({ value, onChange }: { value: TagCategory; onChange: (tag: TagCategory) => void }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const config = TAG_CONFIG[value];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-medium px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap shrink-0"
        style={{
          color: config.color,
          backgroundColor: config.bgColor,
          borderColor: config.color + '30',
        }}
      >
        {value}
      </button>
      {open && createPortal(
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed bg-card border border-border rounded-xl shadow-xl p-2 min-w-[200px] max-h-[320px] overflow-y-auto"
          style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
        >
          {GROUP_LABELS.map(({ group, color }) => (
            <div key={group} className="mb-1.5 last:mb-0">
              <p className="text-[10px] font-semibold px-2 py-0.5" style={{ color }}>
                {group}
              </p>
              {TAG_GROUPS[group].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { onChange(tag); setOpen(false); }}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                    value === tag ? 'bg-accent font-semibold' : 'hover:bg-accent/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ))}
        </motion.div>,
        document.body
      )}
    </>
  );
}

export default function RoutineInput({ routines, onChange }: RoutineInputProps) {
  const sortTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const triggerSort = (updated: RoutineEntry[]) => {
    // Debounce sorting to let user finish editing
    if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current);
    sortTimeoutRef.current = setTimeout(() => {
      onChange(sortByTime(updated));
    }, 600);
  };

  useEffect(() => () => { if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current); }, []);

  const addRoutine = () => {
    const newRoutine: RoutineEntry = { time: '09:00', activity: '', duration: 1, tag: '➕ 기타' };
    const updated = sortByTime([...routines, newRoutine]);
    onChange(updated);
  };

  const updateRoutine = (index: number, field: keyof RoutineEntry, value: string | number | TagCategory) => {
    if (field === 'activity' && typeof value === 'string' && value.length > MAX_CHARS) return;

    const updated = routines.map((r, i) => i === index ? { ...r, [field]: value } : r);

    if (field === 'time') {
      triggerSort(updated);
    }

    onChange(updated);
  };

  const removeRoutine = (index: number) => {
    onChange(routines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {routines.map((routine, i) => {
          const charCount = routine.activity.length;
          const isOverWarn = charCount > WARN_CHARS;
          const tagConfig = TAG_CONFIG[routine.tag];

          return (
            <motion.div
              key={`${routine.time}-${i}`}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="glass-card rounded-2xl p-4 group transition-all hover:shadow-md overflow-visible"
              style={{ borderLeft: `3px solid ${tagConfig.color}` }}
            >
              {/* Row 1: Time + Duration + Delete */}
              <div className="flex items-center gap-3 mb-2">
                <select
                  value={routine.time}
                  onChange={(e) => updateRoutine(i, 'time', e.target.value)}
                  className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 text-sm font-medium appearance-none cursor-pointer"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
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
                <div className="flex-1" />
                <button
                  onClick={() => removeRoutine(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Row 2: Tag + Activity Input */}
              <div className="flex items-start gap-2">
                <TagSelector
                  value={routine.tag}
                  onChange={(tag) => updateRoutine(i, 'tag', tag)}
                />
                <div className="flex-1 relative">
                  <input
                    value={routine.activity}
                    onChange={(e) => updateRoutine(i, 'activity', e.target.value)}
                    placeholder="한 줄 메모 (예: 이메일 확인 및 답장)"
                    maxLength={MAX_CHARS}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none text-sm leading-relaxed py-1"
                  />
                  {charCount > 0 && (
                    <span
                      className={`absolute right-0 top-1 text-[10px] transition-colors ${
                        isOverWarn ? 'text-destructive font-semibold' : 'text-muted-foreground/40'
                      }`}
                    >
                      {charCount}/{MAX_CHARS}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <motion.button
        onClick={addRoutine}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-2xl border-2 border-dashed border-border hover:border-muted-foreground/30 py-4 flex items-center justify-center gap-2 text-muted-foreground text-sm transition-colors"
      >
        <Plus className="w-4 h-4" />
        활동 추가
      </motion.button>
    </div>
  );
}
