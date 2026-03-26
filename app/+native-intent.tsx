export function redirectSystemPath({
  path,
}: { path: string; initial: boolean }) {
  try {
    // Handle giftcycle://join/CODE or https://gift-cycle-tracker.vercel.app/join/CODE
    const match = path.match(/\/join\/([A-Z0-9]+)/i);
    if (match?.[1]) return `/join/${match[1]}`;
  } catch {}
  return path || '/';
}
