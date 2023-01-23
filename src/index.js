import React from 'react';
import ReactDOM from 'react-dom/client';
import store from "./redux/store";
import * as serviceWorker from './serviceWorker';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { Provider } from 'react-redux';
import AuthGate from "./AuthGate";
import App from "./App";
import firebase from "firebase/compat/app";

firebase.initializeApp({
  apiKey: process.env.REACT_APP_apiKey,
  authDomain: process.env.REACT_APP_authDomain,
  databaseURL: process.env.REACT_APP_databaseURL,
  projectId: process.env.REACT_APP_projectId,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* <ThemeProvider theme={appTheme}> */}
      <Provider store={store}>
        <AuthGate>
          <App />
        </AuthGate>
      </Provider>
    {/* </ThemeProvider> */}
  </React.StrictMode>
);

// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
