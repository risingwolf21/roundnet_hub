'use client'

import { AlertTriangle, Table, X } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { z, type ZodTypeAny } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AppBar } from '@/components/ui/appbar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider'
import { useGrants } from '@/features/auth/GrantsContext'
import { supabase } from '@/lib/supabase'
import { formatDateFromDatabaseNotNull, formatDateToDatabase, groupBy } from '@/utils'
import { useQuery } from '@tanstack/react-query'
import { TableMetadata, useListTables, useTableMutations } from '../hooks/use-tables'
import { DynamicForm } from './dynamic-form'
import { ResultsTable } from './results-table'

// Helper to generate a Zod schema from the table's column definitions
function generateZodSchema(table: TableMetadata): z.ZodObject<any, any, any> {
  if (!table || !table.columns) {
    return z.object({})
  }

  const shape: Record<string, ZodTypeAny> = {}
  for (const column of table.columns) {
    // We can only edit updatable columns that are not generated

    let fieldSchema: ZodTypeAny
    const dataType = column.format.toLowerCase()

    if (dataType.includes('array')) {
      fieldSchema = z.array(z.any())
    } else if (dataType.includes('int') || dataType.includes('numeric')) {
      fieldSchema = z.number()
    } else if (dataType.includes('bool')) {
      fieldSchema = z.boolean()
    } else if (column.enums && column.enums.length > 0) {
      // Zod Enum benötigt ein Array mit mind. einem Element
      fieldSchema = z.enum(column.enums as [string, ...string[]]);
      if (column.is_nullable) fieldSchema = fieldSchema.nullable().optional();
    } else if (column.format === 'timestamptz' || column.format === 'timestamp') {
      // Wir nutzen z.date() für den Picker, erlauben aber auch Strings (vom API-Input)
      fieldSchema = z.preprocess((arg) => {
        if (typeof arg === "string") return formatDateFromDatabaseNotNull(arg);
        return arg;
      }, z.date());
      if (column.is_nullable) fieldSchema = fieldSchema.nullable().optional();
    } else {
      // Default to string for text, varchar, timestamp, uuid, etc.
      fieldSchema = z.string()
    }

    if (column.is_nullable) {
      fieldSchema = fieldSchema.nullish()
    }

    shape[column.name] = fieldSchema
  }
  return z.object(shape)
}

type EditRowViewProps = {
  table: TableMetadata
  row: any
  onSuccess: () => void
}

function EditRowView({ payload: {
  table,
  row,
  onSuccess,
}, open, onClose }: DialogProps<EditRowViewProps>) {
  const { updateRow } = useTableMutations(table);
  const formSchema = useMemo(() => generateZodSchema(table), [table]);

  const columnInfo = useMemo(() => {
    if (!table || !table.columns) return {}

    const info: Record<string, any> = {}
    for (const column of table.columns) {

      const dataType = column.format.toLowerCase()
      const displayType =
        dataType === 'user-defined' &&
          column.enums &&
          Array.isArray(column.enums) &&
          column.enums.length > 0
          ? 'enum'
          : dataType

      info[column.name] = {
        data_type: displayType,
        is_nullable: column.is_nullable,
      }
    }
    return info
  }, [table])

  const handleFormSubmit = useCallback(
    async (formData: any) => {
      // Wir übergeben einfach das formData Objekt. 
      // Der Hook kümmert sich um den .match() via Primary Keys

      const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
        acc[key] = value instanceof Date ? formatDateToDatabase(value) : value;
        return acc;
      }, {} as any);

      try {
        await updateRow.mutateAsync({ ...row, ...cleanedData });
        onSuccess();
        onClose();
      } catch (e) {
        // Fehler-Handling erfolgt im Hook via Toast
      }
    },
    [row, updateRow, onSuccess, onClose]
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent variant={"fullscreen"}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className={"flex-1"}>
            Editing row in {table.name}
          </DialogTitle>
          <DialogClose render={
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
              <X className="h-5 w-5" />
            </Button>
          } />
        </DialogHeader>
        <DialogBody>
          <DynamicForm
            schema={formSchema}
            initialValues={row}
            onSubmit={handleFormSubmit}
            columnInfo={columnInfo}
            isLoading={updateRow.isPending}
            relationships={table.relationships}
            primaryKeyNames={table.primary_keys.map(pk => pk.name)}
          />
        </DialogBody>
      </DialogContent>
    </Dialog >
  )
}

type TableRecordsViewProps = {
  table: TableMetadata
}

function TableRecordsView({ payload: { table }, open, onClose }: DialogProps<TableRecordsViewProps>) {
  const dialogs = useDialogs();

  const { data = [], isLoading } = useQuery({
    queryKey: ['table-data', table.schema, table.name], // Konsistenter Key
    queryFn: async () => {
      const { data, error } = await supabase
        // @ts-expect-error - supabase-js types sind nicht aktuell mit den neuesten Postgres-Features wie json_populate_record
        .schema(table.schema)
        // @ts-expect-error - supabase-js types sind nicht aktuell mit den neuesten Postgres-Features wie json_populate_record
        .from(table.name)
        .select('*')
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const handleRowClick = (row: any) => dialogs.open(EditRowView, { table, row, onSuccess: () => { } })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent variant={"fullscreen"} showCloseButton={false}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className={"flex-1"}>
            {`${table.schema}.${table.name}`}
          </DialogTitle>
          <DialogClose render={
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
              <X className="h-5 w-5" />
            </Button>
          } />
        </DialogHeader>
        <DialogBody className='p-0'>
          <ResultsTable data={data} table={table} onRowClick={(row) => handleRowClick(row)} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

const DatabaseManager = () => {
  const { user } = useGrants();
  const dialogs = useDialogs();
  const { data: tables = [], isLoading, isError } = useListTables()

  const handleTableClick = (table: TableMetadata) => {
    dialogs.open(TableRecordsView, { table })
  }

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={"Datenbank Manager"}
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <div className="p-4 pt-4 lg:p-8 lg:pt-8">

          {isError && (
            <Alert variant="destructive" className="mt-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error loading tables</AlertTitle>
              <AlertDescription>There was a problem loading your database tables.</AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {tables && tables.length > 0 ? (
            <div>
              {groupBy(tables, (x: TableMetadata) => x.schema).entries().map(([key, groupedTables]) => (
                <div key={key}>
                  <div className='text-base font-bold'>{key}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {
                      groupedTables.map(table => <Button
                        variant="outline"
                        key={table.name}
                        size="lg"
                        className="flex-row justify-between text-left"
                        onClick={() => handleTableClick(table)}
                      >
                        <Table className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-medium font-mono truncate flex-1">{table.name}</h2>
                        <div className="text-sm text-muted-foreground font-mono shrink-0">
                          {table.live_rows_estimate} rows
                        </div>
                      </Button>)
                    }
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoading && (!tables || tables.length === 0) ? (
            <Alert className="mt-8">
              <Table className="h-4 w-4" />
              <AlertTitle>No database tables</AlertTitle>
              <AlertDescription>Create tables to store and organize your data.</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default DatabaseManager;