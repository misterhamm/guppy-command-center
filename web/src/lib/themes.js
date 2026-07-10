// Theme palettes ported from the handoff data.js. Static surfaces use the CSS
// variables in styles.css; these values feed computed chip/status colors. The
// two must stay in sync.

export const THEMES = {
  light: {
    ink: '#201D1A', soft: '#4a443b', muted: '#6E6759', faint: '#8a8375',
    card: '#ffffff', cardAlt: '#FBF9F5', panel: '#F1EDE4',
    line: 'rgba(32,29,26,.1)', line2: 'rgba(32,29,26,.15)',
    green: '#1E7A52', greenHover: '#14593B', greenSoft: 'rgba(30,122,82,.09)',
    red: '#C2452D', redSoft: 'rgba(194,69,45,.12)',
    amber: '#B98A2A', cream: '#F5E3BC', creamBg: '#FBF6E8', creamText: '#7a4d00',
    lavBg: '#EEEAF5', lavText: '#6A5D93',
    boxBorder: '#b8b0a2', boxBg: '#ffffff', doneName: '#a09884',
    toastAccent: '#7FD4A8',
    PR: {
      ASAP: { bg: '#C2452D', color: '#fff', rank: 0, weight: '800' },
      HIGH: { bg: 'rgba(194,69,45,.14)', color: '#A23A24', rank: 1, weight: '800' },
      NOW: { bg: '#F5E3BC', color: '#7a4d00', rank: 2, weight: '800' },
      SOON: { bg: '#EDE9E1', color: '#4a443b', rank: 3, weight: '800' },
      SOMEDAY: { bg: '#F1EDE4', color: '#6E6759', rank: 4, weight: '800' }
    },
    STATUS: {
      'At Risk': { rail: '#C2452D', bg: '#C2452D', color: '#fff', word: 'AT RISK' },
      'Waiting': { rail: '#B98A2A', bg: '#F5E3BC', color: '#7a4d00', word: 'WAITING' },
      'Active': { rail: '#1E7A52', bg: 'rgba(30,122,82,.1)', color: '#1E7A52', word: 'ACTIVE' },
      'Standby': { rail: '#6A5D93', bg: '#EEEAF5', color: '#6A5D93', word: 'STANDBY' },
      'On Hold': { rail: '#8a8375', bg: '#EDE9E1', color: '#4a443b', word: 'ON HOLD' }
    }
  },
  dark: {
    ink: '#EDE7DA', soft: '#C4BCAC', muted: '#A69D8B', faint: '#968E7C',
    card: '#302B23', cardAlt: '#26221B', panel: '#2A2620',
    line: 'rgba(237,231,218,.16)', line2: 'rgba(237,231,218,.26)',
    green: '#3FB37D', greenHover: '#57C592', greenSoft: 'rgba(63,179,125,.18)',
    red: '#E0654B', redSoft: 'rgba(224,101,75,.2)',
    amber: '#D0A544', cream: '#3B3115', creamBg: '#332C18', creamText: '#E4BC64',
    lavBg: '#2B2836', lavText: '#A99BC9',
    boxBorder: '#847B67', boxBg: '#26221B', doneName: '#6E675A',
    toastAccent: '#1E7A52',
    PR: {
      ASAP: { bg: '#E0654B', color: '#fff', rank: 0, weight: '800' },
      HIGH: { bg: 'rgba(224,101,75,.2)', color: '#E0654B', rank: 1, weight: '800' },
      NOW: { bg: '#3B3115', color: '#E4BC64', rank: 2, weight: '800' },
      SOON: { bg: '#403A2F', color: '#C4BCAC', rank: 3, weight: '800' },
      SOMEDAY: { bg: '#2A2620', color: '#A69D8B', rank: 4, weight: '800' }
    },
    STATUS: {
      'At Risk': { rail: '#E0654B', bg: '#E0654B', color: '#fff', word: 'AT RISK' },
      'Waiting': { rail: '#D0A544', bg: '#3B3115', color: '#E4BC64', word: 'WAITING' },
      'Active': { rail: '#3FB37D', bg: 'rgba(63,179,125,.2)', color: '#3FB37D', word: 'ACTIVE' },
      'Standby': { rail: '#A99BC9', bg: '#2B2836', color: '#A99BC9', word: 'STANDBY' },
      'On Hold': { rail: '#968E7C', bg: '#403A2F', color: '#C4BCAC', word: 'ON HOLD' }
    }
  }
};

export function concernDot(tone, P) { return tone === 'red' ? P.red : tone === 'amber' ? P.amber : P.faint; }
