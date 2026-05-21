import { useEffect } from 'react';

import { PullToRefresh } from '@/components/PullToRefresh';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { useDialogs } from '@/contexts/DialogsProvider';
import { usePaymentHistory } from '@/tanstack/drinks';
import { t } from 'i18next';
import groupBy from 'lodash.groupby';
import { Copy, InfoIcon, QrCode, Send } from 'lucide-react';
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

const PayDrinksScreen = () => {
  const { user } = useGrants();
  const dialogs = useDialogs();
  const { data: history = [], refetch, isLoading, error } = usePaymentHistory(user.id);

  const amountToPay = history.filter((x) => !x.voucher).reduce((prev, curr) => prev + (curr.amount ?? 0), 0) ?? 0;

  useEffect(() => {
    if (error)
      toast.error(error.message, { action: <Button onClick={() => refetch()}>Neu laden</Button> })
  }, [error, refetch]);

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t("drinks.drinks")}
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh
          onRefresh={() => {
            refetch();
          }}>
          <div className='flex flex-col gap-2 p-2'>
            <Item variant={"outline"}>
              <div className='flex w-full justify-between'>
                <div className='text-base font-bold'>Zahlungsinformationen</div>
                {
                  PAYMENT_INFO?.type === 'bank_transfer' && <Button variant={"ghost"} size={"icon-lg"} onClick={() => {
                    dialogs.alert(<div>
                      <Alert variant={"info"}>
                        <InfoIcon className='!size-5' />
                        <AlertDescription>Scanne den QR-Code mit deiner Banking-App, um die Banküberweisung schnell und einfach
                          durchzuführen.</AlertDescription>
                      </Alert>
                      <div className='flex flex-row justify-center align-center mt-4'>
                        <QRCode
                          value={`BCD\n002\n1\nINST\n${PAYMENT_INFO.bic}\n${PAYMENT_INFO.recipient}\n${PAYMENT_INFO.iban}\n\n\n\nGetränkezahlung Roundnet Karlsruhe App`}
                        />
                      </div>
                    </div>)
                  }}>
                    <QrCode className='size-6' />
                  </Button>
                }
              </div>
              <ItemContent>
                {
                  PAYMENT_INFO?.type === "bank_transfer" && <div className='flex flex-col gap-2'>
                    <Item key={"recipient"} className='p-0'>
                      <ItemContent>
                        <ItemTitle>
                          {PAYMENT_INFO.recipient}
                        </ItemTitle>
                        <ItemDescription>
                          Empfänger
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button variant={"ghost"} onClick={() => {
                          navigator.clipboard.writeText(PAYMENT_INFO.recipient);
                          toast.info('Empfänger kopiert');
                        }}>
                          <Copy className='size-4' />
                        </Button>
                      </ItemActions>
                    </Item>

                    <Separator />

                    <Item key={"iban"} className='p-0'>
                      <ItemContent>
                        <ItemTitle>
                          {PAYMENT_INFO.iban}
                        </ItemTitle>
                        <ItemDescription>
                          IBAN
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button variant={"ghost"} onClick={() => {
                          navigator.clipboard.writeText(PAYMENT_INFO.iban);
                          toast.info('IBAN kopiert');
                        }}>
                          <Copy className='size-4' />
                        </Button>
                      </ItemActions>
                    </Item>

                    <Separator />

                    <Item key={"bic"} className='p-0'>
                      <ItemContent>
                        <ItemTitle>
                          {PAYMENT_INFO.bic}
                        </ItemTitle>
                        <ItemDescription>
                          BIC
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button variant={"ghost"} onClick={() => {
                          navigator.clipboard.writeText(PAYMENT_INFO.bic);
                          toast.info('BIC kopiert');
                        }}>
                          <Copy className='size-4' />
                        </Button>
                      </ItemActions>
                    </Item>
                  </div>
                }

                {
                  PAYMENT_INFO?.type === "paypal" && <div>
                    <Item key={"paypal"} className='p-0'>
                      <ItemContent>
                        <ItemTitle>
                          Per PayPal senden
                        </ItemTitle>
                        <ItemDescription>
                          {PAYMENT_INFO.paypalMeLink}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button variant={"ghost"} onClick={() => {
                          const newWindow = window.open(
                            `https://www.paypal.me/${PAYMENT_INFO.paypalMeLink}/${amountToPay}EUR`,
                            '_blank',
                            'noopener,noreferrer'
                          );
                          if (newWindow) newWindow.opener = null;
                        }}>
                          <Send className='size-4' />
                        </Button>
                      </ItemActions>
                    </Item>
                  </div>
                }
              </ItemContent>
            </Item>
            <div className="text-sm font-semibold">
              Verlauf
            </div>
            <div className='flex flex-col gap-2'>
              {
                Object.entries(
                  groupBy(
                    history.filter((x) => !x.voucher),
                    (x) => JSON.stringify(x.drink)
                  )
                )
                  .map(([key, value]) => {
                    const drink = JSON.parse(key) as { id: string; name: string; price: number };
                    return {
                      drink,
                      count: value.reduce((prev, curr) => prev + (curr.count ?? 0), 0),
                      priceSingle: drink.price ?? 'NaN',
                      priceTotal: value.reduce((prev, curr) => prev + curr.count * drink.price, 0),
                    };
                  })
                  .map((x) => (
                    <Item key={x.drink.id} variant={"outline"} className='py-1'>
                      <div className='text-base'>{x.count}x</div>
                      <ItemContent>
                        <ItemTitle>
                          {x.drink.name}
                        </ItemTitle>
                        <ItemDescription>
                          {x.priceSingle} €
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <div className='text-sm'>{(x.count ?? 0) * (x.drink?.price ?? 1)} €</div>
                      </ItemActions>
                    </Item>
                  ))
              }
            </div>
            {history.filter((x) => x.voucher).length > 0 &&
              [
                history
                  .filter((x) => x.voucher)
                  .reduce(
                    (prev, curr) => ({
                      totalAmount: curr.amount + prev.totalAmount,
                      count: curr.count + prev.count,
                      name: curr.drink?.name ?? '',
                      id: curr.id
                    }),
                    { totalAmount: 0, count: 0, name: '' } as { id: number, totalAmount: number; count: number; name: string }
                  ),
              ].map((x) => (
                <Item key={x.id} variant={"outline"} className='py-1'>
                  <div className='text-base'>{x.count}x</div>
                  <ItemContent>
                    <ItemTitle>
                      {x.name}
                    </ItemTitle>
                    <ItemDescription>
                      Gutscheine
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <div className='text-sm'>{x.totalAmount} €</div>
                  </ItemActions>
                </Item>
              ))}
            {history.length > 0 && (
              <>
                <Separator />
                <div className='flex justify-between mx-2'>
                  <div className='text-base font-bold'>Gesamtkosten</div>
                  <div className='text-base font-bold'>{amountToPay} €</div>
                </div>
              </>
            )}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default PayDrinksScreen;
