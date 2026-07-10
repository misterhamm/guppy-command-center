// Presentation metadata derived from data + palette. Ported from the
// prototypes' enrich()/enrichEv()/project mapping so desktop and mobile share
// one set of rules.

import { dueMeta, timeRange } from './dates.js';
import { concernDot } from './themes.js';
import { isStale, staleDays, JOIN_URLS } from './logic.js';

export function taskView(t, P, todayISO) {
  const pr = P.PR[t.priority] || P.PR.SOON;
  const dm = dueMeta(t.dueISO, todayISO);
  return {
    check: t.done ? '✓' : '',
    boxBg: t.done ? P.green : P.boxBg,
    boxBorder: t.done ? P.green : P.boxBorder,
    strike: t.done ? 'line-through' : 'none',
    nameColor: t.done ? P.doneName : P.ink,
    opacity: t.done && !t.justDone ? 0.6 : 1,
    dueDisplay: dm.label,
    dueColor: dm.late > 0 ? P.red : dm.isToday ? P.ink : P.soft,
    prColor: pr.color, prBg: pr.bg,
    clientChip: t.personal ? 'Personal' : t.client,
    clientChipBg: t.personal ? P.lavBg : P.panel,
    clientChipColor: t.personal ? P.lavText : P.soft,
    projChipColor: P.green, projChipBg: P.greenSoft
  };
}

export function projectView(p, tasks, P, todayISO) {
  const st = P.STATUS[p.status] || P.STATUS.Active;
  const rel = tasks.filter(t => t.project === p.name && !t.done);
  const chips = [];
  const od = rel.filter(t => dueMeta(t.dueISO, todayISO).late > 0).length;
  const td = rel.filter(t => t.dueISO === todayISO).length;
  if (od) chips.push({ text: od + ' overdue', bg: P.redSoft, color: P.red });
  if (td) chips.push({ text: td + ' due today', bg: P.cream, color: P.creamText });
  if (isStale(p, todayISO)) chips.push({ text: 'Stale · ' + staleDays(p, todayISO) + 'd', bg: P.cream, color: P.creamText });
  chips.push(rel.length ? { text: rel.length + ' open', bg: P.panel, color: P.soft } : { text: 'No open tasks', bg: P.panel, color: P.soft });
  return {
    rail: st.rail, badgeBg: st.bg, badgeColor: st.color, statusWord: st.word,
    opacity: p.status === 'On Hold' ? 0.8 : 1,
    concerns: (p.concerns || []).map(c => ({ ...c, dot: concernDot(c.tone, P) })),
    topConcern: p.concerns && p.concerns[0] ? p.concerns[0].text : '',
    chips
  };
}

// Event kind: placeholder (tagged/`Placeholder:` title) > past > next (first
// upcoming today) > plain. `isNext` is decided by the caller since it needs the
// whole day's events.
export function eventKind(ev, dayISO, todayISO, nowMin, isNext) {
  const placeholder = !!ev.tag || /^\s*\[?placeholder\b/i.test(ev.title || '');
  const past = dayISO < todayISO || (dayISO === todayISO && (ev.endMin || ev.startMin + 30) <= nowMin);
  if (placeholder) return 'placeholder';
  if (past) return 'past';
  if (isNext) return 'next';
  return 'plain';
}

export function eventView(ev, kind, P) {
  const styles = {
    past: { opacity: 0.55, bg: 'var(--card)', rail: 'transparent', timeColor: P.soft, titleColor: P.ink, stripBorder: '1px solid ' + P.line },
    plain: { opacity: 1, bg: 'var(--card)', rail: 'transparent', timeColor: P.soft, titleColor: P.ink, stripBorder: '1px solid ' + P.line },
    next: { opacity: 1, bg: P.greenSoft, rail: P.green, timeColor: P.green, titleColor: P.ink, stripBorder: '1.5px solid ' + P.green },
    placeholder: { opacity: 1, bg: P.creamBg, rail: P.amber, timeColor: P.soft, titleColor: P.soft, stripBorder: '1.5px dashed ' + P.amber }
  }[kind];
  const tag = kind === 'next' ? 'UP NEXT' : ev.tag || (kind === 'placeholder' ? 'PLACEHOLDER' : '');
  const tagStyle = tag === 'UP NEXT' ? { tagBg: 'transparent', tagColor: P.green } : { tagBg: P.cream, tagColor: P.creamText };
  return {
    ...styles, ...tagStyle,
    tag, hasTag: !!tag,
    past: kind === 'past',
    displayTitle: kind === 'placeholder' ? (ev.title || '').replace(/^\s*\[?placeholder\]?\s*[:\-]?\s*/i, '') : ev.title,
    time: timeRange(ev.startMin, ev.endMin),
    locLabel: ev.location || 'No room',
    hasJoin: !!ev.join && kind !== 'past',
    join: ev.join,
    joinUrl: ev.joinUrl || JOIN_URLS[ev.join] || '#'
  };
}
