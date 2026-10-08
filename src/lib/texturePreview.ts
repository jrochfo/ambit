// Texture options (dev preview). The style guide's Texture section saves a choice; the sandbox,
// open in another tab, applies it live by setting the texture attributes on <html> (styles.css).

export const PAGE_TEXTURES = [
  ['none', 'None'],
  ['grain-fine', 'Fine grain'],
  ['grain-medium', 'Medium grain'],
  ['paper', 'Paper'],
  ['gradient', 'Gradient + grain'],
] as const;

export const BUTTON_TEXTURES = [
  ['none', 'None'],
  ['grain', 'Grain'],
  ['sheen', 'Sheen'],
  ['sheen-grain', 'Sheen + grain'],
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
    return { ...NO_TEXTURE, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<TexturePreview>) };
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
