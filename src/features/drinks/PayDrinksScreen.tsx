import { ListError, ListSectionHeader, ListSkeleton } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { usePaymentHistory } from '@/tanstack/drinks';
import { BRANDING } from '@/utils';
import { CircleCheck, Copy, Info, QrCode, Send, Ticket, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';

export type PaymentDTO = {
  type: 'paypal' | 'bank_transfer';
};

export type PayPalPaymentDTO = PaymentDTO & {
  type: 'paypal';
  paypalMeLink: string;
};

export type BankTransferDTo = PaymentDTO & {
  type: 'bank_transfer';
  recipient: string;
  iban: string;
  bic: string;
};

const PAYMENT_INFO: PayPalPaymentDTO | BankTransferDTo | undefined = import.meta.env.VITE_PAYMENT_INFO
  ? JSON.parse(import.meta.env.VITE_PAYMENT_INFO)
  : undefined;

const CopyRow = ({ label, value, copiedMessage }: { label: string; value: string; copiedMessage: string }) => (
  <Item className="p-0">
    <ItemContent>
      <ItemTitle className="break-all font-mono text-sm">{value}</ItemTitle>
      <ItemDescription>{label}</ItemDescription>
    </ItemContent>
    <ItemActions>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.info(copiedMessage);
          } catch {
            toast.error(value);
          }
        }}
      >
        <Copy className="size-4" />
      </Button>
    </ItemActions>
  </Item>
);

const PayDrinksScreen = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const formatCurrency = useCurrency();
  const { data: history = [], refetch, isLoading, error } = usePaymentHistory(user.id);

  const paidItems = useMemo(() => history.filter((x) => !x.voucher), [history]);
  const voucherItems = useMemo(() => history.filter((x) => x.voucher), [history]);
  const amountToPay = paidItems.reduce((sum, x) => sum + (x.amount ?? 0), 0);
  const itemCount = paidItems.reduce((sum, x) => sum + (x.count ?? 0), 0);

  const lines = useMemo(() => {
    const byDrink = new Map<string, { id: string; name: string; price: number; count: number; total: number }>();
    for (const x of paidItems) {
      const id = String(x.drink?.id ?? x.id);
      const line = byDrink.get(id) ?? { id, name: x.drink?.name ?? '', price: x.drink?.price ?? 0, count: 0, total: 0 };
      line.count += x.count ?? 0;
      line.total += x.amount ?? 0;
      byDrink.set(id, line);
    }
    return Array.from(byDrink.values());
  }, [paidItems]);

  const showQr = (info: BankTransferDTo) => {
    // EPC / GiroCode: the amount is line 8, so the banking app can pre-fill it.
    const amountLine = amountToPay > 0 ? `EUR${amountToPay.toFixed(2)}` : '';
    const reference = t('drinks.pay.reference', { title: BRANDING.title });
    dialogs.alert(
      <div>
        <Alert variant="info">
          <Info className="!size-5" />
          <AlertDescription>{t('drinks.pay.qrHint')}</AlertDescription>
        </Alert>
        <div className="mt-4 flex flex-row justify-center">
          <QRCode value={`BCD\n002\n1\nINST\n${info.bic}\n${info.recipient}\n${info.iban}\n${amountLine}\n\n\n${reference}`} />
        </div>
      </div>
    );
  };

  const openPayPal = (info: PayPalPaymentDTO) => {
    const newWindow = window.open(
      `https://www.paypal.me/${info.paypalMeLink}/${amountToPay.toFixed(2)}EUR`,
      '_blank',
      'noopener,noreferrer'
    );
    if (newWindow) newWindow.opener = null;
  };

  return (
    <div>
      <AppBar className="!border-b !shadow-sm" title={t('drinks.pay.title')} user={user} />
      <main className="flex-1 size-full pb-safe-bottom">
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="flex flex-col gap-3 p-4">
            {isLoading && <ListSkeleton rows={4} />}

            {!isLoading && error && (
              <ListError
                title={t('drinks.pay.loadError')}
                description={error.message}
                retryLabel={t('challenge.list.retry')}
                onRetry={() => refetch()}
              />
            )}

            {!isLoading && !error && (
              <>
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border p-5 text-center',
                    amountToPay > 0 ? 'border-warning/40 bg-warning/10' : 'border-success/40 bg-success/10'
                  )}
                >
                  {amountToPay > 0 ? (
                    <>
                      <Wallet className="size-6 text-warning" />
                      <div className="text-sm text-muted-foreground">{t('drinks.pay.amountDue')}</div>
                      <div className="text-4xl font-bold tabular-nums">{formatCurrency(amountToPay)}</div>
                      <div className="text-xs text-muted-foreground">{t('drinks.pay.itemCount', { count: itemCount })}</div>
                    </>
                  ) : (
                    <>
                      <CircleCheck className="size-8 text-success" />
                      <div className="text-lg font-semibold">{t('drinks.pay.nothingToPay')}</div>
                      <div className="text-sm text-muted-foreground">{t('drinks.pay.nothingToPayDescription')}</div>
                    </>
                  )}
                </div>

                {amountToPay > 0 && (
                  <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                    <div className="font-semibold">{t('drinks.pay.paymentInfo')}</div>

                    {!PAYMENT_INFO && (
                      <Alert variant="warning">
                        <Info />
                        <AlertDescription>{t('drinks.pay.noPaymentInfo')}</AlertDescription>
                      </Alert>
                    )}

                    {PAYMENT_INFO?.type === 'bank_transfer' && (
                      <>
                        <div className="flex flex-col divide-y">
                          <CopyRow label={t('drinks.pay.recipient')} value={PAYMENT_INFO.recipient} copiedMessage={t('drinks.pay.recipientCopied')} />
                          <CopyRow label={t('drinks.pay.iban')} value={PAYMENT_INFO.iban} copiedMessage={t('drinks.pay.ibanCopied')} />
                          <CopyRow label={t('drinks.pay.bic')} value={PAYMENT_INFO.bic} copiedMessage={t('drinks.pay.bicCopied')} />
                        </div>
                        <Button className="w-full" onClick={() => showQr(PAYMENT_INFO)}>
                          <QrCode className="size-4" />
                          {t('drinks.pay.showQr')}
                        </Button>
                      </>
                    )}

                    {PAYMENT_INFO?.type === 'paypal' && (
                      <Button className="w-full" onClick={() => openPayPal(PAYMENT_INFO)}>
                        <Send className="size-4" />
                        {t('drinks.pay.payWithPayPal', { amount: formatCurrency(amountToPay) })}
                      </Button>
                    )}

                    <p className="text-xs text-muted-foreground">{t('drinks.pay.confirmationHint')}</p>
                  </section>
                )}

                {lines.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <ListSectionHeader title={t('drinks.pay.items')} count={itemCount} className="px-0 pt-1" />
                    {lines.map((line) => (
                      <Item key={line.id} variant="outline" className="py-2">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold tabular-nums">
                          {line.count}×
                        </div>
                        <ItemContent>
                          <ItemTitle className="truncate">{line.name}</ItemTitle>
                          <ItemDescription>{formatCurrency(line.price)}</ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <span className="text-sm font-semibold tabular-nums">{formatCurrency(line.total)}</span>
                        </ItemActions>
                      </Item>
                    ))}
                  </section>
                )}

                {voucherItems.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <ListSectionHeader title={t('drinks.pay.vouchers')} className="px-0 pt-1" />
                    {voucherItems.map((x) => (
                      <Item key={x.id} variant="outline" className="py-2">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-sm font-bold tabular-nums">
                          {x.count}×
                        </div>
                        <ItemContent>
                          <ItemTitle className="truncate">{x.drink?.name}</ItemTitle>
                          <ItemDescription>
                            <Badge variant="info">
                              <Ticket />
                              {t('drinks.history.voucher')}
                            </Badge>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <span className="text-sm text-muted-foreground tabular-nums">{t('drinks.history.free')}</span>
                        </ItemActions>
                      </Item>
                    ))}
                  </section>
                )}

                {amountToPay > 0 && (
                  <div className="flex justify-between px-2 pt-1 text-base font-bold">
                    <span>{t('drinks.pay.totalCost')}</span>
                    <span className="tabular-nums">{formatCurrency(amountToPay)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default PayDrinksScreen;
