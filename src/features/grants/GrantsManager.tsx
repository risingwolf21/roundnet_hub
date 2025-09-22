import Layout from '@/components/layout/Layout';
import { useState } from 'react';
import GroupGrantsPanel from './GroupGrantsPanel';
import UserGrantsPanel from './UserGrantsPanel';

import { useTheme } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

export const TabPanel = (props: any) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
};

const GrantsManager = () => {
  const [value, setValue] = useState(0);
  const theme = useTheme();

  return (
    <Layout
      appBarConfig={{
        showProfile: false,
      }}
    >
      <AppBar position="sticky" elevation={0} sx={{ '&.MuiAppBar-root': { backgroundColor: '#fff', color: '#000' } }}>
        <Tabs
          value={value}
          onChange={(_, v) => setValue(v)}
          indicatorColor="primary"
          textColor="inherit"
          variant="fullWidth"
        >
          <Tab label="Gruppen-Grants" />
          <Tab label="Direct-Grants" />
        </Tabs>
      </AppBar>
      <TabPanel value={value} index={0} dir={theme.direction}>
        <GroupGrantsPanel />
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        <UserGrantsPanel />
      </TabPanel>
    </Layout>
  );
};

export default GrantsManager;
