import { Alert, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { parseBankSms } from '../utils/smsParser';
import { navigationRef } from '../navigation/navigationRef';

type SmsEventPayload = { message: string };

const NativeSmsUserConsent = NativeModules.SmsUserConsent;
const emitter = NativeSmsUserConsent ? new NativeEventEmitter(NativeSmsUserConsent) : null;

let started = false;
let lastMessageHash: string | null = null;

function hashMessage(msg: string) {
  // Small, stable hash to avoid re-processing duplicates
  let h = 0;
  for (let i = 0; i < msg.length; i++) h = (h * 31 + msg.charCodeAt(i)) | 0;
  return String(h);
}

export function startSmsAutoDetect() {
  if (started) return;
  if (Platform.OS !== 'android') return;
  if (!NativeSmsUserConsent || !emitter) return;

  started = true;

  const onSmsSub = emitter.addListener('SmsUserConsent:onSms', async (payload: SmsEventPayload) => {
    const msg = payload?.message ?? '';
    const msgHash = hashMessage(msg);
    if (msgHash === lastMessageHash) {
      // Re-arm listener
      try {
        await NativeSmsUserConsent.start();
      } catch {}
      return;
    }
    lastMessageHash = msgHash;

    const parsed = parseBankSms(msg);
    if (!parsed.amount) {
      try {
        await NativeSmsUserConsent.start();
      } catch {}
      return;
    }

    Alert.alert(
      'Bank SMS detected',
      `${parsed.note}\n\nAmount: ₹${parsed.amount}${parsed.date ? `\nDate: ${parsed.date.toLocaleDateString()}` : ''}`,
      [
        { text: 'Ignore', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('AddTransaction', {
                prefill: {
                  amount: parsed.amount,
                  note: parsed.note,
                  date: (parsed.date ?? new Date()).toISOString(),
                },
                postSaveNavigationTarget: 'Transactions',
              });
            }
          },
        },
      ]
    );

    // Re-arm for next SMS
    try {
      await NativeSmsUserConsent.start();
    } catch {}
  });

  const onErrSub = emitter.addListener('SmsUserConsent:onError', async (_payload: SmsEventPayload) => {
    // Re-arm quietly (timeouts are common)
    try {
      await NativeSmsUserConsent.start();
    } catch {}
  });

  // Kick off first listen
  NativeSmsUserConsent.start().catch(() => {});

  // Store subs on module object so we can remove later
  (startSmsAutoDetect as any)._subs = [onSmsSub, onErrSub];
}

export function stopSmsAutoDetect() {
  if (!started) return;
  started = false;
  if (Platform.OS !== 'android') return;
  if (!NativeSmsUserConsent) return;

  const subs = (startSmsAutoDetect as any)._subs as Array<{ remove: () => void }> | undefined;
  subs?.forEach(s => s.remove());
  (startSmsAutoDetect as any)._subs = undefined;

  try {
    NativeSmsUserConsent.stop?.();
  } catch {}
}

