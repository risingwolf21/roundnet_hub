import { translationKeyOfItemType } from '@/utils';
import { AccountBox, Key } from '@mui/icons-material';
import { Avatar, Box, Button, Card, CardActionArea, CardActions, Typography } from '@mui/material';
import { t } from 'i18next';
import { useNavigate } from 'react-router';

export const ItemCard = ({ index, item, user }: { index: number; item: FullItemHolder; user: User }) => {
  const navigate = useNavigate();

  return (
    <Card
      key={index}
      elevation={3}
      sx={{
        width: 200,
        flexShrink: 0,
        p: 0,
      }}
    >
      <CardActionArea sx={{ p: 2, pb: 0 }} onClick={() => navigate(`/keys`)}>
        <Typography
          sx={{
            mb: 1,
            fontSize: '1.2rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mb: 1 }}>
          <Avatar sx={{ background: item.color, width: 40, height: 40, borderRadius: 2, mr: 1 }}>
            <Key />
          </Avatar>
          <Typography>{t(translationKeyOfItemType(item.type))}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          {item.full_current_holder ? (
            <>
              <Avatar sx={{ width: 40, height: 40, borderRadius: 2, mr: 1 }}>
                {item.full_current_holder.avatarUrl ? (
                  <img src={item.full_current_holder.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                ) : (
                  <AccountBox />
                )}
              </Avatar>
              <Typography>{item.full_current_holder.displayName}</Typography>
            </>
          ) : (
            <>
              <Avatar sx={{ width: 40, height: 40, borderRadius: 2, mr: 1 }}>
                <AccountBox />
              </Avatar>
              <Typography>Unbekannt</Typography>
            </>
          )}
        </Box>
      </CardActionArea>
      <CardActions>
        {item.full_current_holder?.userId === user?.userId ? (
          <Button
            color="primary"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/keys?type=handover&key=${encodeURIComponent(item.id)}`);
            }}
          >
            {t('handover_key')}
          </Button>
        ) : (
          <Button
            color="primary"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/keys?type=take&key=${encodeURIComponent(item.id)}`);
            }}
          >
            {t('take_key')}
          </Button>
        )}
      </CardActions>
    </Card>
  );
};
