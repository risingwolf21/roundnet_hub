import { Slide, SlideProps } from "@mui/material";
import { Duration, add, format, parse } from "date-fns";
import dayjs from "dayjs";
import { forwardRef } from "react";
import React from "react";
import { EventRecurrence, ProductType } from "src/types/supabaseTypes";

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

export const dayjsFromDb = (date: string | null) => {
    if (!date) return null;
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

export const calculateEventDateWith = (eventDateTime: string | null, eventUpdateDateTime: string | null, difference: Duration, recurrence: EventRecurrence, index: number) => {
    // if the current event has this date we can simply add our calculated difference
    if (eventDateTime) {
        return formatDateToDatabase(add(eventDateTime, difference))
    }
    //
    if (eventUpdateDateTime) {

    }
    return null;
}

export const dataURLtoFile = (dataurl: string, filename: string): File => {
    var arr = dataurl.split(',');
    var mime = ((arr[0] ?? "").match(/:(.*?);/) ?? [])[1] ?? null;
    var bstr = atob(arr[arr.length - 1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

export function readFile(file: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.addEventListener('load', () => resolve(reader.result), false)
        reader.readAsDataURL(file)
    })
}