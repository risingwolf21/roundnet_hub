import * as React from 'react';
import { Container, Grid, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import DrinkCheckList from './components/DrinkCheckList';
import { useFirebase } from 'react-redux-firebase';

const App = () => {
  const firebase = useFirebase();

  return <Container>
    <CustomAppBar logout={() => firebase.logout()} />
    <Toolbar />
    <Grid 
      container
      width="100%"
      direction="column"
      alignItems="center"
      justifyContent="center">
      <DrinkCheckList />
    </Grid>
  </Container>
}

export default App;
