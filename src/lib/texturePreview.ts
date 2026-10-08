// Texture options (dev preview). The style guide's Texture section saves a choice; the sandbox,
// open in another tab, applies it live by setting the texture attributes on <html> (styles.css).

export const PAGE_TEXTURES = [
  ['none', 'None'],
  ['grain', 'Grain'],
  ['grain-coarse', 'Coarse grain'],
  ['grain-glow', 'Grain + glow'],
] as const;

export const BUTTON_TEXTURES = [
  ['none', 'None'],
  ['grain', 'Grain'],
] as const;

export interface TexturePreview {
  page: string;
  buttons: string;
  strength: number;
}

const KEY = 'ambit.texturePreview';
export const NO_TEXTURE: TexturePreview = { page: 'none', buttons: 'none', strength: 1 };

export function readTexturePreview(): TexturePreview {
  try {
    const t = { ...NO_TEXTURE, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<TexturePreview>) };
    // Drop options that have since been removed.
    if (!PAGE_TEXTURES.some(([id]) => id === t.page)) t.page = 'none';
    if (!BUTTON_TEXTURES.some(([id]) => id === t.buttons)) t.buttons = 'none';
    return t;
  } catch {
    return NO_TEXTURE;
  }
}

export function writeTexturePreview(t: TexturePreview): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    // Preview just won't carry over.
  }
}

export function applyTexturePreview(t: TexturePreview = readTexturePreview()): void {
  const root = document.documentElement;
  root.dataset.texturePage = t.page;
  root.dataset.textureButtons = t.buttons;
  root.style.setProperty('--texture-strength', String(t.strength));
}
