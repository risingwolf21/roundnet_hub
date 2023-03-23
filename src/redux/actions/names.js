export const EXAMPLE_ACTION_NAME = "EXAMPLE_ACTION_NAME";
export const AUTHENTICATION_CHANGED = "AUTHENTICATION_CHANGED";
export const USERS_CHANGED = "USERS_CHANGED";
export const DRINKS_CHANGED = "DRINKS_CHANGED";

export const pending = (name) => {
    return name + "_PENDING";
};

export const failed = (name) => {
    return name + "_FAILED";
};

export const completed = (name) => {
    return name + "_COMPLETED";
};