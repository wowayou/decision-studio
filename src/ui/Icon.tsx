import type { CSSProperties } from 'react';
const paths = {
  studio: 'M4 5h6v5H4z M14 14h6v5h-6z M4 14h6v5H4z M7 10v4 M10 7.5h4q3 0 3 3V14',
  guide: 'm4 7 8-4 8 4-8 4z M4 12l8 4 8-4 M4 17l8 4 8-4',
  graph: 'M3 9h5v5H3z M16 3h5v5h-5z M16 16h5v5h-5z M8 11.5h3q2 0 2-2V7q0-1.5 3-1.5 M11 11.5q2 0 2 2v3q0 2 3 2',
  solutions: 'M4 6h6v13H4z M14 4h6v15h-6z',
  history: 'M3 11a9 9 0 1 1 2 7 M3 5v6h6 M12 7v6l4 2',
  folder: 'M3 6h7l2 2h9v12H3z', edit: 'm4 16 12-12 4 4L8 20H4z M14 6l4 4',
  check: 'm5 12 4.5 4.5L19 7', down: 'm6 9 6 6 6-6', right: 'm9 6 6 6-6 6', arrow: 'M4 12h16m-6-6 6 6-6 6', back: 'M20 12H4m6-6-6 6 6 6',
  template: 'M3 4h8v7H3z M15 4h6v7h-6z M3 15h8v5H3z M15 15h6v5h-6z',
  download: 'M12 3v12m-5-5 5 5 5-5 M4 16v4h16v-4', upload: 'M12 16V4m-5 5 5-5 5 5 M4 16v4h16v-4',
  info: 'M12 11v5 M12 7v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  terminal: 'm5 8 4 4-4 4 M12 16h6', globe: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M2 12h20 M12 2q-9 10 0 20 9-10 0-20',
  layers: 'm3 8 9-5 9 5-9 5z M3 13l9 5 9-5 M3 17l9 5 9-5',
  shield: 'M12 3 4 6v6q0 6 8 10 8-4 8-10V6z m-4 9 3 3 5-6',
  branch: 'M6 5v12a2 2 0 1 0 2 2 M6 14q11 0 11-7 M8 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M19 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  spark: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z', x: 'm6 6 12 12 M18 6 6 18',
  alert: 'M12 3 2 20h20z M12 10v4 M12 17v.5', refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]}/></svg>;
}
