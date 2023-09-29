import { Slide } from "@mui/material";
import { forwardRef } from "react";

export const totalAmountToPay = (drinks) => {
    if (!drinks)
        return 0;

    return Object.values(drinks)
        .reduce((prev, curr) => {
            if (curr.count < 0 || curr.price < 0)
                throw new Error("Price or Count of drink can not be less than 0");
            return prev + (curr.count * curr.price)
        }, 0);
}


export const groupBy = (items, getter) => items.reduce(
    (result, item) => ({
        ...result,
        [getter(item)]: [
            ...(result[getter(item)] || []),
            item,
        ],
    }),
    {},
);

export const SlideUpTransition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});