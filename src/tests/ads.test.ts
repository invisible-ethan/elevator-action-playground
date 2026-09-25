import { describe, expect, it } from 'vitest';
import { ADSENSE_CLIENT, RAIL_GAP, RAIL_MIN_VIEWPORT, RAIL_WIDTH, adsEnabled, railSpace } from '../ads';

describe('ad rails', () => {
  it('uses a well-formed AdSense publisher ID', () => {
    expect(ADSENSE_CLIENT).toMatch(/^ca-pub-\d{16}$/);
  });

  it('stays off until a numeric slot ID is configured', () => {
    expect(adsEnabled({ left: '', right: '' })).toBe(false);
    expect(adsEnabled({ left: 'LEFT_SLOT_ID', right: '' })).toBe(false);
    expect(adsEnabled({ left: '1234567890', right: '' })).toBe(true);
  });

  it('only takes room from the game on wide screens with ads on', () => {
    expect(railSpace(RAIL_MIN_VIEWPORT - 1, true)).toBe(0);
    expect(railSpace(1920, false)).toBe(0);
    expect(railSpace(RAIL_MIN_VIEWPORT, true)).toBe(2 * (RAIL_WIDTH + RAIL_GAP));
  });
});
