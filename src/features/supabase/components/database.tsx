'use client'

import { AlertTriangle, Table } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { z, type ZodTypeAny } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AppBar } from '@/components/ui/appbar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider'
import { useGrants } from '@/features/auth/GrantsContext'
import { groupBy, SUPABASE_PROJECT_REF } from '@/utils'
import { useRunQuery } from '../hooks/use-run-query'
import { useListTables } from '../hooks/use-tables'
import { DynamicForm } from './dynamic-form'
import { SqlEditor } from './sql-editor'

// Helper to generate a Zod schema from the table's column definitions
function generateZodSchema(table: any): z.ZodObject<any, any, any> {
  if (!table || !table.columns) {
    return z.object({})
  }

  const shape: Record<string, ZodTypeAny> = {}
  for (const column of table.columns) {
    // We can only edit updatable columns that are not generated
    if (!column.is_updatable || column.is_generated) continue

    let fieldSchema: ZodTypeAny
    const dataType = column.data_type.toLowerCase()

    if (dataType.includes('array')) {
      fieldSchema = z.array(z.any())
    } else if (dataType.includes('int') || dataType.includes('numeric')) {
      fieldSchema = z.number()
    } else if (dataType.includes('bool')) {
      fieldSchema = z.boolean()
    } else if (
      dataType === 'user-defined' &&
      column.enums &&
      Array.isArray(column.enums) &&
      column.enums.length > 0
    ) {
      // Handle enum types
      fieldSchema = z.enum(column.enums as [string, ...string[]])
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

const getPrimaryKeys = (table: any): string[] => {
  if (!table || !table.primary_keys) {
    return []
  }
  return table.primary_keys.map((pk: any) => pk.name)
}

type EditRowViewProps = {
  table: any
  row: any
  onSuccess: () => void
}

function EditRowView({ payload: {
  table,
  row,
  onSuccess,
}, open, onClose }: DialogProps<EditRowViewProps>) {
  const { mutate: runUpdateQuery, isPending: isUpdatePending } = useRunQuery()
  const formSchema = useMemo(() => generateZodSchema(table), [table])

  const columnInfo = useMemo(() => {
    if (!table || !table.columns) return {}

    const info: Record<string, any> = {}
    for (const column of table.columns) {
      // Only include updatable columns that are not generated
      if (!column.is_updatable || column.is_generated) continue

      const dataType = column.data_type.toLowerCase()
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
    (formData: any) => {
      const pks = getPrimaryKeys(table)
      if (pks.length === 0) {
        toast.error('Cannot update row. This table does not have a primary key.')
        return
      }

      const setClauses = Object.entries(formData)
        .map(([key, value]) => {
          if (JSON.stringify(row[key]) === JSON.stringify(value)) return null

          // Find the column type to determine formatting
          const column = table.columns.find((col: any) => col.name === key)
          const dataType = column?.data_type?.toLowerCase() || ''
          const isNullable = column?.is_nullable || false

          let formattedValue

          // Handle empty/null values
          if (
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '')
          ) {
            if (isNullable) {
              formattedValue = 'NULL'
            } else if (dataType.includes('array')) {
              // Non-nullable array, set to empty array
              const jsonObj = JSON.stringify({ [key]: [] })
              formattedValue = `(select ${key} from json_populate_record(null::public."${table.name
                }", '${jsonObj.replace(/'/g, "''")}'))`
            } else {
              // Non-nullable text field, set to empty string
              formattedValue = "''"
            }
          } else if (Array.isArray(value) && value.length === 0) {
            // Explicitly empty array (different from null)
            const jsonObj = JSON.stringify({ [key]: [] })
            formattedValue = `(select ${key} from json_populate_record(null::public."${table.name
              }", '${jsonObj.replace(/'/g, "''")}'))`
          } else if (dataType.includes('array')) {
            // Array type with actual values - use json_populate_record syntax
            const jsonObj = JSON.stringify({ [key]: value })
            formattedValue = `(select ${key} from json_populate_record(null::public."${table.name
              }", '${jsonObj.replace(/'/g, "''")}'))`
          } else if (dataType === 'user-defined' && column?.enums) {
            // Handle enum values - treat as strings with proper escaping
            formattedValue = `'${String(value).replace(/'/g, "''")}'`
          } else if (typeof value === 'string') {
            formattedValue = `'${value.replace(/'/g, "''")}'`
          } else {
            formattedValue = value
          }

          return `"${key}" = ${formattedValue}`
        })
        .filter(Boolean)
        .join(', ')

      if (!setClauses) {
        toast.error('No changes to save')
        onSuccess()
        return
      }

      const whereClauses = pks
        .map((pk) => {
          const value = row[pk]
          const formattedValue =
            typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value
          return `"${pk}" = ${formattedValue}`
        })
        .join(' AND ')

      const updateSql = `UPDATE public."${table.name}" SET ${setClauses} WHERE ${whereClauses};`

      runUpdateQuery({ projectRef: SUPABASE_PROJECT_REF, query: updateSql, readOnly: false }, { onSuccess })
    },
    [table, row, runUpdateQuery, onSuccess]
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent variant={"fullscreen"}>
        <div className="px-6 pt-4 pb-10 lg:px-12 lg:pt-10">
          <h2 className="text-base lg:text-xl font-semibold mb-4">Editing row in {table.name}</h2>
          <DynamicForm
            schema={formSchema}
            initialValues={row}
            onSubmit={handleFormSubmit}
            columnInfo={columnInfo}
            isLoading={isUpdatePending}
          />
        </div>
      </DialogContent>
    </Dialog >
  )
}

type TableRecordsViewProps = {
  table: any
}

function TableRecordsView({ payload: { table }, open, onClose }: DialogProps<TableRecordsViewProps>) {
  const [refetchCounter, setRefetchCounter] = useState(0)
  const dialogs = useDialogs();

  const handleRowClick = (row: any) => dialogs.open(EditRowView, { table, row, onSuccess: () => { } })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent variant={"fullscreen"}>
        <SqlEditor
          hideChartOption={true}
          projectRef={SUPABASE_PROJECT_REF}
          label={`View records in ${table.name}`}
          initialSql={`SELECT * FROM public."${table.name}" LIMIT 100;`}
          queryKey={table.id}
          onRowClick={handleRowClick}
          hideSql={true}
          runAutomatically={true}
          refetch={refetchCounter}
          readOnly
        />
      </DialogContent>
    </Dialog>
  )
}

export function DatabaseManager() {
  const { user } = useGrants();
  const dialogs = useDialogs();
  const { data: tables, isLoading, isError } = useListTables(['public', 'games', 'notifications'])

  const handleTableClick = (table: any) => {
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
        <div className="p-6 pt-4 lg:p-8 lg:pt-8">

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
              {groupBy(tables, (x: any) => x.schema).entries().map(([key, groupedTables]) => (
                <div key={key}>
                  <div className='text-base font-bold'>{key}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {
                      groupedTables.map(table => <Button
                        variant="outline"
                        key={table.id}
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
