import { dataURLtoFile, formatDateFromDatabase, readFile } from '@/utils';
import { DatePicker, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { DialogProps } from '@toolpad/core';
import Compressor from 'compressorjs';
import { differenceInDays, isAfter, isBefore, isSameDay, isSameWeek } from 'date-fns';
import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { SwipeableDialog } from '../../../components/SwipeableDialog';

import Add from '@mui/icons-material/Add';
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import Remove from '@mui/icons-material/Remove';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

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

function ServerDay(props: PickersDayProps & { highlightedDays?: Date[]; maxEntriesPerWeek?: number }) {
  const { highlightedDays = [], maxEntriesPerWeek = 0, day, outsideCurrentMonth, ...other } = props;

  const isHighlighted = highlightedDays.filter((x) => isSameDay(x, day)).length > 0;
  const isDisabled =
    differenceInDays(day, new Date()) > 1 ||
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
  count: number;
  image: {
    dataUrl: string;
    fileName: string;
  } | null;
  comment?: string;
  category?: string;
  category_options?: string[];
};

const EnterPointDialog = ({
  payload: { dates, maxEntriesPerWeek, maxEntriesPerDay, comments_enabled = false, category_enabled = false, category_options = [], start_date = null, end_date = null },
  open,
  onClose,
}: DialogProps<EnterPointDialogProps, EnterPointResult | null>) => {
  const [date, setDate] = useState<Date>(() => new Date());
  const highlightedDays = dates.map((x) => formatDateFromDatabase(x));
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
    <SwipeableDialog
      title="Punkt hinzufügen"
      open={open}
      onClose={() => onClose(null)}
      minHeight={40}
      actions={
        <>
          <Button disabled={(start_date !== null && isAfter(new Date(start_date), date)) && (end_date !== null && isBefore(new Date(end_date), date))} onClick={() => onClose({ date, image, count: points, comment, category })}>Bestätigen</Button>
          <Button onClick={() => onClose(null)}>Abbrechen</Button>
        </>
      }
    >
      <ListItem
        secondaryAction={
          (maxEntriesPerDay ?? 0) > 1 && (
            <Box sx={{ mx: 2, width: '100%', display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                <IconButton
                  disableRipple
                  disabled={points <= 1}
                  onClick={(event) => {
                    setPoints(points - 1);
                    event.stopPropagation();
                  }}
                >
                  <Remove fontSize="inherit" sx={{ fontSize: '28px' }} />
                </IconButton>
                <Typography sx={{ p: 1, fontSize: '20px', color: 'rgba(0,0,0,0.54)' }}>{points}</Typography>
                <IconButton
                  disableRipple
                  disabled={maxEntriesPerDay !== null && points >= maxEntriesPerDay}
                  onClick={(event) => {
                    setPoints(points + 1);
                    event.stopPropagation();
                  }}
                >
                  <Add fontSize="inherit" sx={{ fontSize: '28px' }} />
                </IconButton>
              </Box>
            </Box>
          )
        }
      >
        {(maxEntriesPerDay ?? 0) > 1 ? (
          <ListItemText primary="Anzahl Punkte" secondary="Wie viele Punkte möchtest du eintragen?" />
        ) : (
          <ListItemText primary="Hiermit trägst du einen Punkt für diese Challenge ein" />
        )}
      </ListItem>

      {comments_enabled && (
        <ListItem>
          <TextField
            fullWidth
            variant="outlined"
            label="Kommentar"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </ListItem>
      )}

      {category_enabled && category_options.length > 0 && (
        <ListItem>
          <TextField
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
            }}
            select
            fullWidth
            label="Kategorie"
            sx={{ mt: 2, mb: 1 }}
          >
            {category_options
              .map((x) => (
                <MenuItem key={x} value={x}>
                  {x}
                </MenuItem>
              ))}
          </TextField>
        </ListItem>
      )}

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
          } as unknown as PickersDayProps,
        }}
        label="Datum"
        disableFuture
        format="dd MMMM yyyy"
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
