import EuroIcon from '@mui/icons-material/Euro';
import { useDialogs, useNotifications } from '@toolpad/core';
import { useEffect } from 'react';
import { LoadingScreen } from '../../components/LoadingScreen';
import { groupBy } from '../../utils';

import { PaymentHistory } from '@/types/supabaseTypes';
import ContentCopy from '@mui/icons-material/ContentCopy';
import QrCodeIcon from '@mui/icons-material/QrCode';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Stack from '@mui/system/Stack';
import { UseQueryResult } from '@tanstack/react-query';
import QRCode from 'react-qr-code';

import Alert from '@mui/material/Alert';
import { BankTransferDTo, PayPalPaymentDTO } from './PayDrinks.page';

const PAYMENT_INFO: PayPalPaymentDTO | BankTransferDTo = import.meta.env.VITE_PAYMENT_INFO ? JSON.parse(import.meta.env.VITE_PAYMENT_INFO) : undefined;

const PayDrinksScreen = ({
  data: history = [],
  isLoading,
  error,
  refetch,
}: UseQueryResult<PaymentHistory[], Error>) => {
  const notifications = useNotifications();
  const dialogs = useDialogs();

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: 'error', actionText: 'Neu laden', onAction: () => refetch() });
  }, [error, notifications, refetch]);

  if (isLoading) return <LoadingScreen />;

  if (history.length <= 0) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
      </Box>
    );
  }

  const amountToPay = history.filter((x) => !x.voucher).reduce((prev, curr) => prev + (curr.amount ?? 0), 0) ?? 0;

  return (
    <Box>
      {
        PAYMENT_INFO && <>
          <List sx={{ px: 2 }}>
            <Stack direction={"row"} justifyContent="space-between" alignItems="center">
              <Typography fontWeight={"bold"}>Zahlungsinformationen</Typography>

              {
                PAYMENT_INFO.type === 'bank_transfer' && <IconButton onClick={() => {
                  dialogs.alert(<Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Alert severity='info'>
                      Scanne den QR-Code mit deiner Banking-App, um die Banküberweisung schnell und einfach durchzuführen.
                    </Alert>
                    <Box sx={{ display: "flex", flexDirection: "row", mt: 2, justifyContent: "center" }}>
                      <QRCode value={`BCD\n002\n1\nINST\n${PAYMENT_INFO.bic}\n${PAYMENT_INFO.recipient}\n${PAYMENT_INFO.iban}\n\n\n\nGetränkezahlung Roundnet Karlsruhe App
                    `} />
                    </Box>
                  </Box>, { title: 'Bankverbindung QR-Code' });
                }}>
                  <QrCodeIcon />
                </IconButton>
              }
            </Stack>
            {
              PAYMENT_INFO.type === 'bank_transfer' && <>
                <ListItem disablePadding disableGutters dense key={"recipient"} secondaryAction={<IconButton onClick={() => {
                  navigator.clipboard.writeText(PAYMENT_INFO.recipient);
                  notifications.show('Empfänger kopiert', { severity: 'info', autoHideDuration: 1500 });
                }}>
                  <ContentCopy />
                </IconButton>}>
                  <ListItemText primary={PAYMENT_INFO.recipient} secondary={"Empfänger"} />
                </ListItem>

                <ListItem disablePadding disableGutters dense key={"iban"} secondaryAction={<IconButton onClick={() => {
                  navigator.clipboard.writeText(PAYMENT_INFO.iban);
                  notifications.show('IBAN kopiert', { severity: 'info', autoHideDuration: 1500 });
                }}>
                  <ContentCopy />
                </IconButton>}>
                  <ListItemText primary={PAYMENT_INFO.iban} secondary={"IBAN"} />
                </ListItem>

                <ListItem disablePadding disableGutters dense key={"bic"} secondaryAction={<IconButton onClick={() => {
                  navigator.clipboard.writeText(PAYMENT_INFO.bic);
                  notifications.show('BIC kopiert', { severity: 'info', autoHideDuration: 1500 });
                }}>
                  <ContentCopy />
                </IconButton>}>
                  <ListItemText primary={PAYMENT_INFO.bic} secondary={"BIC"} />
                </ListItem>
              </>
            }
            {
              PAYMENT_INFO.type === 'paypal' && <ListItem disableGutters dense key={"paypal"} secondaryAction={<Button variant='contained' startIcon={<EuroIcon />}>Senden</Button>} onClick={() => {
                const newWindow = window.open(
                  `https://www.paypal.me/${PAYMENT_INFO.paypalMeLink}/${amountToPay}EUR`,
                  '_blank',
                  'noopener,noreferrer'
                );
                if (newWindow) newWindow.opener = null;
              }}>
                <ListItemText primary={"Per PayPal senden"} />
              </ListItem>
            }
          </List>
          <Divider />
        </>
      }
      <List>
        {Array.from(
          groupBy(
            history.filter((x) => !x.voucher),
            (x) => x.drink?.name ?? ''
          )
        )
          .map(([key, value]) => {
            return {
              name: key,
              count: value.reduce((prev, curr) => prev + (curr.count ?? 0), 0),
              priceSingle: value[0]?.drink?.price ?? 'NaN',
              priceTotal: value.reduce((prev, curr) => prev + (curr.count ?? 0), 0),
            };
          })
          .map((x) => (
            <ListItem key={'drinks' + x.name} secondaryAction={<Typography>{x.priceTotal} €</Typography>}>
              <ListItemAvatar>
                <Typography>{x.count + ' x'}</Typography>
              </ListItemAvatar>
              <ListItemText primary={x.name} secondary={x.priceSingle + ' €'} />
            </ListItem>
          ))}
        {history.filter((x) => x.voucher).length > 0 &&
          [
            history
              .filter((x) => x.voucher)
              .reduce(
                (prev, curr) => ({
                  totalAmount: curr.amount + prev.totalAmount,
                  count: curr.count + prev.count,
                  name: curr.drink?.name ?? '',
                }),
                { totalAmount: 0, count: 0, name: '' } as { totalAmount: number; count: number; name: string }
              ),
          ].map((x) => (
            <ListItem key={'voucher'} secondaryAction={<Typography>{x.totalAmount} €</Typography>}>
              <ListItemAvatar>
                <Typography>{x.count + ' x'}</Typography>
              </ListItemAvatar>
              <ListItemText primary={x.name} secondary={'Gutscheine'} />
            </ListItem>
          ))}
        {history.length > 0 && (
          <>
            <Divider />
            <ListItem
              key={'totalAmount'}
              secondaryAction={
                <Typography sx={{ fontWeight: 'bold' }}>
                  {history.filter((x) => !x.voucher).reduce((prev, curr) => prev + (curr.amount ?? 0), 0)} €
                </Typography>
              }
            >
              <ListItemText primaryTypographyProps={{ fontWeight: 'bold' }} primary={'Gesamtkosten'} />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );
};

export default PayDrinksScreen;
