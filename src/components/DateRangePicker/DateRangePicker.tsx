"use client";

import { useMemo, useState } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { todayIso } from "@/lib/searchFilters";
import styles from "./DateRangePicker.module.css";

interface DateRangePickerProps {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  /**
   * Danh sách ngày yyyy-mm-dd KHÔNG đặt được (do backend trả — xem
   * lib/booking/availability.ts). Các ô này bị bôi xám, không bấm được, và
   * không thể chọn một khoảng "nhảy qua" chúng.
   */
  disabledDates?: string[];
  /** Ngày sớm nhất chọn được — mặc định hôm nay. */
  minDate?: string;
  /** Ngày muộn nhất chọn được (backend giới hạn cửa sổ đặt phòng). */
  maxDate?: string;
  /** Đang tải danh sách ngày kín từ backend. */
  loading?: boolean;
  /** Số tháng hiển thị cạnh nhau (mặc định 2; màn hẹp CSS tự rút còn 1). */
  monthsToShow?: number;
}

interface DayCell {
  iso: string;
  day: number;
  outside: boolean; // thuộc tháng khác, chỉ để lấp lưới
}

function isoToParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

function partsToIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function firstOfMonth(iso: string): { year: number; month: number } {
  const [y, m] = isoToParts(iso);
  return { year: y, month: m };
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

// Lưới 6 hàng x 7 cột, bắt đầu từ Thứ Hai.
function buildMonthGrid(year: number, month: number): DayCell[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0 = Thứ Hai
  const cells: DayCell[] = [];

  const prev = addMonths(year, month, -1);
  const daysInPrev = new Date(prev.year, prev.month, 0).getDate();
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    cells.push({ iso: partsToIso(prev.year, prev.month, d), day: d, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: partsToIso(year, month, d), day: d, outside: false });
  }
  const next = addMonths(year, month, 1);
  let d = 1;
  while (cells.length < 42) {
    cells.push({ iso: partsToIso(next.year, next.month, d), day: d, outside: true });
    d++;
  }
  return cells;
}

// Có ngày kín nào nằm trong khoảng [start, end) không (end = ngày trả, không tính đêm cuối).
function rangeHasBlocked(start: string, end: string, blocked: Set<string>): boolean {
  const [sy, sm, sd] = isoToParts(start);
  const cur = new Date(sy, sm - 1, sd);
  const [ey, em, ed] = isoToParts(end);
  const endDate = new Date(ey, em - 1, ed);
  while (cur < endDate) {
    const iso = partsToIso(cur.getFullYear(), cur.getMonth() + 1, cur.getDate());
    if (blocked.has(iso)) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  disabledDates = [],
  minDate,
  maxDate,
  loading = false,
  monthsToShow = 2,
}: DateRangePickerProps) {
  const { language } = useLanguage();
  const today = todayIso();
  const min = minDate && minDate > today ? minDate : today;

  const blocked = useMemo(() => new Set(disabledDates), [disabledDates]);

  const [view, setView] = useState(() => firstOfMonth(checkIn ?? min));

  const monthLabel = (year: number, month: number) =>
    new Date(year, month - 1, 1).toLocaleDateString(language === "en" ? "en-US" : "vi-VN", {
      month: "long",
      year: "numeric",
    });

  const weekdayLabels =
    language === "en"
      ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
      : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const handlePick = (iso: string) => {
    // Bắt đầu khoảng mới nếu: chưa có check-in, đã có đủ cả 2, hoặc bấm vào
    // ngày <= check-in hiện tại, hoặc khoảng mới "nhảy qua" ngày kín.
    if (!checkIn || (checkIn && checkOut) || iso <= checkIn) {
      onChange(iso, null);
      return;
    }
    if (rangeHasBlocked(checkIn, iso, blocked)) {
      onChange(iso, null);
      return;
    }
    onChange(checkIn, iso);
  };

  const cellState = (cell: DayCell) => {
    const past = cell.iso < min || (maxDate !== undefined && cell.iso > maxDate);
    const isBlocked = blocked.has(cell.iso);
    // Ngày đầu của 1 booking khác vẫn chọn được làm NGÀY TRẢ phòng (khách cũ
    // nhận phòng hôm đó, mình trả sáng hôm đó) nếu các đêm ở giữa còn trống.
    const canCheckOut =
      isBlocked && !!checkIn && !checkOut && cell.iso > checkIn && !rangeHasBlocked(checkIn, cell.iso, blocked);
    const disabled = past || (isBlocked && !canCheckOut);
    const isStart = cell.iso === checkIn;
    const isEnd = cell.iso === checkOut;
    const inRange =
      checkIn && checkOut && cell.iso > checkIn && cell.iso < checkOut;
    return { disabled, isBlocked: isBlocked && !canCheckOut, past, isStart, isEnd, inRange };
  };

  const months = Array.from({ length: monthsToShow }, (_, i) => addMonths(view.year, view.month, i));

  return (
    <div className={styles.picker} data-loading={loading || undefined}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setView(addMonths(view.year, view.month, -1))}
          aria-label={language === "en" ? "Previous month" : "Tháng trước"}
        >
          <CaretLeftIcon size={14} weight="bold" />
        </button>
        <div className={styles.monthTitles}>
          {months.map((m) => (
            <span key={`${m.year}-${m.month}`} className={styles.monthTitle}>
              {monthLabel(m.year, m.month)}
            </span>
          ))}
        </div>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setView(addMonths(view.year, view.month, 1))}
          aria-label={language === "en" ? "Next month" : "Tháng sau"}
        >
          <CaretRightIcon size={14} weight="bold" />
        </button>
      </div>

      <div className={styles.months}>
        {months.map((m) => {
          const grid = buildMonthGrid(m.year, m.month);
          return (
            <div key={`${m.year}-${m.month}`} className={styles.month}>
              <div className={styles.weekdays}>
                {weekdayLabels.map((w) => (
                  <span key={w} className={styles.weekday}>
                    {w}
                  </span>
                ))}
              </div>
              <div className={styles.grid}>
                {grid.map((cell) => {
                  const s = cellState(cell);
                  const classes = [styles.cell];
                  if (cell.outside) classes.push(styles.cellOutside);
                  if (s.disabled) classes.push(styles.cellDisabled);
                  if (s.isBlocked) classes.push(styles.cellBlocked);
                  if (s.isStart) classes.push(styles.cellStart);
                  if (s.isEnd) classes.push(styles.cellEnd);
                  if (s.inRange) classes.push(styles.cellInRange);
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      className={classes.join(" ")}
                      disabled={s.disabled}
                      aria-pressed={s.isStart || s.isEnd}
                      onClick={() => handlePick(cell.iso)}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
