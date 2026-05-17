import { RpcName, useAdminAnalytics, useAnalyticsTableOptions } from "@/tanstack/admin"

import { add, format } from "date-fns"
import { useState } from "react"

import { AppBar } from "@/components/ui/appbar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DataTable } from "@/components/ui/data-table"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { DialogProps, useDialogs } from "@/contexts/DialogsProvider"
import { ColumnDef } from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"
import { useGrants } from "../auth/GrantsContext"

// const ErrorDisplay = ({ error, onRetry }: { error: any, onRetry: () => void }) => (
//   <Stack
//     alignItems="center"
//     justifyContent="center"
//     sx={{
//       height: '100%',
//       width: '100%',
//       bgcolor: 'background.paper',
//       p: 3,
//       textAlign: 'center'
//     }}
//   >
//     <ErrorOutline color="error" sx={{ fontSize: 60, mb: 2, opacity: 0.8 }} />

//     <Typography variant="h6" gutterBottom color="error">
//       Daten konnten nicht geladen werden
//     </Typography>

//     <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff0f0', mb: 3, maxWidth: '600px', width: '100%' }}>
//       <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all', color: '#d32f2f' }}>
//         {error?.message || JSON.stringify(error)}
//       </Typography>
//       {error?.details && (
//         <Typography variant="caption" display="block" sx={{ mt: 1, color: '#d32f2f' }}>
//           Details: {error.details}
//         </Typography>
//       )}
//       {error?.hint && (
//         <Typography variant="caption" display="block" sx={{ mt: 1, color: '#d32f2f' }}>
//           Hint: {error.hint}
//         </Typography>
//       )}
//     </Paper>
//   </Stack>
// );

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
    title: "Inaktive Challenge Teilnehmer (Top Trainingsbesucher)",
    rpc: "admin_challenge_zero_points_candidates",
    description: "Zeigt User mit 0 Punkten in der Challenge, sortiert nach Trainingshäufigkeit.",
    inputs: [
      {
        id: "challenge",
        label: "Challenge auswählen",
        type: "challenge-select",
        rpcParamMapping: { value: "p_challenge_id" },
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
  },
  {
    title: "Trainingsanmeldungen pro Nutzer (Zeitraum)",
    rpc: "admin_analytics_attendance_ranking",
    description: "Wer war im gewählten Zeitraum am häufigsten beim Training?",
    inputs: [
      {
        id: "range",
        label: "Zeitraum",
        type: "date-range",
        rpcParamMapping: { from: "p_start", to: "p_end" },
        defaultValue: { from: add(new Date(), { months: -3 }), to: new Date() }
      }
    ]
  },
  {
    title: "Getränke Buchungen pro Nutzer (Zeitraum)",
    rpc: "admin_analytics_drinks_ranking",
    description: "Wer hat die meisten Getränke konsumiert?",
    inputs: [
      {
        id: "range",
        label: "Zeitraum",
        type: "date-range",
        rpcParamMapping: { from: "p_start", to: "p_end" },
        defaultValue: { from: add(new Date(), { months: -1 }), to: new Date() }
      }
    ]
  },
]

const AsyncSelect = ({
  id,
  table,
  label,
  value,
  onChange,
  labelField = 'name'
}: {
  id: string,
  table: string,
  label: string,
  value: any,
  onChange: (val: any) => void,
  labelField?: string
}) => {
  const { data = [], isLoading } = useAnalyticsTableOptions(table, labelField);

  return <Select
    id={id}
    value={value ?? undefined}
    onValueChange={(value) => onChange(value)}>
    <SelectTrigger className={"w-full max-w-72"}>
      <SelectValue placeholder={isLoading ? <Spinner /> : label} />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {
          data.map((x) => (
            <SelectItem
              className={"text-base"}
              key={x.id}
              value={x.id.toString()}>
              {x[labelField]}
            </SelectItem>
          ))
        }
      </SelectGroup>
    </SelectContent>
  </Select>

  // return <Dialog open={open} onOpenChange={setOpen}>
  //   <DialogTrigger render={<Button variant={"outline"}>
  //     {
  //       isLoading ? <Spinner /> : data?.find((x: any) => x.id === value) || label
  //     }
  //     <ChevronDown />
  //   </Button>} />
  //   <DialogContent variant={"drawer"}>
  //     <DialogHeader className={"px-4 py-2"}>
  //       <DialogTitle>Auswählen</DialogTitle>
  //     </DialogHeader>
  //     <div className="flex flex-col gap-2 p-4">
  //       {
  //         data?.map((x: any) => (
  //           <Item variant={"outline"} key={x[labelField]} onClick={() => {
  //             onChange(data?.find((x: any) => x.id === value) || null);
  //             setOpen(false);
  //           }}>
  //             <ItemContent>
  //               <ItemTitle>{x[labelField]}</ItemTitle>
  //             </ItemContent>
  //           </Item>
  //         ))
  //       }
  //     </div>
  //   </DialogContent>
  // </Dialog>

  // return (
  //   <Autocomplete
  //     options={data || []}
  //     loading={isLoading}
  //     getOptionLabel={(option: any) => option[labelField] || ''}
  //     value={data?.find((x: any) => x.id === value) || null}
  //     onChange={(_, newValue: any) => onChange(newValue?.id || null)}
  //     renderInput={(params) => <TextField {...params} label={label} size="small" />}
  //     isOptionEqualToValue={(option, val) => option.id === val.id}
  //     fullWidth
  //   />
  // );
};

const getDefaults = (report: AnalyticsReportDef) => {
  const defaults: Record<string, any> = {};
  report.inputs.forEach((input) => {
    // Wichtig: Falls kein defaultValue da ist, explizit null setzen, nicht undefined
    defaults[input.id] = input.defaultValue ?? null;
  });
  return defaults;
};

const AdminAnalytics = () => {
  const dialogs = useDialogs();
  const { user } = useGrants();
  const [selectedReport, setSelectedReport] = useState<AnalyticsReportDef>(REPORTS[0]);

  const [formValues, setFormValues] = useState<Record<string, any>>(() => getDefaults(REPORTS[0]));

  const [queryParams, setQueryParams] = useState<Record<string, any> | null>(null);

  const { data = [], isLoading, refetch, isError, error } = useAdminAnalytics(
    selectedReport.rpc,
    queryParams || {},
    !!queryParams
  );

  const handleSelectReport = async () => {
    const result = await dialogs.open(SelectRpcDialog, { reports: REPORTS });

    if (result) {
      setSelectedReport(result);
      setFormValues(getDefaults(result));
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

  return <div>
    <AppBar
      title="Admin Analysen"
      user={user}
    />
    <main className='flex-1 size-full pb-safe-bottom flex-col flex p-2 gap-2'>
      <div className="flex flex-row justify-center">
        <Item variant={"outline"} onClick={handleSelectReport}>
          <ItemContent>
            <ItemTitle>{selectedReport.title}</ItemTitle>
            <ItemDescription>{selectedReport.description}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ChevronDown />
          </ItemActions>
        </Item>
      </div>

      <Separator />

      <Item variant={"outline"}>
        <ItemContent className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 items-end w-full">
          {selectedReport.inputs.map((input) => {
            const val = formValues[input.id];

            if (input.type === 'date-range') {
              const currentVal = val || { from: null, to: null };
              return (
                <div key={input.id} className="grid grid-cols-2 gap-2">
                  <Field className=" w-44">
                    <FieldLabel htmlFor="date-from">Von</FieldLabel>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" id="date-from" className="justify-start font-normal">
                          {currentVal.from ? format(currentVal.from, "PPP") : <span>Pick a date</span>}
                        </Button>} />
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={currentVal.from}
                          onSelect={(d) => updateFormValue(input.id, { ...currentVal, from: d })}
                          defaultMonth={new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>

                  <Field className="w-44">
                    <FieldLabel htmlFor="date-to">Bis</FieldLabel>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" id="date-to" className="justify-start font-normal">
                          {currentVal.to ? format(currentVal.to, "PPP") : <span>Pick a date</span>}
                        </Button>} />
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={currentVal.to}
                          onSelect={(d) => updateFormValue(input.id, { ...currentVal, to: d })}
                          defaultMonth={new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>
                </div>
              );
            }

            if (input.type === 'challenge-select') {
              return (
                <Field key={input.id} className="w-full">
                  <FieldLabel htmlFor="challenge-select">{input.label}</FieldLabel>
                  <AsyncSelect
                    id="challenge-select"
                    table="challenge"
                    label={input.label}
                    value={val}
                    onChange={(newVal) => updateFormValue(input.id, newVal)}
                  />
                </Field>
              );
            }

            if (input.type === 'user-select') {
              return (
                <Field key={input.id} className="w-full">
                  <FieldLabel htmlFor="user-select">{input.label}</FieldLabel>
                  <AsyncSelect
                    id="user-select"
                    table="user"
                    label={input.label}
                    value={val}
                    labelField="displayName"
                    onChange={(newVal) => updateFormValue(input.id, newVal)}
                  />
                </Field>
              )
            }

            if (input.type === 'number') {
              return (
                <Field key={input.id} className="w-full">
                  <FieldLabel htmlFor={`number-${input.id}`}>{input.label}</FieldLabel>
                  <Input
                    id={`number-${input.id}`}
                    placeholder={input.label}
                    type="number"
                    value={val || ''}
                    onChange={(e) => updateFormValue(input.id, Number(e.target.value))}
                  />
                </Field>
              );
            }

            return null;
          })}

          <Button
            className="w-full sm:w-auto"
            onClick={handleRunQuery}
            disabled={isLoading || selectedReport.inputs.some((curr) => !formValues[curr.id])}
          >
            Abrufen
          </Button>
        </ItemContent>
      </Item>

      <DataTable
        columns={data && data.length > 0
          ? Object.keys(data[0]).map(field => ({ accessorKey: field, header: field } as ColumnDef<any>))
          : []
        }
        data={data}
        columnFilters={[]}
        sorting={[]}
        pagination={{ pageIndex: 0, pageSize: 1 }}
        onSortingChange={() => { }}
        onPaginationChange={() => { }}
        onColumnFiltersChange={() => { }}
        onRowClick={() => { }} />
    </main>
  </div >
}

const SelectRpcDialog = ({ payload, open, onClose }: DialogProps<{ reports: AnalyticsReportDef[] }, AnalyticsReportDef | null>) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"drawer"}>
        <DialogHeader className="px-4">
          <DialogTitle>Funktion auswählen</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-2">
            {
              payload.reports.map(x => (<Item key={x.rpc} variant={"outline"} onClick={() => onClose(x)}>
                <ItemContent>
                  <ItemTitle>{x.title}</ItemTitle>
                  <ItemDescription>{x.description}</ItemDescription>
                </ItemContent>
              </Item>))
            }
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );

};

export default AdminAnalytics;