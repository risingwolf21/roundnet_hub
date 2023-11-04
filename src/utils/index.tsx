import { Slide, SlideProps } from "@mui/material";
import moment, { MomentInput } from "moment";
import { forwardRef } from "react";
import React from "react";

export const compareById = (x: any, y: any) => {
    return x.id === y.id;
}

export function groupBy<Type>(items: Type[], getter: (any: Type) => string): Map<string, Type[]> {
    let result = new Map<string, Type[]>();
    (items ?? []).forEach((item: Type) => {
        let key = getter(item);
        let entry = result.get(key);
        if (!entry) {
            return result.set(key, [item])
        } else {
            result.set(key, [...entry, item])
        }
    });
    return result;
}

export const SlideUpTransition = forwardRef(function Transition(props: SlideProps, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const formatDateToDatabase = (date: MomentInput) => {
    return moment(date).format("yyyy-MM-DD HH:mm:ssZ")
}

export class RegistrationError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class MultiplePaymentsError extends Error {

    constructor() {
        super();
    }
}

export class FetchingError extends Error {

    private screen: string

    constructor(message: string, screen: string) {
        super(message);
        this.screen = screen;
    }
}