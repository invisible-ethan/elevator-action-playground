// Google AdSense ad units in the two side rails next to the game.
//
// The AdSense script itself is loaded from index.html (Google also uses it to verify the site).
// To show ads, create two vertical display ad units in AdSense (Ads -> By ad unit -> Display ads)
// and paste their slot IDs below. A rail with no slot ID stays empty.

export const ADSENSE_CLIENT = 'ca-pub-6470972930893111';

export const AD_SLOTS: Record<'left' | 'right', string> = {
  left: '',
  right: '',
};

/** Set to true while testing so impressions and clicks are not counted. */
export const AD_TEST_MODE = false;

export const RAIL_WIDTH = 160;
export const RAIL_HEIGHT = 600;
export const RAIL_GAP = 24;
/** The rails only appear when the window is at least this wide (never on phones). */
export const RAIL_MIN_VIEWPORT = 1000;

/** Horizontal space the rails take away from the game at this window width. */
export function railSpace(viewportWidth: number, enabled: boolean): number {
  return enabled && viewportWidth >= RAIL_MIN_VIEWPORT ? 2 * (RAIL_WIDTH + RAIL_GAP) : 0;
}

export function adsEnabled(slots: Record<string, string> = AD_SLOTS): boolean {
  return Object.values(slots).some((s) => /^\d+$/.test(s));
}

type AdQueue = unknown[];

/** Adds an ad unit to each configured rail and asks AdSense to fill the ones on screen. */
export function setupAds(): void {
  if (!adsEnabled()) return;
  document.body.classList.add('ads');

  const units: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>('.ad-rail').forEach((rail) => {
    const slot = AD_SLOTS[rail.dataset.side as 'left' | 'right'];
    if (!slot || !/^\d+$/.test(slot)) return;
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'inline-block';
    ins.style.width = `${RAIL_WIDTH}px`;
    ins.style.height = `${RAIL_HEIGHT}px`;
    ins.dataset.adClient = ADSENSE_CLIENT;
    ins.dataset.adSlot = slot;
    if (AD_TEST_MODE) ins.dataset.adtest = 'on';
    rail.appendChild(ins);
    units.push(ins);
  });

  // AdSense rejects units that are not laid out, so only request the ones currently visible
  // (e.g. after the window is widened past the breakpoint).
  const fill = () => {
    for (const ins of units) {
      if (ins.dataset.requested || ins.offsetParent === null) continue;
      ins.dataset.requested = '1';
      try {
        const w = window as unknown as { adsbygoogle?: AdQueue };
        (w.adsbygoogle = w.adsbygoogle || []).push({});
      } catch {
        /* blocked by an ad blocker or not approved yet: the rail just stays empty */
      }
    }
  };
  fill();
  window.addEventListener('resize', fill);
}
