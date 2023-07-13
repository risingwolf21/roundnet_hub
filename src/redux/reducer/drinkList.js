import { DRINKS_CHANGED, DRINK_DELETED, DRINK_UPDATED, DRINKS_IN_PAYMENT_CHANGED } from "../actions/names";

const DEFAULT_STATE = {
    drinks: [],
    userUnPaidDrinks: [],
    userPaidDrinks: [],
    userInPaymentDrinks: []
};

const drinkList = (state = DEFAULT_STATE, action) => {
    switch (action.type) {
        case DRINKS_CHANGED: {
            return {
                ...state,
                drinks: action.payload
            }
        }
        case DRINK_UPDATED: {
            const i = state.drinks.findIndex(x => x.id === action.payload.id);
            const newDrinks = [...state.drinks];
            if (i > -1) {
                newDrinks[i] = action.payload;
            } else {
                newDrinks.push(action.payload);
            }
            return {
                ...state,
                drinks: newDrinks
            }
        }
        case DRINK_DELETED: {
            const i = state.drinks.findIndex(x => x.id === action.payload);
            const newDrinks = [...state.drinks];
            if (i > -1)
                newDrinks.splice(i, 1);
            return {
                ...state,
                drinks: newDrinks
            }
        }
        case DRINKS_IN_PAYMENT_CHANGED: {
            return {
                ...state,
                userInPaymentDrinks: action.payload
            }
        }
        default: {
            return state;
        }
    }
}
export default drinkList;