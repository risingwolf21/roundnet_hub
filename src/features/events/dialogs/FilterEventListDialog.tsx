import { ListSubheader, List, Chip, Grid2 } from "@mui/material";
import { DialogProps } from "@toolpad/core";
import { t } from "i18next";
import React, { useState } from "react";
import { SwipeableDialog } from "src/components/SwipeableDialog";

type FilterEventListDialogProps = {
  currentFetchMode: "past" | "upcoming";
}

export const FilterEventListDialog = ({ payload: { currentFetchMode }, open, onClose }: DialogProps<FilterEventListDialogProps, "past" | "upcoming">) => {

  const [fetchMode, setFetchMode] = useState<"past" | "upcoming">(currentFetchMode)

  return <SwipeableDialog
    open={open}
    onClose={() => onClose(fetchMode)}
    title={t('filter')}>
    <List
      sx={{ mx: 2 }}
      subheader={
        <ListSubheader
          sx={{
            fontWeight: 'bold',
            lineHeight: 'normal',
            color: 'black',
            mb: 2,
            pl: 0,
          }}
        >
          Events
        </ListSubheader>
      }
    >
      <Grid2 container spacing={2}>
        <Grid2>
          <Chip
            variant={fetchMode === 'upcoming' ? 'filled' : 'outlined'}
            label={t('events.upcoming')}
            color={fetchMode === 'upcoming' ? 'primary' : 'default'}
            onClick={() => setFetchMode('upcoming')}
          />
        </Grid2>
        <Grid2>
          <Chip
            variant={fetchMode === 'past' ? 'filled' : 'outlined'}
            label={t('events.past')}
            color={fetchMode === 'past' ? 'primary' : 'default'}
            onClick={() => setFetchMode('past')}
          />
        </Grid2>
      </Grid2>
    </List>
  </SwipeableDialog>
}
