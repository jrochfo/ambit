const support = new Map<string, boolean>();

/**
 * First emoji in the list this device can draw in color. Newer emoji (e.g. 🪩, 2021)
 * show as an empty box on older systems, so categories list older fallbacks last.
 */
export function pickEmoji(options: readonly string[]): string {
  return options.find(isSupported) ?? options[options.length - 1]!;
}

export function isSupported(emoji: string): boolean {
  let ok = support.get(emoji);
  if (ok === undefined) {
    ok = drawsInColor(emoji);
    support.set(emoji, ok);
  }
  return ok;
}

// Draw the emoji in black: a real emoji glyph comes out in color, a missing one
// falls back to a black outline box ("tofu").
function drawsInColor(emoji: string): boolean {
  try {
    const size = 24;
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    ctx.canvas.width = ctx.canvas.height = size;
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';
    ctx.font = `${size - 4}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.fillText(emoji, 0, 0);
    const { data } = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
      if (a > 0 && (r !== g || g !== b)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Choices offered when changing a custom category's emoji (unsupported ones are hidden). */
export const EMOJI_CHOICES = [
  '📍', '⭐', '❤️', '🏠', '🛍️', '🎁', '🎨', '🎵', '🎮', '📷',
  '🍕', '🍣', '🍔', '🌮', '🍜', '🥗', '🍦', '🍩', '🧋', '🍺',
  '🍷', '🧗', '🚲', '🏊', '⛳', '🎾', '🏀', '⚽', '🛹', '🐶',
  '🐱', '🌸', '🌲', '🏛️', '⛪', '💈', '💅', '🧹', '🔧', '💻',
];
