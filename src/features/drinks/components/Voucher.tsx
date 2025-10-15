import { useVouchers } from '@/tanstack/drinks';
import { useNotifications } from '@toolpad/core';
import { useEffect } from 'react';

import Redeem from '@mui/icons-material/Redeem';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';

const VoucherCard = () => {
  const notifications = useNotifications();
  const { data: vouchers = [], isLoading, error } = useVouchers();

  useEffect(() => {
    if (error) notifications.show(error.message, { severity: 'error' });
  }, [error, notifications]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      {vouchers.length > 0 && (
        <List
          subheader={
            <ListSubheader
              sx={{ zIndex: '-1', fontWeight: 'bold', lineHeight: 'normal', my: 1 }}
              id="nested-list-subheader"
            >
              Gutscheine
            </ListSubheader>
          }
        >
          {vouchers.map((x) => (
            <ListItem key={x.id} secondaryAction={<Chip color={'secondary'} label={x.available} />}>
              <ListItemAvatar>
                <Avatar sx={{ background: '#88AEBF', width: 40, height: 40, borderRadius: 2 }}>
                  <Redeem />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={x.title} />
            </ListItem>
          ))}
        </List>
      )}
    </>
  );
};

export default VoucherCard;
