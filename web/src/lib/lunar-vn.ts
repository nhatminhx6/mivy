// Âm lịch Việt Nam (thuật toán Hồ Ngọc Đức, múi giờ +7). Thuần tính toán, chạy được cả server/client.

const INT = Math.floor;
const PI = Math.PI;
const TZ = 7;

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  return jd;
}

function newMoon(k: number): number {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + C1 - deltat;
}
const newMoonDay = (k: number) => INT(newMoon(k) + 0.5 + TZ / 24);

function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L = L - PI * 2 * INT(L / (PI * 2));
  return L;
}
const sunLong = (dayNumber: number) => INT((sunLongitude(dayNumber - 0.5 - TZ / 24) / PI) * 6);

function lunarMonth11(yy: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = newMoonDay(k);
  if (sunLong(nm) >= 9) nm = newMoonDay(k - 1);
  return nm;
}

function leapMonthOffset(a11: number): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0, i = 1;
  let arc = sunLong(newMoonDay(k + i));
  do { last = arc; i++; arc = sunLong(newMoonDay(k + i)); } while (arc !== last && i < 14);
  return i - 1;
}

export interface LunarDate { day: number; month: number; year: number; leap: boolean }

export function solarToLunar(dd: number, mm: number, yy: number): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = newMoonDay(k);
  let a11 = lunarMonth11(yy), b11 = a11, lunarYear: number;
  if (a11 >= monthStart) { lunarYear = yy; a11 = lunarMonth11(yy - 1); }
  else { lunarYear = yy + 1; b11 = lunarMonth11(yy + 1); }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let leap = false, lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const lm = leapMonthOffset(a11);
    if (diff >= lm) { lunarMonth = diff + 10; if (diff === lm) leap = true; }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap };
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
export const canChiYear = (y: number) => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;
export const LUNAR_MONTH_NAMES = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp'];

export interface DayInfo {
  d: number; dow: number;           // dow: 0 = Thứ Hai … 6 = Chủ nhật
  lunar: LunarDate;
  holiday?: string;                 // ngày nghỉ lễ (tô đỏ)
  event?: string;                   // ngày đáng nhớ (ghi chú, không nghỉ)
}

const SOLAR_HOLIDAYS: Record<string, string> = {
  '1/1': 'Tết Dương lịch', '30/4': 'Giải phóng miền Nam', '1/5': 'Quốc tế Lao động', '2/9': 'Quốc khánh',
};
const SOLAR_EVENTS: Record<string, string> = {
  '14/2': 'Lễ Tình nhân', '8/3': 'Quốc tế Phụ nữ', '1/6': 'Quốc tế Thiếu nhi', '20/10': 'Phụ nữ Việt Nam', '20/11': 'Nhà giáo Việt Nam', '24/12': 'Giáng sinh',
};
const LUNAR_HOLIDAYS: Record<string, string> = { '1/1': 'Mùng 1 Tết', '2/1': 'Mùng 2 Tết', '3/1': 'Mùng 3 Tết', '10/3': 'Giỗ Tổ Hùng Vương' };
const LUNAR_EVENTS: Record<string, string> = { '15/1': 'Rằm tháng Giêng', '15/7': 'Vu Lan', '15/8': 'Trung thu', '23/12': 'Ông Công ông Táo' };

export function monthDays(month: number, year: number): DayInfo[] {
  const n = new Date(year, month, 0).getDate();
  const out: DayInfo[] = [];
  for (let d = 1; d <= n; d++) {
    const dow = (new Date(year, month - 1, d).getDay() + 6) % 7;
    const lunar = solarToLunar(d, month, year);
    const sk = `${d}/${month}`, lk = `${lunar.day}/${lunar.month}`;
    let holiday = SOLAR_HOLIDAYS[sk] || (!lunar.leap ? LUNAR_HOLIDAYS[lk] : undefined);
    const event = SOLAR_EVENTS[sk] || (!lunar.leap ? LUNAR_EVENTS[lk] : undefined);
    // giao thừa (ngày cuối tháng Chạp) cũng là ngày nghỉ
    if (!holiday && lunar.month === 12 && !lunar.leap) {
      const next = new Date(year, month - 1, d + 1);
      const ln = solarToLunar(next.getDate(), next.getMonth() + 1, next.getFullYear());
      if (ln.day === 1 && ln.month === 1) holiday = 'Giao thừa';
    }
    out.push({ d, dow, lunar, holiday, event });
  }
  return out;
}
