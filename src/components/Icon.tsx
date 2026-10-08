// Material Symbols (Rounded, weight 400) as inline SVG. Only icons listed here are bundled;
// add one by importing it from @material-symbols/svg-400/rounded/<name>.svg?raw
// (names at https://fonts.google.com/icons). Icons take the surrounding text color.
import accessible from '@material-symbols/svg-400/rounded/accessible.svg?raw';
import add from '@material-symbols/svg-400/rounded/add.svg?raw';
import bookmarkAdd from '@material-symbols/svg-400/rounded/bookmark_add.svg?raw';
import bookmarkAdded from '@material-symbols/svg-400/rounded/bookmark_added-fill.svg?raw';
import close from '@material-symbols/svg-400/rounded/close.svg?raw';
import darkMode from '@material-symbols/svg-400/rounded/dark_mode.svg?raw';
import directionsWalk from '@material-symbols/svg-400/rounded/directions_walk.svg?raw';
import edit from '@material-symbols/svg-400/rounded/edit.svg?raw';
import info from '@material-symbols/svg-400/rounded/info.svg?raw';
import keyboardArrowDown from '@material-symbols/svg-400/rounded/keyboard_arrow_down.svg?raw';
import lightMode from '@material-symbols/svg-400/rounded/light_mode.svg?raw';
import openInNew from '@material-symbols/svg-400/rounded/open_in_new.svg?raw';
import star from '@material-symbols/svg-400/rounded/star.svg?raw';
import starFill from '@material-symbols/svg-400/rounded/star-fill.svg?raw';
import tune from '@material-symbols/svg-400/rounded/tune.svg?raw';
import visibility from '@material-symbols/svg-400/rounded/visibility.svg?raw';
import visibilityOff from '@material-symbols/svg-400/rounded/visibility_off.svg?raw';

const ICONS = { accessible, add, bookmarkAdd, bookmarkAdded, close, darkMode, directionsWalk, edit, info, keyboardArrowDown, lightMode, openInNew, star, starFill, tune, visibility, visibilityOff };

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

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
