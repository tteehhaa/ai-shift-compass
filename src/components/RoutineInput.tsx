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

function addTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes % (24 * 60) / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
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

// 명백한 불일치 감지: 키워드가 다른 태그 그룹에 "강하게" 매칭될 때만 자동 변경
const STRONG_TAG_HINTS: { keywords: RegExp; tag: TagCategory }[] = [
  { keywords: /이메일|메일|보고서|문서|회의록|ppt|엑셀|행정|서류/, tag: '📧 단순 행정' },
  { keywords: /코딩|개발|프로그래밍|코드|디버깅|배포|서버/, tag: '💻 전문 업무' },
  { keywords: /공부|학습|강의|책|리서치|논문|독서|수업|과외/, tag: '📚 자기계발' },
  { keywords: /유튜브|틱톡|인스타|릴스|쇼츠|트위터|레딧|sns/, tag: '📱 소셜 미디어' },
  { keywords: /넷플릭스|드라마|영화|웹툰|만화|게임|방송/, tag: '🎬 미디어 감상' },
  { keywords: /운동|헬스|러닝|조깅|수영|축구|농구|등산|산책|요가|필라테스/, tag: '🏃 운동/활동' },
  { keywords: /회의|미팅|상담|면접|대화|통화|전화/, tag: '🤝 대면 소통' },
  { keywords: /수면|잠|낮잠|휴식|명상|목욕|샤워/, tag: '🛌 휴식/수면' },
  { keywords: /운전|출퇴근|통근|이동|버스|지하철/, tag: '🚗 운전' },
  { keywords: /식사|밥|점심|저녁|아침|요리|식당|배달/, tag: '🥗 식사/요리' },
  { keywords: /청소|빨래|장보기|쇼핑|세탁|정리/, tag: '🧹 집안일/쇼핑' },
];

function detectStrongMismatch(activity: string, currentTag: TagCategory): TagCategory | null {
  const t = activity.toLowerCase().trim();
  if (t.length < 2) return null;

  const currentGroup = TAG_CONFIG[currentTag].group;

  for (const hint of STRONG_TAG_HINTS) {
    if (hint.keywords.test(t)) {
      const hintGroup = TAG_CONFIG[hint.tag].group;
      // 같은 그룹이면 불일치 아님 → 자율권 보장
      if (hintGroup === currentGroup) return null;
      // 다른 그룹이면 명백한 불일치 → 자동 변경
      return hint.tag;
    }
  }
  return null;
}

export default function RoutineInput({ routines, onChange }: RoutineInputProps) {
  const sortTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const autoTagTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const triggerSort = (updated: RoutineEntry[]) => {
    if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current);
    sortTimeoutRef.current = setTimeout(() => {
      onChange(sortByTime(updated));
    }, 600);
  };

  useEffect(() => () => {
    if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current);
    if (autoTagTimeoutRef.current) clearTimeout(autoTagTimeoutRef.current);
  }, []);

  const addRoutine = () => {
    const last = routines[routines.length - 1];
    const nextTime = last ? addTime(last.time, last.duration) : '09:00';
    const newRoutine: RoutineEntry = { time: nextTime, activity: '', duration: 1, tag: '➕ 기타' };
    onChange([...routines, newRoutine]);
  };

  const updateRoutine = (index: number, field: keyof RoutineEntry, value: string | number | TagCategory) => {
    if (field === 'activity' && typeof value === 'string' && value.length > MAX_CHARS) return;

    let updated = routines.map((r, i) => i === index ? { ...r, [field]: value } : r);

    // 시간 또는 duration 변경 시 충돌 해결
    if (field === 'time' || field === 'duration') {
      if (field === 'time') {
        updated = sortByTime(updated);
      }

      // 변경된 항목의 새 인덱스 찾기
      const changedEntry = updated.find((r, i) => {
        if (field === 'time') return r.activity === routines[index].activity && r.tag === routines[index].tag && r.time === value;
        return i === index;
      });
      const changedIdx = changedEntry ? updated.indexOf(changedEntry) : index;

      // 위쪽: 변경된 항목 시작시간과 겹치는 이전 항목의 duration 축소
      if (changedIdx > 0) {
        const changedStart = timeToMinutes(updated[changedIdx].time);
        for (let j = changedIdx - 1; j >= 0; j--) {
          const prevStart = timeToMinutes(updated[j].time);
          const prevEnd = prevStart + updated[j].duration * 60;
          if (prevEnd > changedStart) {
            const newDuration = Math.max(0.5, (changedStart - prevStart) / 60);
            // 0.5시간 단위로 반올림(내림)
            const snapped = Math.floor(newDuration * 2) / 2;
            updated[j] = { ...updated[j], duration: Math.max(0.5, snapped) };
          }
        }
      }

      // 아래쪽: 기존대로 겹치면 뒤로 밀기
      for (let j = 1; j < updated.length; j++) {
        const prev = updated[j - 1];
        const prevEnd = timeToMinutes(addTime(prev.time, prev.duration));
        const currStart = timeToMinutes(updated[j].time);
        if (currStart < prevEnd) {
          updated[j] = { ...updated[j], time: addTime(prev.time, prev.duration) };
        }
      }
    }

    // 활동 내용 변경 시 태그 자동 변경 감지 (디바운스)
    if (field === 'activity' && typeof value === 'string') {
      if (autoTagTimeoutRef.current) clearTimeout(autoTagTimeoutRef.current);
      autoTagTimeoutRef.current = setTimeout(() => {
        const current = updated[index];
        if (!current) return;
        const suggested = detectStrongMismatch(current.activity, current.tag);
        if (suggested) {
          const autoUpdated = updated.map((r, i) => i === index ? { ...r, tag: suggested } : r);
          onChange(autoUpdated);
        }
      }, 800);
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
