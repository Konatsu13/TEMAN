export function isValidProfileColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function getProfileColorText(value: string): '#000000' | '#FFFFFF' {
  if (!isValidProfileColor(value)) return '#FFFFFF';

  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}
