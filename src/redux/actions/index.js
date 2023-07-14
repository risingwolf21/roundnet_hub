import { AUTHENTICATION_CHANGED, DRINKS_CHANGED, DRINK_DELETED, DRINK_UPDATED, USERS_CHANGED, DRINKS_IN_PAYMENT_CHANGED } from "./names"

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

export const user_in_payment_drinks = (drinks) => {
    return {
        type: DRINKS_IN_PAYMENT_CHANGED,
        payload: drinks
    }
}