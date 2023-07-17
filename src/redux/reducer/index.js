import application from "./application";
import drinkList from "./drinkList";
import { combineReducers } from "redux";

const reducer = combineReducers({ application, drinkList });

export default reducer;