import { EXAMPLE_ACTION_NAME } from "../actions/names";


const DEFAULT_STATE = {
    test: 1
};

export default (state = DEFAULT_STATE, action) => {
    switch (action.type) {
        case EXAMPLE_ACTION_NAME: {
            return {
                ...state,
                test: action.payload
            }
        }
        default: {
            return state;
        }
    }
}