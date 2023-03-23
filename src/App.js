import * as React from 'react';
import { AppBar, Box, Container, Grid, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import CustomDrawer from './components/Drawer';
import DrinkCheckList from './components/DrinkCheckList';
import { connect } from "react-redux";
import { loadDrinks, logout } from "./redux/actions";
import { compose } from 'redux';
import { firestoreConnect, isLoaded, useFirebase } from 'react-redux-firebase';

const App = ({ }) => {
  const firebase = useFirebase();

  return <Container>
    <CustomAppBar logout={() => firebase.logout()} />
    <Toolbar />
    <Grid 
      container
      sx={{ my: 2 }}
      direction="column"
      alignItems="center"
      justifyContent="center">
      <DrinkCheckList />
    </Grid>
  </Container>
}

export default App;
