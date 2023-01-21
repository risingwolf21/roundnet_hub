import { AUTHENTICATION_CHANGED } from "./names"

export const authentication_changed = (user) => {
    return {
        type: AUTHENTICATION_CHANGED,
        payload: user
    };
}