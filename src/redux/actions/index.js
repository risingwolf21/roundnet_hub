import { AUTHENTICATION_CHANGED, DRINKS_CHANGED, DRINK_DELETED, DRINK_UPDATED, USERS_CHANGED } from "./names"
import User from "../../model/user";
import Drink from "../../model/drink";

export const authentication_changed = (user) => {
    return {
        type: AUTHENTICATION_CHANGED,
        payload: user
    };
}

export const logout = () => {
    return {
        type: AUTHENTICATION_CHANGED,
        payload: null
    };
}

const users_changed = (users) => {
    return {
        type: USERS_CHANGED,
        payload: users
    }
}

export const drinks_changed = (drinks) => {
    return {
        type: DRINKS_CHANGED,
        payload: drinks
    }
}

export const drink_updated = (drink) => {
    return {
        type: DRINK_UPDATED,
        payload: drink
    }
}

export const drink_deleted = (id) => {
    return {
        type: DRINK_DELETED,
        payload: id
    }
}

export const createUserAction = (user) => {
    return (dispatch, getState, { getFirestore }) => {
        const firestore = getFirestore();
        firestore.collection("users").add({
            ...user
        }).then(() => {
        }).catch((err) => {
        })
    }
}

export const getUsers = () => {
    return (dispatch, getState, { getFirestore }) => {
        const firestore = getFirestore()
        firestore.collection('users').get().then((snapshot) => {
            const users = snapshot.docs.map(x => User.fromJson(x));
            dispatch(users_changed(users));
        });
    }
}

export const loadDrinks = () => {
    return (dispatch, getState, { getFirestore }) => {
        const firestore = getFirestore();
        firestore.collection('drinks').get().then((snapshot) => {
            const drinks = snapshot.docs.map(x => Drink.fromJson(x));
            dispatch(drinks_changed(drinks));
        });
    }
}