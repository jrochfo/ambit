// Material Symbols (Rounded, weight 400) as inline SVG. Only icons listed here are bundled;
// add one by importing it from @material-symbols/svg-400/rounded/<name>.svg?raw
// (names at https://fonts.google.com/icons). Icons take the surrounding text color.
import add from '@material-symbols/svg-400/rounded/add.svg?raw';
import close from '@material-symbols/svg-400/rounded/close.svg?raw';
import edit from '@material-symbols/svg-400/rounded/edit.svg?raw';

const ICONS = { add, close, edit };

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
