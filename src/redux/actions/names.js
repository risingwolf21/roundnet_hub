export const EXAMPLE_ACTION_NAME = "EXAMPLE_ACTION_NAME";
export const AUTHENTICATION_CHANGED = "AUTHENTICATION_CHANGED";
export const USERS_CHANGED = "USERS_CHANGED";
export const DRINKS_CHANGED = "DRINKS_CHANGED";
export const DRINK_UPDATED = "DRINK_UPDATED";
export const DRINK_DELETED = "DRINK_DELETED";
export const DRINKS_IN_PAYMENT_CHANGED = "DRINKS_IN_PAYMENT_CHANGED";

export const pending = (name) => {
    return name + "_PENDING";
};

export const failed = (name) => {
    return name + "_FAILED";
};

export const completed = (name) => {
    return name + "_COMPLETED";
};