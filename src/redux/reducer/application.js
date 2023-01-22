import { AUTHENTICATION_CHANGED } from "../actions/names";


const DEFAULT_STATE = {
    user: null
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
        default: {
            return state;
        }
    }
}
export default application;