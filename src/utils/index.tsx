import { format, intervalToDuration, parse } from 'date-fns';
import RoundnetKarlsruheLogo from '../images/Karlsruher_Kojoten_Logo.svg';
import RoundnetMunichLogo from '../images/Roundnet_Munich_Logo.png';

const logoMap = {
  'roundnet-karlsruhe': RoundnetKarlsruheLogo,
  'munich-roundnet': RoundnetMunichLogo,
};

const iconMap = {
  'roundnet-karlsruhe': '🐺',
  'munich-roundnet': '🏐',
};

const logo = logoMap[(import.meta.env.VITE_WEBSITE_PATH as keyof typeof logoMap) || 'roundnet-karlsruhe'];
const icon = iconMap[(import.meta.env.VITE_WEBSITE_PATH as keyof typeof iconMap) || 'roundnet-karlsruhe'];

export const BRANDING = {
  logo: <img src={logo} alt="MUI logo" style={{ height: 96, objectFit: 'contain' }} />,
  title: import.meta.env.VITE_WEBSITE_NAME,
  icon: icon,
};

export const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

export function groupBy<Type>(items: Type[], getter: (any: Type) => string): Map<string, Type[]> {
  const result = new Map<string, Type[]>();
  (items ?? []).forEach((item: Type) => {
    const key = getter(item);
    const entry = result.get(key);
    if (!entry) {
      return result.set(key, [item]);
    } else {
      result.set(key, [...entry, item]);
    }
    return null;
  });
  return result;
}

export const formatSafeDateToDatabase = (date: string | number | Date | null) => {
  if (!date) return null;
  return formatDateToDatabase(date);
};

export const formatDateToDatabase = (date: string | number | Date) => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
};

export const formatSafeDateFromDatabase = (date: string | null) => {
  if (date === null) return null;
  return formatDateFromDatabase(date);
};

export const formatDateFromDatabase = (date: string | null) => {
  if (date === null) return null;
  const result = parse(date, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
  if (isNaN(result.getTime())) {
    return parse(date, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date());
  }
  return result;
};

export const getDurationFrom = (start: string | null, end: string | null) => {
  const startDate = formatDateFromDatabase(start);
  const endDate = formatDateFromDatabase(end);
  if (startDate === null || endDate === null) {
    return null;
  }

  return getDuration(startDate, endDate);
};

export const getDuration = (start: Date, end: Date) => {
  return intervalToDuration({ start, end });
};

export const translationKeyOfItemType = (type: ItemType | null) => {
  switch (type) {
    case 'goethe':
      return 'itemType.goethe';
    case 'mtvGym':
      return 'itemType.mtvGym';
    case 'mtvGymPalazzo':
      return 'itemType.mtvGymPalazzo';
    case 'mtvStorage':
      return 'itemType.mtvStorage';
    default:
      return 'Not found';
  }
};

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

export const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mime = ((arr[0] ?? '').match(/:(.*?);/) ?? [])[1] ?? null;
  const bstr = atob(arr[arr.length - 1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
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

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}
