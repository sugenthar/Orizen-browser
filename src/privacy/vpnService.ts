import { hasNativeVpnModule } from './privacyCapabilities';

/**
 * Real VPN abstraction for Orizen.
 *
 * Honesty contract: status is only ever 'connected' when an actual native
 * VPN provider reports it. This build bundles NO provider and NO backend,
 * so the service reports 'unsupported' and connect() refuses with a clear
 * error instead of pretending.
 *
 * What a real implementation requires (not yet present):
 *  1. A legitimate VPN backend/endpoint + protocol (WireGuard/OpenVPN/etc.).
 *     Orizen has none — inventing one (public proxy, HTTP proxy labeled as
 *     VPN) would be insecure and dishonest, so it is explicitly not done.
 *  2. A native module: Android `VpnService` (with user consent via
 *     `VpnService.prepare`) / iOS Network Extension Packet Tunnel, exposed
 *     through an Expo config plugin + Expo Module, setting
 *     `globalThis.__ORIZEN_VPN_NATIVE__` and registering a provider below.
 *  3. `registerVpnProvider()` the implementation; `getVpnService()` picks
 *     it up automatically. No UI changes needed.
 */

export type VPNStatus =
  | 'unsupported'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

export interface VPNProvider {
  id: string;
  name: string;
  isConfigured(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<VPNStatus>;
}

export interface VPNStateDetail {
  status: VPNStatus;
  /** Provider display name, or null when no provider is configured. */
  providerName: string | null;
  /** Human-readable error, or null when there is none. */
  error: string | null;
  supported: boolean;
}

export interface VPNService {
  isSupported(): Promise<boolean>;
  getStatus(): Promise<VPNStatus>;
  getDetail(): Promise<VPNStateDetail>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export const VPN_BACKEND_REQUIRED =
  'A real VPN needs a legitimate VPN backend and OS-level integration (Android VpnService / iOS Network Extension). Orizen v0.4.0 bundles neither, so VPN reports Not Available. Private browsing, tracker blocking and no-history protections work independently of VPN.';

export class OrizenVpnError extends Error {
  readonly code: 'UNSUPPORTED' | 'NOT_CONFIGURED' | 'PERMISSION_DENIED' | 'ALREADY_ACTIVE' | 'CONNECTION_FAILED';
  constructor(code: OrizenVpnError['code'], message: string) {
    super(message);
    this.name = 'OrizenVpnError';
    this.code = code;
  }
}

class UnsupportedVpnService implements VPNService {
  async isSupported(): Promise<boolean> {
    return false;
  }
  async getStatus(): Promise<VPNStatus> {
    return 'unsupported';
  }
  async getDetail(): Promise<VPNStateDetail> {
    return { status: 'unsupported', providerName: null, error: null, supported: false };
  }
  async connect(): Promise<void> {
    throw new OrizenVpnError('UNSUPPORTED', VPN_BACKEND_REQUIRED);
  }
  async disconnect(): Promise<void> {
    // Nothing to tear down; resolving keeps lifecycle callers safe.
  }
}

class ProviderVpnService implements VPNService {
  private status: VPNStatus = 'disconnected';
  private error: string | null = null;
  constructor(private readonly provider: VPNProvider) {}
  async isSupported(): Promise<boolean> {
    return hasNativeVpnModule() && (await this.provider.isConfigured());
  }
  async getStatus(): Promise<VPNStatus> {
    if (!(await this.isSupported())) return 'unsupported';
    try {
      this.status = await this.provider.getStatus();
    } catch {
      this.status = 'error';
    }
    return this.status;
  }
  async getDetail(): Promise<VPNStateDetail> {
    const status = await this.getStatus();
    return { status, providerName: this.provider.name, error: this.error, supported: status !== 'unsupported' };
  }
  async connect(): Promise<void> {
    if (!(await this.isSupported())) {
      throw new OrizenVpnError('NOT_CONFIGURED', VPN_BACKEND_REQUIRED);
    }
    this.status = 'connecting';
    this.error = null;
    try {
      await this.provider.connect();
      this.status = await this.provider.getStatus();
    } catch (e) {
      this.status = 'error';
      this.error = e instanceof Error ? e.message : 'Connection failed.';
      throw new OrizenVpnError('CONNECTION_FAILED', this.error);
    }
  }
  async disconnect(): Promise<void> {
    if (this.status === 'disconnected' || this.status === 'unsupported') return;
    this.status = 'disconnecting';
    try {
      await this.provider.disconnect();
    } finally {
      this.status = 'disconnected';
    }
  }
}

let registeredProvider: VPNProvider | null = null;

/** Future native integration point. Not called in v0.4.0. */
export function registerVpnProvider(provider: VPNProvider): void {
  registeredProvider = provider;
}

export function getVpnService(): VPNService {
  if (registeredProvider && hasNativeVpnModule()) return new ProviderVpnService(registeredProvider);
  return new UnsupportedVpnService();
}

/** UI helper: only 'connected' may render a connected indicator. */
export function isVpnConnected(status: VPNStatus): boolean {
  return status === 'connected';
}

export function vpnStatusLabel(status: VPNStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting…';
    case 'disconnecting':
      return 'Disconnecting…';
    case 'disconnected':
      return 'Not Connected';
    case 'error':
      return 'Connection Failed';
    default:
      return 'Not Available';
  }
}
