import { Slide, SlideProps } from '@mui/material';
import { add, Duration, format, parse } from 'date-fns';
import dayjs from 'dayjs';
import React, { forwardRef } from 'react';
import Logo from '../images/Karlsruher_Kojoten_Logo.svg';

export const BRANDING = {
  logo: (<img
    src={Logo}
    alt="MUI logo"
    style={{ height: 96 }}
  />),
  title: 'Roundnet Karlsruhe',
}

export const compareById = (x: any, y: any) => {
  return x.id === y.id;
};

export function groupBy<Type>(items: Type[], getter: (any: Type) => string): Map<string, Type[]> {
  let result = new Map<string, Type[]>();
  (items ?? []).forEach((item: Type) => {
    let key = getter(item);
    let entry = result.get(key);
    if (!entry) {
      return result.set(key, [item]);
    } else {
      result.set(key, [...entry, item]);
    }
  });
  return result;
}

export const SlideUpTransition = forwardRef(function Transition(props: SlideProps, ref) {
  return (
    <Slide direction="up" ref={ref} {...props}>
      {props.children}
    </Slide>
  );
});

export const formatDateToDatabase = (date: string | number | Date) => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
};

export const formatDateFromDatabase = (date: string) => {
  return parse(date, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
};

export const dayjsFromDb = (date: string | null) => {
  if (!date) return null;
  return dayjs(formatDateFromDatabase(date));
};

export class RegistrationError extends Error { }

export class MultiplePaymentsError extends Error { }

export class FetchingError extends Error {
  private screen: string;

  constructor(message: string, screen: string) {
    super(message);
    this.screen = screen;
  }
}

export const translationKeyOfItemType = (type: ItemType | null) => {
  switch (type) {
    case "goethe":
      return "itemType.goethe";
    case "mtvGym":
      return "itemType.mtvGym";
    case "mtvGymPalazzo":
      return "itemType.mtvGymPalazzo";
    case "mtvStorage":
      return "itemType.mtvStorage";
    default:
      return "Not found"
  }
}

export const nameOfProductType = (type: ProductType) => {
  switch (type) {
    case 'Drink':
      return 'Getränke';
    case 'Special':
      return 'Anderes';
    case 'None':
      return 'Ohne Typ';
  }
};

export const nameOfRecurrence = (type: EventRecurrence) => {
  switch (type) {
    case 'Weekly':
      return 'Wöchentlich';
    case 'Fortnightly':
      return 'Alle 2 Wochen';
    case 'Monthly':
      return 'Monatlich';
    case 'None':
      return 'Keine';
  }
};

export const calculateEventDateWith = (
  eventDateTime: string | null,
  eventUpdateDateTime: string | null,
  difference: Duration,
  recurrence: EventRecurrence,
  index: number
) => {
  // if the current event has this date we can simply add our calculated difference
  if (eventDateTime) {
    return formatDateToDatabase(add(eventDateTime, difference));
  }
  //
  if (eventUpdateDateTime) {
  }
  return null;
};

export const dataURLtoFile = (dataurl: string, filename: string): File => {
  var arr = dataurl.split(',');
  var mime = ((arr[0] ?? '').match(/:(.*?);/) ?? [])[1] ?? null;
  var bstr = atob(arr[arr.length - 1]);
  var n = bstr.length;
  var u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export function readFile(file: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result), false);
    reader.readAsDataURL(file);
  });
}
