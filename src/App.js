import * as React from 'react';
import { Container, Grid, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import DrinkList from './components/DrinkList';
import { useFirebase } from 'react-redux-firebase';
import BottomInformation from './components/BottomInformation';

const App = () => {
  const firebase = useFirebase();

  return <Grid>
    <CustomAppBar logout={() => firebase.logout()} />
    <Toolbar />
    <DrinkList />
  </Grid>
}

export default App;
