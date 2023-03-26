import { AUTHENTICATION_CHANGED, DRINKS_CHANGED } from "../actions/names";


const DEFAULT_STATE = {
    user: null,
    drinks: []
};

const application = (state = DEFAULT_STATE, action) => {
    switch (action.type) {
        case AUTHENTICATION_CHANGED: {
            console.log(action);
            return {
                ...state,
                user: action.payload
            }
        }
        case DRINKS_CHANGED: {
            console.log(action.payload);
            return {
                ...state,
                drinks: action.payload
            }
        }
        default: {
            return state;
        }
    }
}
export default application;