import Layout from "@/components/layout/Layout"
import { supabase } from "@/lib/supabase"
import { useAdminAnalytics } from "@/tanstack/admin"
import Close from "@mui/icons-material/Close"
import ErrorOutline from '@mui/icons-material/ErrorOutline'
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined"
import PlayArrow from "@mui/icons-material/PlayArrow"
import Autocomplete from "@mui/material/Autocomplete"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import TextField from "@mui/material/TextField"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import Stack from "@mui/system/Stack"
import { DataGrid } from "@mui/x-data-grid/DataGrid"
import { GridColDef } from "@mui/x-data-grid/models"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { useQuery } from "@tanstack/react-query"
import { DialogProps, useDialogs } from "@toolpad/core"
import { add, format } from "date-fns"
import { useState } from "react"
import { NoRowsOverlay } from "../supabase/SupabaseClient"

import { Paper } from '@mui/material'

const ErrorDisplay = ({ error, onRetry }: { error: any, onRetry: () => void }) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    sx={{
      height: '100%',
      width: '100%',
      bgcolor: 'background.paper',
      p: 3,
      textAlign: 'center'
    }}
  >
    <ErrorOutline color="error" sx={{ fontSize: 60, mb: 2, opacity: 0.8 }} />

    <Typography variant="h6" gutterBottom color="error">
      Daten konnten nicht geladen werden
    </Typography>

    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff0f0', mb: 3, maxWidth: '600px', width: '100%' }}>
      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all', color: '#d32f2f' }}>
        {error?.message || JSON.stringify(error)}
      </Typography>
      {error?.details && (
        <Typography variant="caption" display="block" sx={{ mt: 1, color: '#d32f2f' }}>
          Details: {error.details}
        </Typography>
      )}
      {error?.hint && (
        <Typography variant="caption" display="block" sx={{ mt: 1, color: '#d32f2f' }}>
          Hint: {error.hint}
        </Typography>
      )}
    </Paper>
  </Stack>
);

export type InputType =
  | 'date-range'      // Rendert Von/Bis Picker
  | 'user-select'     // Dropdown für User
  | 'challenge-select'// Dropdown für Challenges
  | 'number'          // Einfaches Zahlenfeld
  | 'boolean';        // Checkbox

export interface AnalyticsInputConfig {
  id: string;             // Interner Key für den State (z.B. 'challengeId')
  label: string;          // Label für die UI
  type: InputType;
  rpcParamMapping?: {     // Mapping auf die SQL-Parameter Namen
    [key: string]: string;
    // z.B. bei DateRange: { from: 'p_from', to: 'p_to' }
    // bei Single Value: { value: 'p_challenge_id' }
  };
  defaultValue?: any;
}

export interface AnalyticsReportDef {
  title: string;
  rpc: RpcName; // Der Name der SQL Funktion in Supabase
  description?: string;
  inputs: AnalyticsInputConfig[];
}

const REPORTS: AnalyticsReportDef[] = [
  {
    title: "Anmeldungen pro Nutzer (Zeitraum)",
    rpc: "admin_attendance_leaderboard",
    inputs: [
      {
        id: "range",
        label: "Zeitraum",
        type: "date-range",
        rpcParamMapping: { from: "p_from", to: "p_to" },
        defaultValue: { from: add(new Date(), { years: -1 }), to: new Date() }
      }
    ]
  },
  {
    title: "Inaktive Challenge Teilnehmer (Top Trainingsbesucher)",
    rpc: "admin_challenge_zero_points_candidates",
    description: "Zeigt User mit 0 Punkten in der Challenge, sortiert nach Trainingshäufigkeit.",
    inputs: [
      {
        id: "challenge",
        label: "Challenge auswählen",
        type: "challenge-select",
        rpcParamMapping: { value: "p_challenge_id" },
        defaultValue: {
          p_challenge_id: ''
        }
      },
      {
        id: "range",
        label: "Trainings-Zeitraum",
        type: "date-range",
        rpcParamMapping: { from: "p_start", to: "p_end" },
        defaultValue: {
          from: add(new Date(), { years: -1 }),
          to: new Date()
        }
      }
    ]
  }
]

const AsyncSelect = ({
  table,
  label,
  value,
  onChange,
  labelField = 'name'
}: {
  table: string,
  label: string,
  value: any,
  onChange: (val: any) => void,
  labelField?: string
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['table_select', table],
    queryFn: async () => {
      const { data } = await supabase.from(table as any).select(`id, ${labelField}`).limit(100);
      return data || [];
    }
  });

  return (
    <Autocomplete
      options={data || []}
      loading={isLoading}
      getOptionLabel={(option: any) => option[labelField] || ''}
      value={data?.find((x: any) => x.id === value) || null}
      onChange={(_, newValue: any) => onChange(newValue?.id || null)}
      renderInput={(params) => <TextField {...params} label={label} size="small" />}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      fullWidth
    />
  );
};

const getDefaults = (report: AnalyticsReportDef) => {
  const defaults: Record<string, any> = {};
  report.inputs.forEach((input) => {
    // Wichtig: Falls kein defaultValue da ist, explizit null setzen, nicht undefined
    defaults[input.id] = input.defaultValue ?? null;
  });
  return defaults;
};

export const AdminAnalytics = () => {
  const dialogs = useDialogs();

  const [selectedReport, setSelectedReport] = useState<AnalyticsReportDef>(REPORTS[0]);

  const [formValues, setFormValues] = useState<Record<string, any>>(() => getDefaults(REPORTS[0]));

  const [queryParams, setQueryParams] = useState<Record<string, any> | null>(null);

  const { data, isLoading, refetch, isError, error } = useAdminAnalytics(
    selectedReport.rpc,
    queryParams || {},
    !!queryParams
  );

  const handleSelectReport = async () => {
    const result = await dialogs.open(SelectRpcDialog, { reports: REPORTS });

    if (result) {
      // Hier passiert die Magie: Alles in einem Rutsch aktualisieren
      setSelectedReport(result);
      setFormValues(getDefaults(result)); // <-- Direkt hier berechnen
      setQueryParams(null);
    }
  };

  const handleRunQuery = () => {
    // Wir müssen die FormValues (UI State) in RPC Parameter (DB Namen) übersetzen
    const mappedParams: Record<string, any> = {};

    selectedReport.inputs.forEach(input => {
      const value = formValues[input.id];

      if (!value || !input.rpcParamMapping) return; // Skip empty/null

      if (input.type === 'date-range') {
        // Date Range splittet sich in zwei Params auf
        if (value.from) mappedParams[input.rpcParamMapping.from] = format(value.from, 'yyyy-MM-dd');
        if (value.to) mappedParams[input.rpcParamMapping.to] = format(value.to, 'yyyy-MM-dd');
      } else {
        // Single Values (Selects, Numbers)
        mappedParams[input.rpcParamMapping.value] = value;
      }
    });

    setQueryParams(mappedParams);
    // Falls Query Params gleich bleiben, erzwingen wir ein Refetch
    setTimeout(() => refetch(), 0);
  };

  const updateFormValue = (id: string, val: any) => {
    setFormValues(prev => ({ ...prev, [id]: val }));
  };

  return <Layout>
    <Box sx={{ pb: 2 }}>
      <ListItemButton
        onClick={handleSelectReport}
      >
        <ListItemText
          primary={selectedReport.title}
          slotProps={{ primary: { fontWeight: 'bold' } }}
        />
        <ExpandMoreOutlined />
      </ListItemButton>

      {/* Dynamic Inputs Rendering */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>

        {selectedReport.inputs.map((input) => {
          const val = formValues[input.id];

          if (input.type === 'date-range') {
            const currentVal = val || { from: null, to: null };
            return (
              <Stack key={input.id} direction="row" spacing={1} sx={{ px: 1 }}>
                <DatePicker
                  label="Von"
                  value={currentVal.from}
                  onChange={(v) => updateFormValue(input.id, { ...currentVal, from: v })}
                  format="dd.MM.yyyy"
                  slotProps={{ textField: { size: 'small' } }}
                />
                <DatePicker
                  label="Bis"
                  value={currentVal.to}
                  onChange={(v) => updateFormValue(input.id, { ...currentVal, to: v })}
                  format="dd.MM.yyyy"
                  slotProps={{ textField: { size: 'small' } }}
                />
              </Stack>
            );
          }

          if (input.type === 'challenge-select') {
            return (
              <Box key={input.id} sx={{ minWidth: 200, px: 1 }}>
                <AsyncSelect
                  table="challenge"
                  label={input.label}
                  value={val}
                  onChange={(newVal) => updateFormValue(input.id, newVal)}
                />
              </Box>
            );
          }

          if (input.type === 'user-select') {
            return (
              <Box key={input.id} sx={{ minWidth: 200, px: 1 }}>
                <AsyncSelect
                  table="user" // oder 'profiles' je nach Schema
                  label={input.label}
                  value={val}
                  labelField="displayName"
                  onChange={(newVal) => updateFormValue(input.id, newVal)}
                />
              </Box>
            );
          }

          if (input.type === 'number') {
            return (
              <TextField
                key={input.id}
                label={input.label}
                type="number"
                size="small"
                value={val || ''}
                onChange={(e) => updateFormValue(input.id, Number(e.target.value))}
              />
            );
          }

          return null;
        })}

        <Box sx={{ justifyContent: "center", width: "100%", display: "flex" }}>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handleRunQuery}
            disabled={isLoading}
            size="small"
          >
            Abrufen
          </Button>
        </Box>

      </Stack>
    </Box>

    <Box sx={{ minHeight: "400px", width: '100%' }}>
      {isError ? (
        <ErrorDisplay error={error} onRetry={refetch} />
      ) : (<DataGrid
        rows={isError ? [] : (data ?? [])}
        columns={data && data.length > 0
          ? Object.keys(data[0]).map(field => ({ field, headerName: field, flex: 1, minWidth: 150 } as GridColDef))
          : []
        }
        loading={isLoading}
        slots={{
          noRowsOverlay: NoRowsOverlay
        }}
        getRowId={(row) => row.id || Object.values(row).join("_")} // Fallback ID
        disableRowSelectionOnClick
      />
      )}
    </Box>
  </Layout>
}

const SelectRpcDialog = ({ payload, open, onClose }: DialogProps<{ reports: AnalyticsReportDef[] }, AnalyticsReportDef | null>) => {
  return (
    <Dialog
      open={open}
      onClose={() => onClose(null)}
      scroll={'paper'}
      sx={{
        '.MuiDialog-container > .MuiPaper-root': {
          margin: 0,
          maxHeight: '75vh',
          minHeight: `40vh`,
          width: '100%',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
        },
        '.MuiDialog-container': {
          position: 'absolute',
          m: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          alignItems: 'end',
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="close drawer"
            onClick={() => onClose(null)}
            edge="start"
            sx={{ mr: 2 }}
          >
            <Close />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Funktion auswählen
          </Typography>
        </Toolbar>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <List>
          {
            payload.reports.map((x) => <ListItemButton
              divider
              key={x.rpc}
              onClick={() => {
                onClose(x);
              }}
            >
              <ListItemText primary={x.title} />
            </ListItemButton>)
          }
        </List>
      </DialogContent>
    </Dialog>
  );
};