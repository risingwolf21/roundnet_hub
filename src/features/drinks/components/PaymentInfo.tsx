import ContentCopy from '@mui/icons-material/ContentCopy';
import EuroIcon from '@mui/icons-material/Euro';
import QrCodeIcon from '@mui/icons-material/QrCode';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useDialogs, useNotifications } from '@toolpad/core';
import QRCode from 'react-qr-code';

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

export const PaymentInfo = ({ amountToPay }: { amountToPay: number }) => {
  const dialogs = useDialogs();
  const notifications = useNotifications();
  return (
    <>
      <Box sx={{ mx: 2 }}>
        <Stack direction={'row'} justifyContent="space-between" alignItems="center">
          <Typography fontWeight={'bold'}>Zahlungsinformationen</Typography>

          {PAYMENT_INFO?.type === 'bank_transfer' && (
            <IconButton
              onClick={() => {
                dialogs.alert(
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Alert severity="info">
                      Scanne den QR-Code mit deiner Banking-App, um die Banküberweisung schnell und einfach
                      durchzuführen.
                    </Alert>
                    <Box sx={{ display: 'flex', flexDirection: 'row', mt: 2, justifyContent: 'center' }}>
                      <QRCode
                        value={`BCD\n002\n1\nINST\n${PAYMENT_INFO.bic}\n${PAYMENT_INFO.recipient}\n${PAYMENT_INFO.iban}\n\n\n\nGetränkezahlung Roundnet Karlsruhe App`}
                      />
                    </Box>
                  </Box>,
                  { title: 'Bankverbindung QR-Code' }
                );
              }}
            >
              <QrCodeIcon />
            </IconButton>
          )}
        </Stack>
        {PAYMENT_INFO?.type === 'bank_transfer' && (
          <>
            <ListItem
              disablePadding
              disableGutters
              dense
              key={'recipient'}
              secondaryAction={
                <IconButton
                  onClick={() => {
                    navigator.clipboard.writeText(PAYMENT_INFO.recipient);
                    notifications.show('Empfänger kopiert', { severity: 'info', autoHideDuration: 1500 });
                  }}
                >
                  <ContentCopy />
                </IconButton>
              }
            >
              <ListItemText primary={PAYMENT_INFO.recipient} secondary={'Empfänger'} />
            </ListItem>

            <ListItem
              disablePadding
              disableGutters
              dense
              key={'iban'}
              secondaryAction={
                <IconButton
                  onClick={() => {
                    navigator.clipboard.writeText(PAYMENT_INFO.iban);
                    notifications.show('IBAN kopiert', { severity: 'info', autoHideDuration: 1500 });
                  }}
                >
                  <ContentCopy />
                </IconButton>
              }
            >
              <ListItemText primary={PAYMENT_INFO.iban} secondary={'IBAN'} />
            </ListItem>

            <ListItem
              disablePadding
              disableGutters
              dense
              key={'bic'}
              secondaryAction={
                <IconButton
                  onClick={() => {
                    navigator.clipboard.writeText(PAYMENT_INFO.bic);
                    notifications.show('BIC kopiert', { severity: 'info', autoHideDuration: 1500 });
                  }}
                >
                  <ContentCopy />
                </IconButton>
              }
            >
              <ListItemText primary={PAYMENT_INFO.bic} secondary={'BIC'} />
            </ListItem>
          </>
        )}
        {PAYMENT_INFO?.type === 'paypal' && (
          <ListItem
            disableGutters
            dense
            key={'paypal'}
            secondaryAction={
              <Button variant="contained" startIcon={<EuroIcon />}>
                Senden
              </Button>
            }
            onClick={() => {
              const newWindow = window.open(
                `https://www.paypal.me/${PAYMENT_INFO.paypalMeLink}/${amountToPay}EUR`,
                '_blank',
                'noopener,noreferrer'
              );
              if (newWindow) newWindow.opener = null;
            }}
          >
            <ListItemText primary={'Per PayPal senden'} />
          </ListItem>
        )}
      </Box>

      <Divider />
    </>
  );
};
