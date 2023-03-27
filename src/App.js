import * as React from 'react';
import { Container, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import DrinkList from './components/DrinkList';
import { useFirebase } from 'react-redux-firebase';

const App = () => {
  const firebase = useFirebase();

  return <Container>
    <CustomAppBar logout={() => firebase.logout()} />
    <Toolbar />
    <DrinkList />
  </Container>
}

export default App;
