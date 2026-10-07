// Material Symbols (Rounded, weight 400) as inline SVG. Only icons listed here are bundled;
// add one by importing it from @material-symbols/svg-400/rounded/<name>.svg?raw
// (names at https://fonts.google.com/icons). Icons take the surrounding text color.
import accessible from '@material-symbols/svg-400/rounded/accessible.svg?raw';
import add from '@material-symbols/svg-400/rounded/add.svg?raw';
import close from '@material-symbols/svg-400/rounded/close.svg?raw';
import directionsWalk from '@material-symbols/svg-400/rounded/directions_walk.svg?raw';
import edit from '@material-symbols/svg-400/rounded/edit.svg?raw';
import openInNew from '@material-symbols/svg-400/rounded/open_in_new.svg?raw';

const ICONS = { accessible, add, close, directionsWalk, edit, openInNew };

export type IconName = keyof typeof ICONS;

/** Decorative icon; give its button an aria-label or visible text. */
export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <span
      className={className ? `icon ${className}` : 'icon'}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
