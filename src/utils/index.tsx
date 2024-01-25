import { Slide, SlideProps } from "@mui/material";
import { format, parse } from "date-fns";
import dayjs from "dayjs";
import { forwardRef } from "react";
import React from "react";
import { ProductType } from "src/types/supabaseTypes";

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

export const formatDateToDatabase = (date: Date) => {
    return format(date, "yyyy-MM-dd'T'HH:mm:ssxxx");
}

export const formatDateFromDatabase = (date: string) => {
    return parse(date, "yyyy-MM-dd'T'HH:mm:ssxxx", new Date());
}

export const dayjsFromDb = (date: string) => {
    return dayjs(formatDateFromDatabase(date));
}

export class RegistrationError extends Error {

}

export class MultiplePaymentsError extends Error {

}

export class FetchingError extends Error {

    private screen: string

    constructor(message: string, screen: string) {
        super(message);
        this.screen = screen;
    }
}

export const nameOfProductType = (type: ProductType) => {
    switch (type) {
        case "Drink": return "Getränke"
        case "Special": return "Anderes"
        case "None": return "Ohne Typ"
    }
}