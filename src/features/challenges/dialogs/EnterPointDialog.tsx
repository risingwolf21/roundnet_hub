import { AddPhotoAlternateOutlined, DeleteOutline, EditOutlined } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { DatePicker, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { uuid } from '@supabase/supabase-js/dist/main/lib/helpers';
import Compressor from 'compressorjs';
import React, { useEffect, useState } from 'react';
import { dataURLtoFile, formatDateFromDatabase, readFile } from '@/utils';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { DialogProps } from '@toolpad/core';
import { differenceInDays, isSameDay, isSameWeek } from 'date-fns';

type EnterPointDialogProps = {
  dates: string[];
  maxEntriesPerWeek: number | null;
};

function ServerDay(props: PickersDayProps<Date> & { highlightedDays?: Date[]; maxEntriesPerWeek?: number }) {
  const { highlightedDays = [], maxEntriesPerWeek = 0, day, outsideCurrentMonth, ...other } = props;

  const isHighlighted = highlightedDays.filter((x) => isSameDay(x, day)).length > 0;
  const isDisabled =
    differenceInDays(day, Date.now()) > 1 ||
    isHighlighted ||
    highlightedDays.filter((x) => isSameWeek(x, day)).length > maxEntriesPerWeek;

  return (
    <PickersDay
      {...other}
      outsideCurrentMonth={outsideCurrentMonth}
      day={day}
      sx={(theme) => ({
        ...(isHighlighted && { backgroundColor: theme.palette.primary.main }),
        ...(isHighlighted && { color: theme.palette.primary.contrastText }),
      })}
      disabled={isDisabled}
    />
  );
}

type EnterPointResult = {
  date: Date;
  image: {
    dataUrl: string;
    fileName: string;
  } | null;
};

const EnterPointDialog = ({
  payload: { dates, maxEntriesPerWeek },
  open,
  onClose,
}: DialogProps<EnterPointDialogProps, EnterPointResult | null>) => {
  const [date, setDate] = useState<Date>(new Date());
  const [highlightedDays, setHightlightedDays] = useState(dates.map((x) => formatDateFromDatabase(x)));
  const [image, setImage] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHightlightedDays(dates.map(formatDateFromDatabase));
  }, [dates]);

  const onImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files || event.target.files.length === 0) return;

    let imageDataUrl = await readFile(event.target.files[0]);

    if (typeof imageDataUrl !== 'string') {
      setError('Something went wrong uploading your image. Please try again.');
      return;
    }

    let fileName = uuid() + '.jpg';
    new Compressor(dataURLtoFile(imageDataUrl, fileName), {
      convertSize: 1000000, // 1 MB
      success: async (file) => {
        let compressedFile = await readFile(file);
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
    <SwipeableDialog
      title="Punkt hinzufügen"
      open={open}
      onClose={() => onClose(null)}
      minHeight={40}
      actions={
        <>
          <Button onClick={() => onClose({ date, image })}>Bestätigen</Button>
          <Button onClick={() => onClose(null)}>Abbrechen</Button>
        </>
      }
    >
      <Typography m={2}>Hiermit trägst du einen Punkt für die Serve Challenge ein</Typography>
      <DatePicker
        sx={{
          width: '100%',
          p: 2,
        }}
        slots={{
          day: ServerDay,
        }}
        slotProps={{
          day: {
            highlightedDays,
            maxEntriesPerWeek,
          } as any,
        }}
        label="Datum"
        disableFuture
        format="DD MMMM YYYY"
        onChange={(val) => {
          if (val) setDate(val);
        }}
        value={date}
      />

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        {image ? (
          <>
            <Button
              component="label"
              sx={{ border: 'none', background: 'transparent', mr: 2 }}
              startIcon={<EditOutlined />}
            >
              <input accept="image/*" type="file" hidden onChange={onImageInputChange} />
              Change
            </Button>
            <Button startIcon={<DeleteOutline />} onClick={() => setImage(null)}>
              Remove
            </Button>
          </>
        ) : (
          <Button
            component="label"
            sx={{ border: 'none', background: 'transparent' }}
            startIcon={<AddPhotoAlternateOutlined />}
          >
            <input accept="image/*" type="file" hidden onChange={onImageInputChange} />
            Add picture
          </Button>
        )}
      </Box>
      {image && (
        <Box sx={{ m: 2, borderRadius: 2 }}>
          <img src={image.dataUrl} width="100%" alt="Selected" style={{ borderRadius: '16px' }} />
        </Box>
      )}
      {error && <Typography color="error">{error}</Typography>}
    </SwipeableDialog>
  );
};

export default EnterPointDialog;
