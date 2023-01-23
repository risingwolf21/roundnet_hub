import { AUTHENTICATION_CHANGED, USERS_CHANGED } from "./names"
import User from "../../model/user";

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

export const createUserAction = (user) => {
    return (dispatch, getState, {getFirestore}) => {
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