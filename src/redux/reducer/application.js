import { AUTHENTICATION_CHANGED, DRINKS_CHANGED } from "../actions/names";


const DEFAULT_STATE = {
    user: null,
    drinks: []
};

const application = (state = DEFAULT_STATE, action) => {
    switch (action.type) {
        case AUTHENTICATION_CHANGED: {
            return {
                ...state,
                user: action.payload
            }
        }
        case DRINKS_CHANGED: {
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