import * as React from 'react';
import { Container, Grid, SwipeableDrawer, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import DrinkList from './components/DrinkList';
import { useFirebase } from 'react-redux-firebase';
import BottomInformation from './components/BottomInformation';
import SideBar from './components/Sidebar';

const App = () => {
  const firebase = useFirebase();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return <Grid>
    <CustomAppBar logout={() => firebase.logout()} handleMenuClick={(val) => setDrawerOpen(val)} drawerOpen={drawerOpen} />
    <Toolbar />
    <DrinkList />
    <SideBar open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
  </Grid>
}

export default App;
