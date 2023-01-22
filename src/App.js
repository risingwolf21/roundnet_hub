import * as React from 'react';
import { Button } from "@mui/material";
import { connect } from "react-redux";
import { authentication_changed } from "./redux/actions";

const App = ({ dispatch }) => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <Button variant="contained" sx={{ mt: 3, mb: 2 }} onClick={() => dispatch(authentication_changed(null))}>Logout</Button>
      </header>
    </div>
  );
}

export default connect()(App);
