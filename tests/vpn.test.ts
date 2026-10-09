import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getVpnService,
  isVpnConnected,
  OrizenVpnError,
  registerVpnProvider,
  vpnStatusLabel,
  type VPNProvider,
  type VPNStatus,
} from '../src/privacy/vpnService.js';

describe('VPN honesty guarantees', () => {
  it('reports unsupported with no provider bundled', async () => {
    const svc = getVpnService();
    assert.equal(await svc.isSupported(), false);
    assert.equal(await svc.getStatus(), 'unsupported');
    const detail = await svc.getDetail();
    assert.equal(detail.supported, false);
    assert.equal(detail.providerName, null);
  });

  it('refuses to connect without a real backend', async () => {
    const svc = getVpnService();
    await assert.rejects(() => svc.connect(), OrizenVpnError);
  });

  it('never reports connected unless a provider verifies it', async () => {
    const status = await getVpnService().getStatus();
    assert.equal(isVpnConnected(status), false);
  });

  it('labels every status honestly', () => {
    const labels: Record<VPNStatus, string> = {
      unsupported: 'Not Available',
      disconnected: 'Not Connected',
      connecting: 'Connecting…',
      connected: 'Connected',
      disconnecting: 'Disconnecting…',
      error: 'Connection Failed',
    };
    for (const [status, label] of Object.entries(labels) as Array<[VPNStatus, string]>) {
      assert.equal(vpnStatusLabel(status), label);
    }
  });

  it('drives the full lifecycle through a registered provider', async () => {
    let connected = false;
    const fake: VPNProvider = {
      id: 'test',
      name: 'Test Provider',
      isConfigured: async () => true,
      connect: async () => {
        connected = true;
      },
      disconnect: async () => {
        connected = false;
      },
      getStatus: async () => (connected ? 'connected' : 'disconnected'),
    };
    // Simulate the native-module presence a real integration would provide.
    (globalThis as Record<string, unknown>).__ORIZEN_VPN_NATIVE__ = { test: true };
    try {
      registerVpnProvider(fake);
      const svc = getVpnService();
      assert.equal(await svc.isSupported(), true);
      assert.equal(await svc.getStatus(), 'disconnected');
      await svc.connect();
      assert.equal(await svc.getStatus(), 'connected');
      assert.equal(isVpnConnected(await svc.getStatus()), true);
      await svc.disconnect();
      assert.equal(await svc.getStatus(), 'disconnected');
    } finally {
      delete (globalThis as Record<string, unknown>).__ORIZEN_VPN_NATIVE__;
    }
  });
});
