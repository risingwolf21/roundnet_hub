import { useDismissNotification } from "@/tanstack/notifications";
import { Json } from "@/types/supabase-generated.types";
import Badge from "@mui/material/Badge";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import Box from "@mui/system/Box";
import { t } from "i18next";
import { useNavigate } from "react-router";
import { Notification } from "types/supabase";

function hasStringUrl(value: Json): value is { url: string } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as any).url === 'string';
}

export const NotificationItem = ({ notification }: { notification: Notification }) => {

  const navigate = useNavigate();
  const dismissNotification = useDismissNotification();

  return <ListItem
    divider
    key={notification.id}
    onClick={() => {
      if (notification.data && hasStringUrl(notification.data)) {
        navigate(notification.data.url);
      }
      dismissNotification.mutate({ notficationId: notification.id });
    }}
    sx={{
      justifyContent: 'space-between',
    }}
  >
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'start',
        alignContent: 'start',
        mt: '6px',
        mb: '6px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Typography
          sx={{
            margin: 0,
            fontFamily: '"Roboto", "Helvetica", "Arial"," sans-serif"',
            fontSize: '16px',
            color: '#000000DE',
          }}
        >
          {notification.title}
        </Typography>
        <Typography
          style={{
            fontSize: '10pt',
            color: 'rgba(0,0,0,0.6)',
          }}
        >
          {t('format.distanceToNow', { date: new Date(notification.created_at) })}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Typography
          sx={{
            margin: 0,
            fontFamily: '"Roboto", "Helvetica", "Arial"," sans-serif"',
            fontWeight: 400,
            fontSize: '0.875rem',
            lineHeight: '1.43',
            color: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          {notification.body}
        </Typography>
        {!notification.dismissed_at && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginRight: "8px" }}>
            <Badge
              badgeContent=" "
              variant="dot"
              color="error"
              sx={{ '.MuiBadge-badge': { width: '12px', height: '12px', borderRadius: '6px' } }}
            />
          </div>
        )}
      </Box>
    </Box>
  </ListItem>
}