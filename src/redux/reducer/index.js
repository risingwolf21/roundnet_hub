import application from "./application";
import drinkList from "./drinkList";
import { firestoreReducer } from 'redux-firestore';
import { firebaseReducer } from 'react-redux-firebase';
import { combineReducers } from "redux";

const reducer = combineReducers({ application, drinkList, firestore: firestoreReducer, firebase: firebaseReducer });

export default reducer;