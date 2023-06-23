import React from 'react';
import ReactDOM from 'react-dom';
import store from "./redux/store";
import * as serviceWorker from './serviceWorker';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { Provider } from 'react-redux';
import firebase from 'firebase/compat/app';
import { ReactReduxFirebaseProvider } from 'react-redux-firebase';
import { createFirestoreInstance } from 'redux-firestore';
import "./global.css";
import App from './App';
import AuthGate from './AuthGate';
import { ThemeProvider } from '@mui/material';
import { mainTheme } from './themes';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536",
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ["localhost", /^https:\/\/roundnet-karlsruher\.web.app/],
    }),
    new Sentry.Replay(),
  ],
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});

const fbConfig = {
  databaseURL: "https://roundnet-karlsruhe-default-rtdb.europe-west1.firebasedatabase.app",
  apiKey: process.env.REACT_APP_apiKey,
  authDomain: process.env.REACT_APP_authDomain,
  projectId: process.env.REACT_APP_projectId,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
};

const rrfConfig = {
  userProfile: 'users',
  useFirestoreForProfile: true, // Firestore for Profile instead of Realtime DB
  profileFactory: (userData, profileData, firebase) => { // how profiles are stored in database
    const { user } = userData
    return {
      email: user.email,
      displayName: profileData.displayName,
      role: "user",
    }
  }
}

firebase.initializeApp(fbConfig);
const db = firebase.firestore();
db.settings({ experimentalAutoDetectLongPolling: true });
db.enablePersistence();

const rrfProps = {
  firebase,
  config: rrfConfig,
  dispatch: store.dispatch,
  createFirestoreInstance // <- needed if using firestore
};

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={mainTheme}>
      <Provider store={store}>
        <ReactReduxFirebaseProvider {...rrfProps}>
          <AuthGate>
            <App />
          </AuthGate>
        </ReactReduxFirebaseProvider>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
)

// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();
