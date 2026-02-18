import { BRANDING } from '@/utils';
import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApplication } from '../../features/auth/ApplicationContext';
import { Drawer, drawerWidth } from '../Drawer';

import AccountCircle from '@mui/icons-material/AccountCircle';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Menu from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type Props = {
  children: ReactNode;
  appBarContent?: ReactNode;
  appBarActions?: ReactNode;
  appBarConfig?: {
    title?: string;
    navigateBackPath?: string | number;
    showProfile?: boolean;
  };
};

const Layout = ({
  children,
  appBarContent,
  appBarActions,
  appBarConfig: { title = BRANDING.title, showProfile = true, navigateBackPath } = {
    title: BRANDING.title,
    showProfile: true,
  },
}: Props) => {
  const navigate = useNavigate();
  const { user } = useApplication();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box
      sx={{
        // Vollbild – dynamische Viewport-Höhe für Mobile
        height: '100dvh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,

        // Safe-Area seitlich/unten am gesamten Layout
        pl: 'env(safe-area-inset-left)',
        pr: 'env(safe-area-inset-right)',
        pb: 'env(safe-area-inset-bottom)',

        // Layout: AppBar oben, Content füllt restliche Höhe
        display: 'grid',
        gridTemplateRows: 'min-content 1fr',
        gridTemplateColumns: {
          xs: '1fr', // < lg: keine feste Drawer-Spalte
          lg: `${drawerWidth}px 1fr`, // >= lg: Drawer | Content
        },
        minHeight: 0, // wichtig für korrektes Scrollen im zweiten Grid-Track
        background: 'primary',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', lg: 'block' },
          gridRow: '1 / span 2', // Drawer-Spalte über beide Reihen
          gridColumn: 1,
          minWidth: 0,
        }}
      >
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
      </Box>

      <Box sx={{ gridColumn: { xs: '1', lg: '2' }, gridRow: '1' }}>
        <AppBar
          position="sticky"
          sx={(theme) => ({
            pt: 'env(safe-area-inset-top)',
            pl: 'env(safe-area-inset-left)',
            pr: 'env(safe-area-inset-right)',
            zIndex: theme.zIndex.drawer - 1,
            background: 'primary',
            top: 0,
          })}
        >
          <Toolbar disableGutters sx={{ px: 2 }}>
            {navigateBackPath ? (
              <IconButton
                color="inherit"
                onClick={() => typeof navigateBackPath === 'number' ? navigate(navigateBackPath) : navigate(navigateBackPath)}
                edge="start"
                sx={{
                  mr: 2,
                }}
              >
                <ArrowBack />
              </IconButton>
            ) : (
              <IconButton
                color="inherit"
                onClick={() => setDrawerOpen(true)}
                edge="start"
                sx={(theme) => ({
                  mr: 2,
                  [theme.breakpoints.up('lg')]: {
                    display: 'none',
                  },
                })}
              >
                <Menu />
              </IconButton>
            )}

            {appBarContent ? (
              appBarContent
            ) : (
              <>
                {/* Title */}
                <Typography variant="h6" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {title}
                </Typography>
                {/* Profile */}
                {showProfile && user && (
                  <IconButton
                    color="inherit"
                    onClick={() => {
                      navigate('/user');
                    }}
                  >
                    {user.avatarUrl ? (
                      <Avatar sx={{ borderRadius: 2, width: '35px', height: '35px' }}>
                        <img src={user?.avatarUrl} alt="logo" width={'35px'} height={'35px'} />
                      </Avatar>
                    ) : (
                      <AccountCircle />
                    )}
                  </IconButton>
                )}
                {appBarActions}
              </>
            )}
          </Toolbar>
        </AppBar>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          gridColumn: { xs: '1', lg: '2' },
          gridRow: '2',
          minHeight: 0,
          overflow: 'auto',
          overscrollBehavior: 'none',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
