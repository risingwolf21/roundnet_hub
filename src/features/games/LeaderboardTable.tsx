import { ProfileDialog } from "@/components/Profile";
import AccountBox from "@mui/icons-material/AccountBox";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useDialogs } from "@toolpad/core";
import { t } from "i18next";

export const LeaderboardTable = ({ leaderboard, loading = true }: { leaderboard: LeaderboardEntry[], loading: boolean }) => {

  const dialogs = useDialogs();

  if (loading) {
    return (<List>
      {Array.from({ length: 10 }, (_v, k) => k + 1).map((x) => (
        <ListItem divider key={x}>
          <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center', mr: 2, ml: 1 }}>
            <Skeleton width={25} height={25} variant="rectangular" sx={{ borderRadius: 2, mr: 2 }} />
            <Skeleton width={45} height={45} variant="rectangular" sx={{ borderRadius: 2 }} />
          </ListItemAvatar>
          <ListItemText slotProps={{ primary: { fontWeight: "bold", fontSize: "1rem" } }} primary={<Skeleton width={'175px'} height="100%" variant="text" />} />
          <Skeleton width={45} height={20} variant="rectangular" sx={{ borderRadius: 2 }} />
        </ListItem>
      ))}
    </List>)
  }

  return (
    <List>
      {
        leaderboard.map((entry) => (
          <ListItem divider key={entry.player_id} onClick={() => entry.player_id && dialogs.open(ProfileDialog, { userId: entry.linked_user_id, playerId: entry.player_id })}>
            <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center', mr: 2 }}>
              <Avatar sx={{ borderRadius: 2, backgroundColor: 'transparent', width: '50px', height: '50px' }}>
                <Typography
                  sx={{
                    fontWeight: 'bold',
                    color: 'black',
                    mr: 1,
                  }}
                >
                  {entry.position + '.'}
                </Typography>
              </Avatar>
              <Avatar sx={{ borderRadius: 2, width: '45px', height: '45px' }}>
                {entry.avatar_url ? <img src={entry.avatar_url} alt="logo" width={'100%'} height={'100%'} /> : <AccountBox />}
              </Avatar>
            </ListItemAvatar>
            <ListItemText slotProps={{ primary: { fontWeight: "bold", fontSize: "1rem" } }} primary={entry.name} />
            <Tooltip leaveDelay={1500} title={t('matches.leaderboardTooltip', { trend: entry.trend_30_days })} onClick={(e) => e.stopPropagation()}>
              <Chip color={'default'} size="small" sx={{ fontWeight: "bold", py: 2 }} label={entry.rating?.toFixed() + ' ' + ((entry.trend_30_days ?? 0) > 0 ? '↗️' : (entry.trend_30_days ?? 0) < 0 ? '↘️' : '↔️')} />
            </Tooltip>
          </ListItem>
        ))
      }
    </List>
  );
}