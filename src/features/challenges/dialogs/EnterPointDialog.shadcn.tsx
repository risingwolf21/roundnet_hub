
import { dataURLtoFile, formatDateFromDatabase, readFile } from '@/utils';
import { DialogProps } from '@toolpad/core';
import Compressor from 'compressorjs';
import { format, isAfter, isBefore, isSameDay, isSameWeek } from 'date-fns';
import React, { useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Dialog, DialogFooter, DialogHeader, DialogTitle, SlideUpDialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import AlertTitle from '@mui/material/AlertTitle';
import { BadgeCheck, Minus, Plus, Trash, TriangleAlert, UploadCloud } from 'lucide-react';
import { CalendarDay, Modifiers } from 'react-day-picker';

const DayButton = ({ children, modifiers, day, ...props }: {
  day: CalendarDay;
  modifiers: Modifiers;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <CalendarDayButton day={day} modifiers={modifiers} {...props}
      className={cn('', {
        'bg-success !opacity-100': modifiers.booked
      })}>
      {modifiers.booked ? (
        <BadgeCheck className="!h-6 !w-6 text-white" />
      ) : (
        children
      )}
    </CalendarDayButton>
  )
}

type EnterPointDialogProps = {
  dates: string[];
  maxEntriesPerWeek: number | null;
  maxEntriesPerDay: number | null;
  comments_enabled?: boolean;
  category_enabled?: boolean;
  category_options?: string[];
  start_date?: string | null;
  end_date?: string | null;
};

type EnterPointResult = {
  date: Date;
  count: number;
  image: {
    dataUrl: string;
    fileName: string;
  } | null;
  comment?: string;
  category?: string;
  category_options?: string[];
};

const EnterPointDialogShadcn = ({
  payload: { dates, maxEntriesPerWeek, maxEntriesPerDay, comments_enabled = false, category_enabled = false, category_options = [], start_date = null, end_date = null },
  open,
  onClose,
}: DialogProps<EnterPointDialogProps, EnterPointResult | null>) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [date, setDate] = useState<Date>();
  const highlightedDays = dates.map((x) => formatDateFromDatabase(x)).filter(x => x !== null)
  const [image, setImage] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(1);
  const [comment, setComment] = useState<string>();
  const [category, setCategory] = useState<string>();


  const onImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files || event.target.files.length === 0) return;

    const imageDataUrl = await readFile(event.target.files[0]);

    if (typeof imageDataUrl !== 'string') {
      setError('Something went wrong uploading your image. Please try again.');
      return;
    }

    const fileName = uuid() + '.jpg';
    new Compressor(dataURLtoFile(imageDataUrl, fileName), {
      convertSize: 1000000, // 1 MB
      success: async (file) => {
        const compressedFile = await readFile(file);
        if (compressedFile && typeof compressedFile === 'string') {
          setImage({ dataUrl: compressedFile, fileName });
        } else {
          setError('Something went wrong compressing your image. Please try again.');
        }
      },
    });
    event.target.files = null;
    event.target.value = '';
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose(null);
      }}
    >
      <SlideUpDialogContent className="flex flex-col max-h-[95dvh] gap-0">
        <DialogHeader className="p-4 pb-2 border-b text-left">
          <DialogTitle>Punkt hinzufügen</DialogTitle>
        </DialogHeader>

        <div className='flex flex-col overflow-y-auto p-4 gap-6'>

          <div className="flex">
            {(maxEntriesPerDay ?? 0) > 1 ? (
              <div className='flex flex-row w-full justify-between items-center'>
                <div>
                  <div className='text-base font-medium'>Anzahl Punkte</div>
                  <div className='text-sm text-muted-foreground'>Wie viele Punkte möchtest du eintragen?</div>
                </div>
                <div className='flex flex-row items-center gap-2'>
                  <Button variant={"outline"} size="icon"
                    disabled={points <= 1}
                    onClick={(event) => {
                      setPoints(points - 1);
                      event.stopPropagation();
                    }}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-semibold w-8 text-center">{points}</span>
                  <Button
                    variant={"outline"} size="icon"
                    disabled={maxEntriesPerDay !== null && points >= maxEntriesPerDay}
                    onClick={(event) => {
                      setPoints(points + 1);
                      event.stopPropagation();
                    }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className='text-base'>Hiermit trägst du einen Punkt für diese Challenge ein</div>
            )}
          </div>

          {comments_enabled && (
            <Field>
              <Input
                className='text-base'
                placeholder="Kommentar"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Field>
          )}

          {category_enabled && category_options.length > 0 && (
            <Field>
              <Select modal={true} onValueChange={(val) => val && setCategory(val as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie" className="text-base" />
                </SelectTrigger>
                <SelectContent className="p-0 pointer-events-auto z-[100]">
                  <SelectGroup>
                    {category_options.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field>
            <Popover modal={true}>
              <PopoverTrigger
                render={
                  <Button variant="outline" id="date-picker-simple" className="w-full justify-start font-normal text-base">
                    {date ? format(date, "PPP") : <span>Datum wählen</span>}
                  </Button>
                }
              />
              <PopoverContent align="start"
                className="w-auto p-0 pointer-events-auto z-[100]">
                <Calendar
                  required
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  defaultMonth={date}
                  disabled={(day) => isAfter(day, new Date()) || highlightedDays.some((x) => isSameDay(x, day))
                    || highlightedDays.filter((x) => isSameWeek(x, day, { weekStartsOn: 1 })).length > (maxEntriesPerWeek ?? 0)}
                  weekStartsOn={1}
                  className="[--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                  modifiers={{
                    booked: highlightedDays
                  }}
                  components={{
                    DayButton: DayButton
                  }}
                />
              </PopoverContent>
            </Popover>
          </Field>

          <div className='flex justify-center'>
            {image ? (
              <div className='flex gap-2'>
                <Button variant="outline" className="relative">
                  <input accept="image/*" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onImageInputChange} />
                  Change
                </Button>
                <Button variant="destructive" onClick={() => setImage(null)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className='w-full'>
                <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={onImageInputChange} />
                <Button type='button' variant='outline' onClick={() => inputRef.current?.click()} className='w-full flex items-center justify-center gap-2'>
                  <UploadCloud className="h-5 w-5" />
                  Bild hochladen
                </Button>
              </div>
            )}
          </div>

          {image && (
            <div className='flex justify-center mt-2'>
              <img src={image.dataUrl} alt="Selected" className='rounded-lg max-h-[200px] max-w-full object-contain border shadow-sm' />
            </div>
          )}

          {error && <Alert variant={"error"}>
            <TriangleAlert />
            <AlertTitle>Es ist ein Fehler aufgetreten</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>}

        </div>

        <DialogFooter className="p-4 border-t shrink-0 m-0">
          <Button
            className="w-full text-base"
            disabled={
              !date ||
              (start_date !== null && isBefore(new Date(start_date), date)) ||
              (end_date !== null && isAfter(new Date(end_date), date))
            }
            onClick={() => date && onClose({ date, image, count: points, comment, category })}
          >
            Bestätigen
          </Button>
        </DialogFooter>
      </SlideUpDialogContent >
    </Dialog >
  );
};

export default EnterPointDialogShadcn;
