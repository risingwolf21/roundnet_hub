import { AUTHENTICATION_CHANGED } from "../actions/names";


const DEFAULT_STATE = {
    user: null
};

export default (state = DEFAULT_STATE, action) => {
    switch (action.type) {
        case AUTHENTICATION_CHANGED: {
            console.log(action);
            return {
                ...state,
                user: action.payload
            }
        }
        default: {
            return state;
        }
    }
}