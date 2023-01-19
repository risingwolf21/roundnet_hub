export const EXAMPLE_ACTION_NAME = "EXAMPLE_ACTION_NAME";

export const pending = (name) => {
    return name + "_PENDING";
};

export const failed = (name) => {
    return name + "_FAILED";
};

export const completed = (name) => {
    return name + "_COMPLETED";
};