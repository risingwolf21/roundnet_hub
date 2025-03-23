import { Button, Typography } from '@mui/material';
import { DatePicker, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { TFunction } from 'i18next';
import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { dayjsFromDb } from 'src/utils';
import { SwipeableDialog } from '../../../components/SwipeableDialog';

type EnterPointDialogProps = {
  open: boolean;
  t: TFunction;
  setOpen: (value: boolean) => void;
  increaseChallengePoint: (created_at: Dayjs) => void;
  dates: string[]
  maxEntriesPerWeek: number
};

function ServerDay(props: PickersDayProps<Dayjs> & { highlightedDays?: Dayjs[], maxEntriesPerWeek?: number }) {
  const { highlightedDays = [], maxEntriesPerWeek = 0, day, outsideCurrentMonth, ...other } = props;

  const isHighlighted = highlightedDays.filter(x => day.isSame(x, "day")).length > 0;
  const isDisabled = day.isAfter(dayjs(), "day") || isHighlighted || highlightedDays.filter(x => day.isSame(x, "week")).length > maxEntriesPerWeek;

  return (
    <PickersDay  {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} sx={(theme) => ({
      ...(isHighlighted && { backgroundColor: theme.palette.primary.main }),
      ...(isHighlighted && { color: theme.palette.primary.contrastText })
    })} disabled={isDisabled} />
  );
}

const EnterPointDialog = ({ open, setOpen, t, increaseChallengePoint, dates, maxEntriesPerWeek }: EnterPointDialogProps) => {

  const [date, setDate] = useState(dayjs());
  const [highlightedDays, setHightlightedDays] = useState(dates.map(x => dayjsFromDb(x)))

  useEffect(() => {
    setHightlightedDays(dates.map(dayjsFromDb))
  }, [dates]);

  return (
    <SwipeableDialog
      title="Punkt hinzufügen"
      open={open}
      onClose={() => setOpen(false)}
      minHeight={40}
      setOpen={setOpen}
      actions={<>
        <Button onClick={() => increaseChallengePoint(date)}>Bestätigen</Button>
        <Button onClick={() => setOpen(false)}>Abbrechen</Button>
      </>}
    >
      <Typography m={2}>Hiermit trägst du einen Punkt für die Serve Challenge ein</Typography>
      <DatePicker
        sx={{
          width: '100%',
          p: 2
        }}
        slots={{
          day: ServerDay,
        }}
        slotProps={{
          day: {
            highlightedDays,
            maxEntriesPerWeek
          } as any
        }}
        label="Datum"
        disableFuture
        format="DD MMMM YYYY"
        onChange={(val) => {
          if (val)
            setDate(val)
        }}
        value={date}
      />
    </SwipeableDialog >
  );
};

export default withTranslation()(EnterPointDialog);
