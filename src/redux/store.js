import {applyMiddleware, compose, createStore} from "redux";
import thunk from "redux-thunk";
import reducer from "./reducer";
import persistState from "redux-localstorage";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const enhancers = composeEnhancers(applyMiddleware(thunk), persistState("application"));
const store = createStore(reducer, undefined, enhancers);

export default store;