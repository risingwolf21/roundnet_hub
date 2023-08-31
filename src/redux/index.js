import { DRINK_DELETED, DRINK_INSERTED, DRINK_UPDATED } from "./names"

export const drinkUpdated = (payload) => {
    return {
        type: DRINK_UPDATED,
        payload
    }
}

export const drinkInserted = (payload) => {
    return {
        type: DRINK_INSERTED,
        payload
    }
}

export const drinkDeleted = (payload) => {
    return {
        type: DRINK_DELETED,
        payload
    }
}