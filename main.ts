// THE WORLD IN ONE IMAGE — Wednesday 25 November 2026
//
// A one-file Node program (Node 22, standard library only) that draws a
// dense one-page broadsheet of the day's world news and writes it as a
// 1024x1024 PNG to /output/entry.png.
//
// Everything is drawn from code: a hand-rolled PNG encoder (CRC32 +
// zlib deflate), a 5x7 bitmap font written out below as row strings, a
// dot-matrix world map, and a measured-flow layout — every block is
// wrapped and measured before a single pixel is stamped, columns are
// balanced by measured height, and the finished page height is
// asserted before the file is written. Deterministic: no clock, no
// randomness, no files, no network — the same bytes on every run.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- font ----
// Each glyph is 5 pixels wide and 7 tall, seven rows of five bits.
// Character advance is 6 units (glyph + 1 space) times the scale.

const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  X: ["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....", ".....", ".#...", "#...."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  ":": [".....", ".....", "..#..", ".....", "..#..", ".....", "....."],
  ";": [".....", ".....", "..#..", ".....", "..#..", ".#...", "#...."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "%": ["##..#", "##.#.", "....#", "...#.", "..#..", ".#...", "#.##."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "+": [".....", ".....", "..#..", ".###.", "..#..", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "$": ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "•": [".....", ".....", ".....", ".###.", ".###.", ".....", "....."],
};

// -------------------------------------------------------------- canvas ----
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [247, 241, 227];
const INK: RGB = [22, 17, 12];
const ACCENT: RGB = [142, 35, 35];
const GREY: RGB = [96, 89, 76];
const TINT: RGB = [238, 229, 205];
const LAND: RGB = [120, 106, 82];

function fill(x: number, y: number, w: number, h: number, c: RGB) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w));
  const y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
      i += 3;
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB) {
  for (let yy = -r; yy <= r; yy++) {
    for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy <= r * r) fill(cx + xx, cy + yy, 1, 1, c);
    }
  }
}

// ---------------------------------------------------------- text engine ---
function textWidth(str: string, scale: number, bold = false) {
  if (str.length === 0) return 0;
  return str.length * (bold ? 7 : 6) * scale - scale;
}

function wrap(str: string, scale: number, maxW: number, bold = false): string[] {
  const words = str.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line === "" ? word : line + " " + word;
    if (textWidth(trial, scale, bold) <= maxW || line === "") line = trial;
    else { lines.push(line); line = word; }
  }
  if (line !== "") lines.push(line);
  return lines;
}

function drawText(x: number, y: number, str: string, scale: number, c: RGB, bold = false) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const glyph = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[r][col] === "#") {
          fill(cx + col * scale, y + r * scale, scale, scale, c);
          if (bold) fill(cx + col * scale + scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale + (bold ? scale : 0);
  }
}

function drawCentered(y: number, str: string, scale: number, c: RGB, bold = false) {
  const w = textWidth(str, scale, bold);
  drawText((W - w) / 2, y, str, scale, c, bold);
}

function lineHeight(scale: number) {
  return 10 * scale;
}

// --------------------------------------------------------------- content --
const LEAD = {
  kicker: "RIYADH — THE LEAD STORY",
  headline: "HOUTHI STRIKE HITS RIYADH'S TALLEST TOWER, 11 WOUNDED",
  body: "A PROJECTILE STRUCK THE PIF TOWER, HOME OF SAUDI ARABIA'S $900BN WEALTH FUND, FOR THE SECOND TIME IN UNDER A WEEK. SAUDI CIVIL DEFENSE SAID 11 PEOPLE WERE WOUNDED AND SEVERAL FLOORS WERE DAMAGED. BRITAIN SANCTIONED THE HOUTHIS THE SAME DAY.",
  caption: "THE PIF TOWER, KING ABDULLAH FINANCIAL DISTRICT — STRUCK AGAIN ON TUESDAY",
};

const HEROES = [
  {
    kicker: "UKRAINE WAR — THE BALTIC",
    headline: "ZELENSKIY CONFIRMS UKRAINE HIT RUSSIAN SHIP IN GULF OF FINLAND",
    body: "KYIV SAYS THE SPARTA II WAS CARRYING WEAPONS AND WAS A LEGITIMATE TARGET. NORWAY, A STRONG KYIV ALLY, URGED CAUTION AS THE SHIP DRIFTED INTO FINNISH WATERS.",
  },
  {
    kicker: "US TRIAL — TECHNOLOGY",
    headline: "HUAWEI CONVICTED IN US TRIAL OVER IRAN BUSINESS",
    body: "A US JURY CONVICTED THE CHINESE TELECOM GIANT ON 10 OF 12 COUNTS, INCLUDING BANK FRAUD, SANCTIONS VIOLATIONS AND STEALING TRADE SECRETS.",
  },
  {
    kicker: "UKRAINE WAR — THE MEDITERRANEAN",
    headline: "UKRAINE SANK RUSSIAN WARSHIP OFF LIBYA",
    body: "THE CORVETTE MERKURY WENT DOWN AT BENGHAZI. KYIV INSISTS THE STRIKE WAS SELF-DEFENCE.",
  },
];

const BRIEFS: { tag: string; head: string; body: string }[] = [
  { tag: "MOSCOW TALKS", head: "LUKASHENKO OFFERS TO FLY WITH ZELENSKIY TO MOSCOW", body: "PUTIN ALLY FLOATS A JOINT TRIP FOR KREMLIN TALKS" },
  { tag: "KYIV FINANCES", head: "UKRAINE NEEDS $125BN IN SUPPORT FOR 2027", body: "EU PLEDGES COVER 90 BILLION OF THE TOTAL" },
  { tag: "DIPLOMACY", head: "HUNGARY'S MAGYAR MEETS ZELENSKIY IN ZAKARPATTIA", body: "MINORITY RIGHTS TOP THE BORDER TALKS AGENDA" },
  { tag: "SPACE", head: "NATO VOWS SPACE DEFENCE AMID NUCLEAR SATELLITE REPORTS", body: "A NUCLEAR SATELLITE COULD LAUNCH IN DECEMBER" },
  { tag: "FRANCE", head: "SARKOZY CORRUPTION CASE ORDERED TO TRIAL", body: "FIRST PRE-TRIAL HEARING SET FOR 1 APRIL 2027" },
  { tag: "GAZA", head: "ISRAELI AIRSTRIKE KILLS HAMAS OFFICIAL IN GAZA", body: "UN FLAGS WORSENING CONDITIONS FOR CIVILIANS" },
  { tag: "WASHINGTON", head: "TRUMP AWARDS GIULIANI THE MEDAL OF FREEDOM", body: "HIGHEST CIVILIAN HONOUR AT THE WHITE HOUSE" },
  { tag: "TEXAS", head: "FORT HOOD SHOOTER SEEKS STAY OF EXECUTION", body: "NIDAL HASAN'S EXECUTION IS SET FOR NEXT WEEK" },
  { tag: "SEOUL", head: "SOUTH KOREA EDUCATION MINISTER RESIGNS", body: "EXAM-CHEATING SCANDAL CLAIMS ITS FIRST MINISTER" },
  { tag: "THE HAGUE", head: "ICJ CONDEMNS MYANMAR OVER ROHINGYA", body: "UN COURT FINDS GENOCIDAL ACTIONS WERE COMMITTED" },
  { tag: "HORMUZ", head: "IRAN: THREE TANKERS HIT BY NAVAL MINES IN HORMUZ", body: "GUARD NAVY CLAIM RATTLES GLOBAL SHIPPING" },
  { tag: "POLAND", head: "NATO PLANS EARLY-WARNING AIRCRAFT FOR POLAND", body: "AFTER MISSILES LANDED DURING UKRAINE ATTACK" },
  { tag: "MARKETS", head: "ANTHROPIC SHARES TUMBLE BELOW $83 IPO PRICE", body: "NEARLY $200BN OF VALUE NOW AT RISK" },
  { tag: "TECH", head: "WAYMO SUSPENDS DRIVERLESS TAXIS FROM ALL US FREEWAYS", body: "FLEET PULLED PENDING A SAFETY REVIEW" },
  { tag: "SPORT", head: "ENGLAND BEAT AUSTRALIA IN SECOND T20I", body: "CHASE 185 TO WIN BY 8 WICKETS, SERIES LEVEL" },
  { tag: "CULTURE", head: "GTA 6 RELEASED WORLDWIDE TO RECORD QUEUES", body: "ROCKSTAR'S BLOCKBUSTER LANDED ON 19 NOVEMBER" },
  { tag: "TODAY", head: "WORLD MARKS DAY TO END VIOLENCE AGAINST WOMEN", body: "THE UN OBSERVANCE FALLS EVERY 25 NOVEMBER" },
  { tag: "SANCTIONS", head: "BRITAIN SANCTIONS HOUTHIS AND FOUR SENIOR OFFICIALS", body: "ANNOUNCED HOURS AFTER THE RIYADH STRIKE" },
  { tag: "WASHINGTON", head: "ZELENSKIY SETS OUT BACKUP PLAN IF PEACE PUSH FAILS", body: "WOULD ASK CONGRESS TO RAISE PRESSURE ON MOSCOW" },
  { tag: "AT SEA", head: "FIVE RUSSIAN VESSELS HIT IN ELEVEN DAYS", body: "KYIV'S DEEP-STRIKE CAMPAIGN, MAPPED" },
  { tag: "RIYADH", head: "FIRST TOWER STRIKE BLEW OUT WINDOWS ON SEVEN FLOORS", body: "THE 19 NOVEMBER HIT LEFT NO INJURIES" },
  { tag: "YEMEN", head: "COALITION STRUCK HODEIDAH PORT IN REPLY", body: "RETALIATION AFTER THE FIRST TOWER STRIKE" },
  { tag: "WARNING", head: "HOUTHIS VOWED 'AIRPORT FOR AIRPORT' ESCALATION", body: "THE THREAT CAME DAYS BEFORE TUESDAY'S STRIKE" },
  { tag: "THANKSGIVING", head: "TURKEY PARDON SPARES 'FREEDOM' AND 'FEATHERS'", body: "WHITE HOUSE TRADITION AHEAD OF THE HOLIDAY" },
  { tag: "BALTIC", head: "HIT SHIP DRIFTED INTO FINNISH WATERS, KYIV SAYS", body: "SPARTA II WAS CARRYING WEAPONS, SAYS ZELENSKIY" },
  { tag: "MOSCOW", head: "US ENVOYS PUSH FOR UKRAINE DEAL 'AS SOON AS POSSIBLE'", body: "KUSHNER AND WITKOFF MET IN MOSCOW ON 12 NOV" },
];

// A coarse dotted world: 15 rows of 72 cells, '#' is land.
const MAP = [
  "....##########..............................###############...........",
  "..##############.........##......######....####################.........",
  ".################.......###......#####################..######........",
  "..#############..........##.......####################................",
  "...##########.....................#################...................",
  "....########......................################....................",
  ".....######......................##############......................",
  "......####........................##########.......##................",
  ".......###.........................########........###...............",
  "......#####........................########........####..............",
  ".....#######........................######..........################..",
  ".....######..........................####...........################..",
  "......####...........................###.............##########.......",
  ".......##.............................#...............########........",
  "........................................................................",
];
const MARKERS: { col: number; row: number; label: string; lx?: number; ly?: number }[] = [
  { col: 37, row: 2, label: "BALTIC", lx: -8, ly: -13 },
  { col: 38, row: 5, label: "LIBYA", lx: -44, ly: -2 },
  { col: 41, row: 6, label: "RIYADH", lx: -6, ly: 12 },
  { col: 45, row: 6, label: "HORMUZ" },
  { col: 13, row: 4, label: "WASHINGTON" },
  { col: 63, row: 4, label: "SEOUL" },
];

// ------------------------------------------------------------- skyline ----
function drawSkyline(x: number, y: number, w: number, h: number) {
  const DUSK: RGB = [74, 34, 30];
  const TOWER: RGB = [30, 20, 18];
  const LIT: RGB = [255, 196, 92];
  const SMOKE: RGB = [128, 118, 108];
  fill(x, y, w, h, DUSK);
  fill(x, y + h - 14, w, 14, [18, 12, 12]);
  // neighbouring blocks
  const blocks: [number, number][] = [[0.04, 0.52], [0.16, 0.66], [0.30, 0.44], [0.72, 0.58], [0.84, 0.72], [0.93, 0.5]];
  for (const [fx, fh] of blocks) {
    const bw = w * 0.09;
    const bh = h * fh;
    const bx = x + w * fx;
    const by = y + h - 14 - bh;
    fill(bx, by, bw, bh, TOWER);
    for (let wy = by + 6; wy < by + bh - 6; wy += 9) {
      for (let wx = bx + 5; wx < bx + bw - 5; wx += 8) {
        if ((wx * 7 + wy * 13) % 5 !== 0) fill(wx, wy, 3, 4, LIT);
      }
    }
  }
  // the PIF tower: tall, with its slanted crown
  const tx = x + w * 0.47;
  const tw = w * 0.17;
  const th = h * 0.92;
  const ty = y + h - 14 - th;
  fill(tx, ty + 12, tw, th - 12, TOWER);
  for (let i = 0; i < 12; i++) fill(tx + i * (tw / 12), ty + 12 - i, tw / 12, 2, TOWER);
  for (let wy = ty + 20; wy < ty + th - 8; wy += 9) {
    for (let wx = tx + 6; wx < tx + tw - 6; wx += 9) {
      if ((wx * 3 + wy * 11) % 4 !== 0) fill(wx, wy, 3, 4, LIT);
    }
  }
  // the wound: dark gash + smoke plume + one ember. The plume stays
  // inside the panel: a disc that would cross the top edge is skipped.
  fill(tx + tw * 0.3, ty + th * 0.3, tw * 0.45, th * 0.16, [8, 6, 6]);
  disc(tx + tw * 0.5, ty + th * 0.36, 3, [255, 110, 40]);
  for (let i = 0; i < 7; i++) {
    const cx = tx + tw * 0.55 + i * 8;
    const cy = ty + th * 0.3 - i * 5;
    const r = 4 + i * 2;
    if (cy - r < y + 3) continue;
    disc(cx, cy, r, SMOKE);
  }
}

// --------------------------------------------------------------- layout ---
fill(0, 0, W, H, PAPER);
const M = 28; // margin
const CW = W - 2 * M; // content width
let y = 22;

fill(M, y, CW, 3, INK); y += 6;
fill(M, y, CW, 1, INK); y += 12;
drawCentered(y, "THE WORLD IN ONE IMAGE", 4, INK, true); y += 28 + 8;
drawCentered(y, "ONE PAGE • EVERY STORY THAT MATTERS • THE WEDNESDAY EDITION", 1, GREY); y += 7 + 8;
fill(M, y, CW, 2, INK); y += 8;

// date strip
drawText(M, y, "VOL. 1 - NO. 329", 2, INK);
drawCentered(y, "WEDNESDAY 25 NOVEMBER 2026", 2, ACCENT, true);
{
  const s = "PRICE: ONE IMAGE";
  drawText(W - M - textWidth(s, 2), y, s, 2, INK);
}
y += 14 + 8;
// date-check box
fill(M, y, CW, 2, ACCENT);
fill(M, y + 22, CW, 2, ACCENT);
fill(M, y, 2, 24, ACCENT);
fill(W - M - 2, y, 2, 24, ACCENT);
drawCentered(y + 5, "DATE CHECK: WEDNESDAY 25 NOVEMBER 2026 — DAY 329 OF 2026", 2, ACCENT, true);
y += 24 + 10;

// heroes row
const heroTop = y;
{
  const lw = 596;
  drawText(M, y, LEAD.kicker, 1, ACCENT, true); y += lineHeight(1) + 4;
  for (const ln of wrap(LEAD.headline, 3, lw, true)) { drawText(M, y, ln, 3, INK, true); y += lineHeight(3); }
  y += 4;
  for (const ln of wrap(LEAD.body, 1, lw)) { drawText(M, y, ln, 1, INK); y += lineHeight(1); }
  y += 8;
  drawSkyline(M, y, lw, 80); y += 80 + 6;
  drawText(M, y, LEAD.caption, 1, GREY); y += lineHeight(1);
}
const leadBottom = y;
{
  let ry = heroTop;
  const rx = M + 624;
  const rw = CW - 624;
  HEROES.forEach((hero, i) => {
    if (i > 0) { fill(rx, ry, rw, 1, GREY); ry += 7; }
    drawText(rx, ry, hero.kicker, 1, ACCENT, true); ry += lineHeight(1) + 2;
    for (const ln of wrap(hero.headline, 2, rw, true)) { drawText(rx, ry, ln, 2, INK, true); ry += lineHeight(2); }
    ry += 3;
    for (const ln of wrap(hero.body, 1, rw)) { drawText(rx, ry, ln, 1, INK); ry += lineHeight(1); }
    ry += 5;
  });
  y = Math.max(leadBottom, ry);
}
y += 6;
fill(M, y, CW, 2, INK); y += 10;

// map strip
drawText(M, y, "WHERE TODAY HAPPENED — THE DAY ON ONE MAP", 1, INK, true); y += lineHeight(1) + 6;
{
  const pitchX = CW / 72;
  const pitchY = 6.8;
  for (let r = 0; r < MAP.length; r++) {
    const row = MAP[r].padEnd(72, ".").slice(0, 72);
    for (let c = 0; c < 72; c++) {
      if (row[c] === "#") fill(M + c * pitchX + 2, y + r * pitchY + 2, 4, 4, LAND);
    }
  }
  for (const mk of MARKERS) {
    const mx = M + mk.col * pitchX;
    const my = y + mk.row * pitchY;
    fill(mx - 2, my - 2, 9, 9, ACCENT);
    drawText(mx + (mk.lx ?? 10), my + (mk.ly ?? -2), mk.label, 1, ACCENT, true);
  }
  y += MAP.length * pitchY + 8;
}
fill(M, y, CW, 1, GREY); y += 10;

// briefs
drawText(M, y, "THE WORLD IN BRIEF — 26 MORE STORIES FROM TODAY'S WIRES", 1, INK, true); y += lineHeight(1) + 6;
{
  const colW = 312;
  const colX = [M, M + 328, M + 656];
  const bottomLimit = 970;
  // Each brief runs its tag into the first headline line ("GAZA: …"),
  // broadsheet style, which buys the lines a separate tag line cost.
  type Laid = { tag: string; tagW: number; headLines: string[]; bodyLines: string[]; h: number };
  const laid: Laid[] = BRIEFS.map((b) => {
    const tag = b.tag + ":";
    const tagW = textWidth(tag, 1, true) + 7;
    const words = b.head.split(" ");
    const headLines: string[] = [];
    let line = "";
    let limit = colW - tagW;
    for (const word of words) {
      const trial = line === "" ? word : line + " " + word;
      if (textWidth(trial, 1, true) <= limit || line === "") line = trial;
      else { headLines.push(line); line = word; limit = colW; }
    }
    if (line !== "") headLines.push(line);
    const bodyLines = wrap(b.body, 1, colW).slice(0, 1);
    return { tag, tagW, headLines, bodyLines, h: (headLines.length + bodyLines.length) * lineHeight(1) + 9 };
  });
  // sequential fill: a column takes items until the next would overflow
  const columns: Laid[][] = [[], [], []];
  let ci = 0;
  let colH = 0;
  for (const item of laid) {
    if (colH + item.h > bottomLimit - y && ci < 2) { ci++; colH = 0; }
    columns[ci].push(item);
    colH += item.h;
  }
  if (columns[2].length && y + columns[2].reduce((s, i) => s + i.h, 0) > bottomLimit) {
    throw new Error("briefs overflow the page");
  }
  columns.forEach((items, c) => {
    let cy = y;
    for (const item of items) {
      item.headLines.forEach((ln, li) => {
        if (li === 0) {
          drawText(colX[c], cy, item.tag, 1, ACCENT, true);
          drawText(colX[c] + item.tagW, cy, ln, 1, INK, true);
        } else {
          drawText(colX[c], cy, ln, 1, INK, true);
        }
        cy += lineHeight(1);
      });
      for (const ln of item.bodyLines) { drawText(colX[c], cy, ln, 1, GREY); cy += lineHeight(1); }
      cy += 4;
      fill(colX[c], cy, colW - 14, 1, TINT);
      cy += 5;
    }
  });
  y = bottomLimit;
}

// footer
fill(M, y, CW, 2, INK); y += 8;
drawCentered(y, "COMPILED FROM REUTERS AND WIRE REPORTS • THE WORLD IN ONE IMAGE • WEDNESDAY 25 NOVEMBER 2026", 1, GREY);
y += lineHeight(1) + 6;
if (y > H - 8) throw new Error(`page overflow: content ends at ${y}px of ${H}`);

// ------------------------------------------------------------ PNG out -----
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let row = 0; row < H; row++) {
    raw[row * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, row * W * 3, W * 3).copy(raw, row * (1 + W * 3) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const png = encodePNG();
writeFileSync(join(outDir, "entry.png"), png);
console.log(`wrote entry.png: ${W}x${H}, ${png.length} bytes`);
