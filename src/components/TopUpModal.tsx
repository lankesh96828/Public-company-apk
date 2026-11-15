import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  DEFAULT_MERCHANT_UPI_ID,
  PlayerProfile,
  TOP_UP_MILESTONES,
  TOP_UP_PACKS,
  TopUpMilestone,
  TopUpPack,
  TopUpTransaction,
} from '../game/types';
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Gift,
  History,
  Loader2,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
} from 'lucide-react';
import { soundEngine } from '../game/audio';

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    vpa?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  config?: {
    display?: {
      blocks?: Record<string, unknown>;
      sequence?: string[];
      preferences?: { show_default_blocks?: boolean };
    };
  };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface TopUpModalProps {
  profile: PlayerProfile;
  authUid: string | null;
  authEmail: string | null;
  transactions: TopUpTransaction[];
  isMerchantAdmin?: boolean;
  adminPendingTopUps?: TopUpTransaction[];
  onClose: () => void;
  onVerifiedTopUp: (pack: TopUpPack, tx: TopUpTransaction) => void;
  onPendingTopUpSubmitted: (tx: TopUpTransaction) => void;
  onAdminResolveTopUp?: (tx: TopUpTransaction, approve: boolean) => Promise<void> | void;
  onClaimMilestone: (milestone: TopUpMilestone) => void;
  onExchangeGold: (diamondCost: number, goldGain: number) => void;
}

type TopUpTab = 'packs' | 'event' | 'exchange' | 'history' | 'admin';
type CheckoutMethod = 'razorpay' | 'razorpay_qr' | 'upi_direct';

interface PaymentConfigResponse {
  merchantUpiId: string;
  merchantName: string;
  currency: string;
  razorpayConfigured: boolean;
  razorpayKeyId: string | null;
  directUpiRequiresAdminReview?: boolean;
}

interface UpiIntentState {
  orderRef: string;
  merchantUpiId: string;
  upiUri: string;
  qrDataUrl: string;
  amountInr: number;
}

interface RazorpayQrState {
  qrId: string;
  imageUrl: string;
  shortUrl: string;
  amountInr: number;
}

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true);
  }
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener('error', () => {
        razorpayScriptPromise = null;
        resolve(false);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

export const DiamondIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <polygon points="5,4 19,4 22,9 12,21 2,9" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="1.4" />
    <polygon points="8,4 16,4 12,9" fill="#BAE6FD" />
    <polygon points="12,9 22,9 12,21" fill="#0284C7" fillOpacity="0.65" />
  </svg>
);

export const TopUpModal: React.FC<TopUpModalProps> = ({
  profile,
  authUid,
  authEmail,
  transactions,
  isMerchantAdmin = false,
  adminPendingTopUps = [],
  onClose,
  onVerifiedTopUp,
  onPendingTopUpSubmitted,
  onAdminResolveTopUp,
  onClaimMilestone,
  onExchangeGold,
}) => {
  const [tab, setTab] = useState<TopUpTab>('packs');
  const [pendingPack, setPendingPack] = useState<TopUpPack | null>(null);
  const [checkoutMethod, setCheckoutMethod] = useState<CheckoutMethod>('razorpay');
  const [payerUpiId, setPayerUpiId] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse>({
    merchantUpiId: DEFAULT_MERCHANT_UPI_ID,
    merchantName: 'BLAZE DROP',
    currency: 'INR',
    razorpayConfigured: false,
    razorpayKeyId: null,
    directUpiRequiresAdminReview: true,
  });
  const [upiIntent, setUpiIntent] = useState<UpiIntentState | null>(null);
  const [razorpayQr, setRazorpayQr] = useState<RazorpayQrState | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolvingTxId, setResolvingTxId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'pending'; text: string } | null>(null);

  const triggerNotice = useCallback((text: string, kind: 'success' | 'pending' = 'success') => {
    setNotice({ kind, text });
    window.setTimeout(() => {
      setNotice((cur) => (cur?.text === text ? null : cur));
    }, 5500);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/payments/config')
      .then((res) => res.json())
      .then((data: PaymentConfigResponse) => {
        if (!active || !data?.merchantUpiId) return;
        setPaymentConfig(data);
        if (!data.razorpayConfigured) {
          setCheckoutMethod('upi_direct');
        }
      })
      .catch(() => {
        // Keep default merchant UPI config
      });
    return () => {
      active = false;
    };
  }, []);

  const createDirectUpiIntent = useCallback(
    async (pack: TopUpPack) => {
      setBusy(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/payments/upi/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId: pack.id,
            payerUpiId: payerUpiId.trim(),
            playerName: profile.name,
            uid: authUid || '',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Could not generate UPI QR order.');
        }

        const qrDataUrl = await QRCode.toDataURL(data.upiUri, {
          width: 220,
          margin: 2,
          color: { dark: '#0B0E13', light: '#FFFFFF' },
        });

        setUpiIntent({
          orderRef: data.orderRef,
          merchantUpiId: data.merchantUpiId,
          upiUri: data.upiUri,
          qrDataUrl,
          amountInr: data.amountInr,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to generate UPI payment QR.');
      } finally {
        setBusy(false);
      }
    },
    [authUid, payerUpiId, profile.name]
  );

  const createRazorpayDynamicQr = useCallback(
    async (pack: TopUpPack) => {
      setBusy(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/payments/razorpay/qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId: pack.id,
            payerUpiId: payerUpiId.trim(),
            uid: authUid || '',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Could not create Razorpay Dynamic QR.');
        }
        setRazorpayQr({
          qrId: data.qrId,
          imageUrl: data.imageUrl || '',
          shortUrl: data.shortUrl || '',
          amountInr: data.amountInr,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to generate Razorpay Dynamic QR.');
      } finally {
        setBusy(false);
      }
    },
    [authUid, payerUpiId]
  );

  useEffect(() => {
    if (tab === 'packs' && pendingPack && checkoutMethod === 'upi_direct') {
      setRazorpayQr(null);
      void createDirectUpiIntent(pendingPack);
    } else if (tab === 'packs' && pendingPack && checkoutMethod === 'razorpay_qr') {
      setUpiIntent(null);
      if (paymentConfig.razorpayConfigured) {
        void createRazorpayDynamicQr(pendingPack);
      }
    } else {
      setUpiIntent(null);
      setRazorpayQr(null);
    }
  }, [
    tab,
    pendingPack,
    checkoutMethod,
    paymentConfig.razorpayConfigured,
    createDirectUpiIntent,
    createRazorpayDynamicQr,
  ]);

  // Poll Razorpay Dynamic QR settlement every 3.5 seconds
  useEffect(() => {
    if (!razorpayQr || !pendingPack || checkoutMethod !== 'razorpay_qr') return;
    let active = true;
    const activePack = pendingPack;
    const interval = window.setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/payments/razorpay/qr-status/${encodeURIComponent(razorpayQr.qrId)}`);
        const data = await res.json();
        if (!active) return;
        if (res.ok && data.paid && data.verified && data.transaction) {
          window.clearInterval(interval);
          const tx: TopUpTransaction = data.transaction;
          onVerifiedTopUp(activePack, tx);
          soundEngine.playTopUpSuccess();
          triggerNotice(
            `Razorpay QR Captured! +${tx.diamondsCredited.toLocaleString()} Diamonds credited (${tx.paymentRef})`
          );
          setRazorpayQr(null);
          setPendingPack(null);
        }
      } catch {
        // Retry on next poll cycle
      }
    }, 3500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [razorpayQr, pendingPack, checkoutMethod, onVerifiedTopUp, triggerNotice]);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(paymentConfig.merchantUpiId);
      setCopiedUpi(true);
      window.setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      triggerNotice(`UPI ID: ${paymentConfig.merchantUpiId}`, 'pending');
    }
  };

  const handleStartRazorpayCheckout = async () => {
    if (!pendingPack) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const orderRes = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: pendingPack.id,
          payerUpiId: payerUpiId.trim(),
          playerName: profile.name,
          uid: authUid || '',
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.ok) {
        if (orderData.code === 'RAZORPAY_NOT_CONFIGURED') {
          setErrorMsg(
            `Razorpay server API keys are not configured yet. Pay via Direct UPI QR (${paymentConfig.merchantUpiId}) and await merchant verification.`
          );
          setBusy(false);
          return;
        }
        throw new Error(orderData.error || 'Failed to create Razorpay order.');
      }

      const sdkLoaded = await loadRazorpayCheckoutScript();
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error('Could not load Razorpay Checkout SDK. Check network connection.');
      }

      const selectedPack = pendingPack;
      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        name: 'BLAZE DROP',
        description: `${selectedPack.diamonds + selectedPack.bonus} Diamonds · UPI ${orderData.merchantUpiId}`,
        order_id: orderData.orderId,
        prefill: {
          name: profile.name,
          email: authEmail || undefined,
          vpa: payerUpiId.trim() || undefined,
        },
        notes: {
          packId: selectedPack.id,
          merchantUpiId: orderData.merchantUpiId,
        },
        theme: { color: '#F59E0B' },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI / FamPay / GPay / PhonePe',
                instruments: [{ method: 'upi' }],
              },
            },
            sequence: ['block.upi'],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (response: RazorpayHandlerResponse) => {
          setBusy(true);
          setErrorMsg(null);
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                packId: selectedPack.id,
                payerUpiId: payerUpiId.trim(),
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified || !verifyData.transaction) {
              throw new Error(verifyData.error || 'Razorpay capture verification failed.');
            }
            const tx: TopUpTransaction = verifyData.transaction;
            onVerifiedTopUp(selectedPack, tx);
            soundEngine.playTopUpSuccess();
            triggerNotice(
              `Razorpay Verified! +${tx.diamondsCredited.toLocaleString()} Diamonds credited (Ref: ${tx.paymentRef})`
            );
            setPendingPack(null);
          } catch (verifyErr) {
            setErrorMsg(
              verifyErr instanceof Error
                ? verifyErr.message
                : 'Payment verification error. Contact support with your Payment ID.'
            );
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
          },
        },
      });

      rzp.on('payment.failed', (resp) => {
        setBusy(false);
        setErrorMsg(resp.error?.description || 'Razorpay payment was cancelled or failed.');
      });

      rzp.open();
    } catch (err) {
      setBusy(false);
      setErrorMsg(err instanceof Error ? err.message : 'Unable to start Razorpay checkout.');
    }
  };

  const handleSubmitDirectUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPack || !upiIntent) return;
    const cleanUtr = utrInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{10,22}$/.test(cleanUtr)) {
      setErrorMsg('Enter your genuine 12-digit UPI UTR / Bank Reference ID from FamPay, GPay, PhonePe, or Paytm.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/payments/upi/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderRef: upiIntent.orderRef,
          packId: pendingPack.id,
          utr: cleanUtr,
          payerUpiId: payerUpiId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.transaction) {
        throw new Error(data.error || 'Could not process UTR submission.');
      }

      const tx: TopUpTransaction = data.transaction;
      if (data.verified === true && tx.status === 'verified') {
        onVerifiedTopUp(pendingPack, tx);
        soundEngine.playTopUpSuccess();
        triggerNotice(
          `Razorpay Bank RRN Verified! +${tx.diamondsCredited.toLocaleString()} Diamonds credited (Ref: ${tx.paymentRef})`
        );
      } else {
        // NEVER credits Diamonds on unverified UTR! Queues for merchant confirmation on 9945901131-1@fam
        onPendingTopUpSubmitted(tx);
        soundEngine.playClick();
        triggerNotice(
          data.message ||
            `UTR ${cleanUtr} queued for real payment check on ${paymentConfig.merchantUpiId}. 0 Diamonds credited until merchant confirms.`,
          'pending'
        );
        setTab('history');
      }
      setUtrInput('');
      setPendingPack(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'UPI submission failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyRazorpayUtrLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPack) return;
    const cleanUtr = utrInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{10,22}$/.test(cleanUtr)) {
      setErrorMsg('Enter the 12-digit Bank RRN / UPI UTR from your payment receipt.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/payments/razorpay/verify-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: pendingPack.id,
          orderRef: razorpayQr?.qrId || '',
          utr: cleanUtr,
          payerUpiId: payerUpiId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified || !data.transaction) {
        throw new Error(data.error || 'No captured Razorpay payment matched this UTR.');
      }
      const tx: TopUpTransaction = data.transaction;
      onVerifiedTopUp(pendingPack, tx);
      soundEngine.playTopUpSuccess();
      triggerNotice(
        `Bank RRN Verified via Razorpay! +${tx.diamondsCredited.toLocaleString()} Diamonds credited.`
      );
      setUtrInput('');
      setPendingPack(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'UTR lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  const unclaimedCount = TOP_UP_MILESTONES.filter(
    (m) =>
      profile.totalTopUpDiamonds >= m.requiredDiamonds &&
      !profile.claimedTopUpMilestones.includes(m.id)
  ).length;

  const pendingReceiptsCount = transactions.filter((t) => t.status === 'pending_verification').length;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0e1218] shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#121720] px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <DiamondIcon className="h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-3xl font-bold tracking-wider text-white leading-none">
                RAZORPAY &amp; UPI TOP-UP
              </h2>
              <p className="mt-0.5 text-xs text-slate-400 truncate">
                Anti-Fraud Verified Checkout · Merchant UPI:{' '}
                <span className="font-mono-tabular font-semibold text-amber-300">
                  {paymentConfig.merchantUpiId}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-4 rounded-lg border border-white/10 bg-[#0b0e13] px-3.5 py-1.5 text-xs font-mono-tabular">
              <div className="flex items-center gap-1.5">
                <DiamondIcon className="h-3.5 w-3.5" />
                <span className="font-bold text-sky-400">{profile.diamonds.toLocaleString()}</span>
              </div>
              <span className="text-white/15">|</span>
              <div>
                <span className="text-slate-400">GOLD </span>
                <span className="font-bold text-amber-400">{profile.gold.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              aria-label="Close Top-Up Center"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[#171d28] text-slate-300 hover:border-white/25 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-[#10151d] px-5 py-2.5">
          {(
            [
              { id: 'packs', label: 'Diamond Packs' },
              {
                id: 'event',
                label: unclaimedCount > 0 ? `Top-Up Event (${unclaimedCount} Ready)` : 'Top-Up Event',
              },
              { id: 'exchange', label: 'Gold Exchange' },
              {
                id: 'history',
                label:
                  pendingReceiptsCount > 0
                    ? `Receipts (${pendingReceiptsCount} Pending)`
                    : transactions.length > 0
                    ? `Receipts (${transactions.length})`
                    : 'Receipts',
              },
              ...(isMerchantAdmin
                ? [
                    {
                      id: 'admin' as const,
                      label: `Merchant Verify (${adminPendingTopUps.length})`,
                    },
                  ]
                : []),
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                soundEngine.playClick();
                setTab(item.id);
                setPendingPack(null);
                setErrorMsg(null);
              }}
              className={`min-h-[40px] rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? item.id === 'admin'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500 text-slate-950'
                  : 'bg-[#171d28] text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Feedback Banner */}
        {notice && (
          <div
            className={`border-b px-5 py-2.5 text-xs font-medium flex items-center gap-2 ${
              notice.kind === 'pending'
                ? 'border-amber-500/35 bg-amber-950/60 text-amber-200'
                : 'border-emerald-500/30 bg-emerald-950/60 text-emerald-300'
            }`}
          >
            {notice.kind === 'pending' ? (
              <Clock className="h-4 w-4 shrink-0 text-amber-400" />
            ) : (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="overflow-y-auto p-5">
          {tab === 'packs' && !pendingPack && (
            <div className="space-y-4">
              {/* Merchant UPI Payee Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-sky-500/25 bg-[#121822] px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                  <div className="text-xs text-slate-300 min-w-0">
                    <div className="font-semibold text-white">
                      Razorpay Live Capture &amp; Merchant-Verified UPI ({paymentConfig.merchantUpiId})
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {paymentConfig.razorpayConfigured
                        ? 'Razorpay Live Gateway Active · Instant Auto-Credit after Bank Capture'
                        : 'Direct UPI checks FamPay settlement before crediting Diamonds (fake UTRs rejected)'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-[#1a2230] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:text-white"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied VPA</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy {paymentConfig.merchantUpiId}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TOP_UP_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => {
                      soundEngine.playClick();
                      setErrorMsg(null);
                      setUtrInput('');
                      setPendingPack(pack);
                    }}
                    className="group flex flex-col justify-between rounded-lg border border-white/10 bg-[#141a24] p-4 text-left hover:border-sky-400/70 hover:bg-[#18202c] transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{pack.tierLabel}</span>
                        <span className="font-mono-tabular text-amber-400">+{pack.bonus} Bonus</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2.5">
                        <DiamondIcon className="h-7 w-7 shrink-0" />
                        <div>
                          <div className="font-mono-tabular text-2xl font-bold text-white leading-none">
                            {pack.diamonds.toLocaleString()}
                          </div>
                          <div className="mt-1 text-[11px] font-mono-tabular text-sky-400">
                            Total {(pack.diamonds + pack.bonus).toLocaleString()} Diamonds
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="font-mono-tabular text-sm font-bold text-white">
                        ₹{pack.inrAmount.toLocaleString()}
                      </span>
                      <span className="rounded bg-sky-500/20 px-2.5 py-1 text-xs font-bold text-sky-300 group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors">
                        Pay UPI
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Razorpay + Dynamic QR + Direct UPI Checkout Drawer */}
          {tab === 'packs' && pendingPack && (
            <div className="mx-auto max-w-lg rounded-xl border border-sky-400/30 bg-[#141a24] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-2xl font-bold tracking-wide text-white">
                  VERIFIED INR CHECKOUT
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPendingPack(null);
                    setErrorMsg(null);
                  }}
                  className="min-h-[36px] rounded px-2 text-xs text-slate-400 hover:text-white"
                >
                  Back to Packs
                </button>
              </div>

              {/* Order Summary */}
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0d1117] p-3.5 mb-4">
                <div className="flex items-center gap-3">
                  <DiamondIcon className="h-7 w-7 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-white font-mono-tabular">
                      {pendingPack.diamonds.toLocaleString()} + {pendingPack.bonus} Bonus
                    </div>
                    <div className="text-xs text-slate-400">
                      {pendingPack.tierLabel} · Payee: {paymentConfig.merchantUpiId}
                    </div>
                  </div>
                </div>
                <div className="font-mono-tabular text-lg font-bold text-amber-400">
                  ₹{pendingPack.inrAmount.toLocaleString()}
                </div>
              </div>

              {/* Payment Method Segmented Selector */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setErrorMsg(null);
                    setCheckoutMethod('razorpay');
                  }}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors ${
                    checkoutMethod === 'razorpay'
                      ? 'border-sky-400 bg-sky-500/20 text-white'
                      : 'border-white/10 bg-[#0e131a] text-slate-300 hover:border-white/25'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span>Razorpay UPI</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setErrorMsg(null);
                    setCheckoutMethod('razorpay_qr');
                  }}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors ${
                    checkoutMethod === 'razorpay_qr'
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-white/10 bg-[#0e131a] text-slate-300 hover:border-white/25'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>Auto-QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setErrorMsg(null);
                    setCheckoutMethod('upi_direct');
                  }}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors ${
                    checkoutMethod === 'upi_direct'
                      ? 'border-amber-400 bg-amber-500/20 text-white'
                      : 'border-white/10 bg-[#0e131a] text-slate-300 hover:border-white/25'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>Direct UPI</span>
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Mode A: Razorpay Official Checkout */}
              {checkoutMethod === 'razorpay' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Your UPI ID (Optional prefill for Razorpay UPI)
                    </label>
                    <input
                      type="text"
                      value={payerUpiId}
                      onChange={(e) => setPayerUpiId(e.target.value)}
                      placeholder="e.g. yourname@okicici or 98xxxxxxx@fam"
                      maxLength={64}
                      className="h-11 w-full rounded-lg border border-white/15 bg-[#0b0f16] px-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-lg border border-white/10 bg-[#0d1117] p-3 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Gateway Verification</span>
                      <span
                        className={`font-semibold ${
                          paymentConfig.razorpayConfigured ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {paymentConfig.razorpayConfigured
                          ? 'Live Razorpay Capture API Active'
                          : 'Awaiting Razorpay API Keys'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Merchant Handle</span>
                      <span className="font-mono-tabular text-white">
                        {paymentConfig.merchantUpiId}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleStartRazorpayCheckout}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-orange-600 font-bold text-sm text-slate-950 hover:brightness-110 disabled:opacity-60"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying Payment Capture...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          Pay ₹{pendingPack.inrAmount.toLocaleString()} via Razorpay
                        </span>
                      </>
                    )}
                  </button>

                  {!paymentConfig.razorpayConfigured && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setCheckoutMethod('upi_direct');
                      }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>Use Direct UPI QR ({paymentConfig.merchantUpiId})</span>
                    </button>
                  )}
                </div>
              )}

              {/* Mode B: Razorpay Dynamic Auto-Verified UPI QR */}
              {checkoutMethod === 'razorpay_qr' && (
                <div className="space-y-4">
                  {!paymentConfig.razorpayConfigured ? (
                    <div className="rounded-lg border border-amber-500/35 bg-amber-950/35 p-4 text-xs text-amber-200 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>Razorpay API Keys Needed for Auto-QR</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        Auto-polling UPI QR requires live Razorpay API keys (`RAZORPAY_KEY_ID` &amp; `RAZORPAY_KEY_SECRET`). You can still pay directly to{' '}
                        <strong className="text-white font-mono-tabular">{paymentConfig.merchantUpiId}</strong> using Direct UPI and submit your UTR for real merchant verification.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCheckoutMethod('upi_direct')}
                        className="mt-2 h-10 rounded-md bg-amber-500 px-3 text-xs font-bold text-slate-950 hover:bg-amber-400"
                      >
                        Switch to Direct UPI ({paymentConfig.merchantUpiId})
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-lg border border-white/10 bg-[#0d1117] p-4">
                        <div className="flex h-[156px] w-[156px] shrink-0 items-center justify-center rounded-lg bg-white p-2">
                          {razorpayQr?.imageUrl ? (
                            <img
                              src={razorpayQr.imageUrl}
                              alt="Razorpay Dynamic UPI QR"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
                          )}
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Listening for Live Bank Settlement...</span>
                          </div>
                          <p className="text-slate-400">
                            Scan this single-use Razorpay QR for exact ₹{pendingPack.inrAmount}.00. Diamonds auto-credit the instant Razorpay captures funds.
                          </p>
                          {razorpayQr?.shortUrl && (
                            <a
                              href={razorpayQr.shortUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
                            >
                              <span>Open Razorpay UPI Link</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <form onSubmit={handleVerifyRazorpayUtrLookup} className="space-y-2">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Already paid? Verify Bank RRN / UTR against live Razorpay records:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={utrInput}
                            onChange={(e) => setUtrInput(e.target.value)}
                            placeholder="12-digit Bank RRN / UTR"
                            maxLength={22}
                            className="h-11 flex-1 rounded-lg border border-white/15 bg-[#0b0f16] px-3 font-mono-tabular text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={busy}
                            className="h-11 rounded-lg bg-emerald-500 px-4 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                          >
                            Verify RRN
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              )}

              {/* Mode C: Direct UPI QR to 9945901131-1@fam (Anti-Fake-UTR Queued Verification) */}
              {checkoutMethod === 'upi_direct' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/35 bg-amber-950/40 p-3 text-xs text-amber-200">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <strong className="text-amber-300">Real Payment Verification Guard:</strong>{' '}
                      Submitting a UTR queues your receipt with <strong>0 Diamonds credited</strong> until real receipt on{' '}
                      <span className="font-mono-tabular text-white">{paymentConfig.merchantUpiId}</span>{' '}
                      is confirmed. Fake or dummy UTRs are automatically rejected.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 rounded-lg border border-white/10 bg-[#0d1117] p-4">
                    <div className="flex h-[156px] w-[156px] shrink-0 items-center justify-center rounded-lg bg-white p-2">
                      {upiIntent?.qrDataUrl ? (
                        <img
                          src={upiIntent.qrDataUrl}
                          alt={`Scan to pay ${paymentConfig.merchantUpiId}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
                      <div className="text-xs font-bold text-white">
                        Scan with FamPay, GPay, PhonePe, Paytm or BHIM
                      </div>
                      <div className="text-xs text-slate-400">
                        Pay exact{' '}
                        <span className="font-mono-tabular font-bold text-amber-300">
                          ₹{pendingPack.inrAmount}.00
                        </span>{' '}
                        to UPI ID:
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="rounded border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 font-mono-tabular text-xs font-bold text-amber-300 select-all">
                          {paymentConfig.merchantUpiId}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          aria-label="Copy Merchant UPI ID"
                          className="flex h-8 w-8 items-center justify-center rounded border border-white/15 bg-[#171d28] text-slate-300 hover:text-white"
                        >
                          {copiedUpi ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {upiIntent && (
                        <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <a
                            href={upiIntent.upiUri}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>Open UPI App</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <span className="text-[11px] font-mono-tabular text-slate-400">
                            Ref: {upiIntent.orderRef}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSubmitDirectUpi} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        Enter genuine 12-Digit UPI UTR / Transaction Reference ID after payment
                      </label>
                      <input
                        type="text"
                        value={utrInput}
                        onChange={(e) => setUtrInput(e.target.value)}
                        placeholder="e.g. 431890124567"
                        maxLength={22}
                        className="h-11 w-full rounded-lg border border-white/15 bg-[#0b0f16] px-3 font-mono-tabular text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy || !upiIntent}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-orange-600 font-bold text-sm text-slate-950 hover:brightness-110 disabled:opacity-60"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Submitting UTR for Verification...</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          <span>
                            Submit UTR for Verification (+
                            {(pendingPack.diamonds + pendingPack.bonus).toLocaleString()} ◆ queued)
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Cumulative Top-Up Event Tab */}
          {tab === 'event' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/30 bg-[#141a24] p-4">
                <div className="flex items-center justify-between text-xs font-mono-tabular mb-2">
                  <span className="font-semibold text-amber-400">CUMULATIVE VERIFIED TOP-UP PROGRESS</span>
                  <span className="font-bold text-white">
                    {profile.totalTopUpDiamonds.toLocaleString()} / 1,000 Diamonds
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-sm bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, (profile.totalTopUpDiamonds / 1000) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TOP_UP_MILESTONES.map((ms) => {
                  const reached = profile.totalTopUpDiamonds >= ms.requiredDiamonds;
                  const claimed = profile.claimedTopUpMilestones.includes(ms.id);
                  return (
                    <div
                      key={ms.id}
                      className={`flex items-center justify-between rounded-lg border p-3.5 ${
                        claimed
                          ? 'border-emerald-500/30 bg-[#12191c]'
                          : reached
                          ? 'border-amber-500/60 bg-[#1b1a14]'
                          : 'border-white/10 bg-[#141a24]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0d1117] border border-white/10">
                          <Gift className={`h-5 w-5 ${reached ? 'text-amber-400' : 'text-slate-500'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{ms.rewardSummary}</div>
                          <div className="text-[11px] font-mono-tabular text-slate-400">
                            {ms.title}
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={!reached || claimed}
                        onClick={() => {
                          onClaimMilestone(ms);
                          soundEngine.playTopUpSuccess();
                          triggerNotice(`Claimed reward: ${ms.rewardSummary}`);
                        }}
                        className={`ml-3 min-h-[38px] shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                          claimed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : reached
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            : 'bg-white/10 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {claimed ? 'Claimed' : reached ? 'Claim' : 'Locked'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gold Exchange Tab */}
          {tab === 'exchange' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  { diamonds: 50, gold: 1250, label: 'Tactical Pouch' },
                  { diamonds: 100, gold: 3000, label: 'Squad Stash' },
                  { diamonds: 250, gold: 8500, label: 'Armory Vault' },
                ] as const
              ).map((ex) => {
                const canAfford = profile.diamonds >= ex.diamonds;
                return (
                  <div
                    key={ex.diamonds}
                    className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#141a24] p-4"
                  >
                    <div>
                      <div className="text-xs text-slate-400">{ex.label}</div>
                      <div className="mt-2 font-mono-tabular text-2xl font-bold text-amber-400">
                        +{ex.gold.toLocaleString()} GOLD
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-mono-tabular text-sky-400">
                        <DiamondIcon className="h-3.5 w-3.5" />
                        <span>Cost: {ex.diamonds} Diamonds</span>
                      </div>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        onExchangeGold(ex.diamonds, ex.gold);
                        soundEngine.playTopUpSuccess();
                        triggerNotice(`Exchanged ${ex.diamonds} Diamonds for +${ex.gold.toLocaleString()} Gold`);
                      }}
                      className="mt-4 h-11 w-full rounded-lg bg-sky-500 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:bg-white/10 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      {canAfford ? 'Exchange Now' : 'Need More Diamonds'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Receipts Tab (Pending / Verified / Rejected) */}
          {tab === 'history' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#141a24] py-12 text-center">
                  <History className="h-8 w-8 text-slate-500 mb-2" />
                  <div className="text-sm font-semibold text-white">No Top-Up Receipts Yet</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Pending Direct UPI and Verified Razorpay ({paymentConfig.merchantUpiId}) receipts appear here.
                  </div>
                </div>
              ) : (
                transactions.map((tx) => {
                  const isPending = tx.status === 'pending_verification';
                  const isRejected = tx.status === 'rejected';
                  const displayDiamonds =
                    tx.status === 'verified'
                      ? tx.diamondsCredited
                      : tx.expectedDiamonds || tx.diamondsCredited;

                  return (
                    <div
                      key={tx.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border px-4 py-3 ${
                        isPending
                          ? 'border-amber-500/35 bg-[#1b1812]'
                          : isRejected
                          ? 'border-red-500/35 bg-[#1b1214]'
                          : 'border-white/10 bg-[#141a24]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <DiamondIcon className="h-4 w-4 shrink-0" />
                          <span className="font-mono-tabular">
                            {isPending
                              ? `+${displayDiamonds.toLocaleString()} Diamonds (Queued)`
                              : isRejected
                              ? '0 Diamonds Credited'
                              : `+${displayDiamonds.toLocaleString()} Diamonds`}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="font-mono-tabular text-amber-300">
                            ₹{tx.amountInr.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] font-mono-tabular text-slate-400 truncate">
                          {tx.method === 'razorpay_upi'
                            ? 'Razorpay UPI'
                            : tx.method === 'razorpay_qr'
                            ? 'Razorpay QR'
                            : 'Direct UPI'}{' '}
                          · Payee: {tx.merchantUpiId} · UTR/Ref: {tx.paymentRef}
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <div
                          className={`text-[11px] font-bold uppercase ${
                            isPending
                              ? 'text-amber-400'
                              : isRejected
                              ? 'text-red-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {isPending
                            ? 'Pending Verification'
                            : isRejected
                            ? 'Rejected (Unpaid)'
                            : 'Verified'}
                        </div>
                        <div className="text-[10px] font-mono-tabular text-slate-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Merchant Admin Verification Tab (Only visible to verified shivarajnaik60@gmail.com) */}
          {tab === 'admin' && isMerchantAdmin && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
                <strong className="text-emerald-300">Merchant Settlement Queue ({paymentConfig.merchantUpiId}):</strong>{' '}
                Cross-check each UTR against your real FamPay / bank statement before approving. Approving releases the player&apos;s Diamonds automatically.
              </div>

              {adminPendingTopUps.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#141a24] py-12 text-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-400 mb-2" />
                  <div className="text-sm font-semibold text-white">No Pending Direct UPI Receipts</div>
                  <div className="mt-1 text-xs text-slate-400">
                    All Direct UPI UTR submissions have been reviewed.
                  </div>
                </div>
              ) : (
                adminPendingTopUps.map((tx) => {
                  const expected = tx.expectedDiamonds || 0;
                  const isBusy = resolvingTxId === tx.id;
                  return (
                    <div
                      key={`${tx.uid || 'u'}_${tx.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-[#141a24] p-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white">
                          <span className="font-mono-tabular text-amber-300">₹{tx.amountInr}</span>
                          <span>→</span>
                          <span className="font-mono-tabular text-sky-400">+{expected.toLocaleString()} Diamonds</span>
                          <span className="rounded bg-white/10 px-2 py-0.5 font-mono-tabular text-[10px] text-slate-300">
                            UTR: {tx.paymentRef}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-400 truncate">
                          Order: {tx.orderId} · Payer VPA: {tx.payerUpiId} · UID: {tx.uid || 'N/A'}
                        </div>
                        <div className="text-[10px] font-mono-tabular text-slate-500">
                          Submitted {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy || !onAdminResolveTopUp}
                          onClick={async () => {
                            if (!onAdminResolveTopUp) return;
                            setResolvingTxId(tx.id);
                            try {
                              await onAdminResolveTopUp(tx, true);
                              triggerNotice(`Approved UTR ${tx.paymentRef} (+${expected} ◆)`);
                            } finally {
                              setResolvingTxId(null);
                            }
                          }}
                          className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || !onAdminResolveTopUp}
                          onClick={async () => {
                            if (!onAdminResolveTopUp) return;
                            setResolvingTxId(tx.id);
                            try {
                              await onAdminResolveTopUp(tx, false);
                              triggerNotice(`Rejected fake/unpaid UTR ${tx.paymentRef}`, 'pending');
                            } finally {
                              setResolvingTxId(null);
                            }
                          }}
                          className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/50 px-3.5 text-xs font-bold text-red-200 hover:bg-red-900/60 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
