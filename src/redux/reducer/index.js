import application from "./application";
import { firestoreReducer } from 'redux-firestore';
import { firebaseReducer } from 'react-redux-firebase';
import { combineReducers } from "redux";

const reducer = combineReducers({ application, firestore: firestoreReducer, firebase: firebaseReducer });

export default reducer;