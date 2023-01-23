import * as React from 'react';
import { Box } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import CustomDrawer from './components/Drawer';
import { connect } from "react-redux";
import { logout } from "./redux/actions";

const App = ({ dispatch }) => {
  return <Box>
    <CustomAppBar logout={() => dispatch(logout())} />

    <CustomDrawer dispatch={dispatch} />
  </Box>
}

export default connect()(App);
