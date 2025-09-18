import { Redeem } from '@mui/icons-material';
import { Avatar, Chip, List, ListItem, ListItemAvatar, ListItemText, ListSubheader } from '@mui/material';
import { useNotifications } from '@toolpad/core';
import React, { useEffect } from 'react';
import { useVouchers } from '@/tanstack/drinks';

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
