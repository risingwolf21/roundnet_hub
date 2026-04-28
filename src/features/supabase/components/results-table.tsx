'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { TableMetadata } from '../hooks/use-tables'

interface ResultsTableProps {
  data: any[]
  table: TableMetadata
  onRowClick?: (row: any) => void
}

export function ResultsTable({ data, table, onRowClick }: ResultsTableProps) {
  if (!data || data.length === 0) {
    return <p className="p-4 text-center">The query returned no results.</p>
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {table.columns.map((column) => (
              <TableHead className="first:pl-6 lg:first:pl-8 last:pr-6 lg:last:pr-8" key={column.name}>
                {column.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              onClick={() => onRowClick?.(row)}
              className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50 group')}
            >
              {table.columns.map((column) => {

                let content = <></>;

                if (column.format === 'bool') {
                  content = <div className="w-full h-full flex items-center justify-center">
                    <div className={cn("w-3 h-3 rounded-full", row[column.name] ? 'bg-green-500' : 'bg-red-500')} />
                  </div>
                } else if (column.format === 'date' || column.format === 'timestamp' || column.format === 'timestamptz') {
                  content = <div className="text-xs font-mono w-fit max-w-72 truncate">
                    {format(new Date(row[column.name]), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                } else {
                  content = <div className="text-xs font-mono w-fit max-w-72 truncate">
                    {JSON.stringify(row[column.name]).replace(/^"|"$/g, '')}
                  </div>
                }

                return <TableCell
                  className="first:pl-6 lg:first:pl-8 last:pr-6 lg:last:pr-8 text-xs text-muted-foreground group-hover:text-foreground min-w-[8rem]"
                  key={`${rowIndex}-${column.name}`}
                >
                  <div className="text-xs font-mono w-fit max-w-72 truncate">
                    {content}
                  </div>
                </TableCell>
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
