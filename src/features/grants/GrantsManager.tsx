import Layout from '@/components/layout/Layout';
import { useState } from 'react';
import GroupGrantsPanel from './GroupGrantsPanel';
import UserGrantsPanel from './UserGrantsPanel';

import { Search, SearchIconWrapper, StyledInputBase } from '@/components/SearchBar';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material';
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
  const [searchValue, setSearchValue] = useState('');
  const theme = useTheme();

  return (
    <Layout
      appBarContent={
        <Search sx={{ flexGrow: 1 }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <div>
            <StyledInputBase
              sx={{ width: '100% !important' }}
              placeholder="Filter..."
              inputProps={{ 'aria-label': 'search' }}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </Search>
      }
    >
      <Tabs
        value={value}
        onChange={(_, v) => setValue(v)}
        textColor="inherit"
        indicatorColor="secondary"
        variant="fullWidth"
      >
        <Tab label="Gruppen-Grants" />
        <Tab label="Direct-Grants" />
      </Tabs>
      <TabPanel value={value} index={0} dir={theme.direction}>
        <GroupGrantsPanel searchValue={searchValue} />
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        <UserGrantsPanel searchValue={searchValue} />
      </TabPanel>
    </Layout>
  );
};

export default GrantsManager;
