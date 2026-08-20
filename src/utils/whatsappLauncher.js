import { registerPlugin } from '@capacitor/core';
import { storageUtils } from './storageUtils';

const WhatsAppLauncher = registerPlugin('WhatsAppLauncher');
const WA_PACKAGE_KEY = 'slm_team_wa_package_v1';

export function readWhatsAppPackageChoice() {
  return String(storageUtils.getItem(WA_PACKAGE_KEY) || '').trim();
}

export function writeWhatsAppPackageChoice(packageName) {
  const value = String(packageName || '').trim();
  if (!value) storageUtils.removeItem(WA_PACKAGE_KEY);
  else storageUtils.setItem(WA_PACKAGE_KEY, value);
}

export async function listWhatsAppApps() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return [];
    const res = await WhatsAppLauncher.listApps();
    const apps = Array.isArray(res?.apps) ? res.apps : [];
    return apps
      .map((row) => ({
        packageName: String(row?.packageName || '').trim(),
        label: String(row?.label || '').trim() || String(row?.packageName || '').trim(),
      }))
      .filter((row) => row.packageName);
  } catch {
    return [];
  }
}

export async function openWhatsAppUrl(url, packageName = '') {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;
    await WhatsAppLauncher.open({ url, packageName: packageName || '' });
    return true;
  } catch {
    return false;
  }
}
