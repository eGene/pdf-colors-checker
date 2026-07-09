import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APP_ANALYTICS_BEACON_URL,
  LOCAL_APP_ANALYTICS_BEACON_URL,
  getAnalyticsBeaconUrl,
  sendAppAnalyticsBeacon,
} from '@/lib/analyticsBeacon';

describe('analyticsBeacon', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(undefined));
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses production app URL by default', () => {
    expect(getAnalyticsBeaconUrl('gosignpdf.com')).toBe(APP_ANALYTICS_BEACON_URL);
  });

  it('uses local app URL on localhost', () => {
    expect(getAnalyticsBeaconUrl('localhost')).toBe(LOCAL_APP_ANALYTICS_BEACON_URL);
    expect(getAnalyticsBeaconUrl('127.0.0.1')).toBe(LOCAL_APP_ANALYTICS_BEACON_URL);
  });

  it('fires beacon once per session', () => {
    sendAppAnalyticsBeacon();
    sendAppAnalyticsBeacon();

    const expectedUrl = getAnalyticsBeaconUrl();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expectedUrl, {
      mode: 'no-cors',
      keepalive: true,
      credentials: 'omit',
    });
  });
});
