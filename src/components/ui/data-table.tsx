"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  PaginationState,
  SortingState,
  useReactTable
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "./button"
import { Input } from "./input"
import { Item, ItemActions, ItemContent, ItemTitle } from "./item"

export type FilterCondition = {
  column: string
  operator: string
  value: string
  data_type: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  rowCount?: number
  onRowClick?: (row: TData) => void

  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination: PaginationState
  onPaginationChange: (pagination: PaginationState) => void
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: (filters: ColumnFiltersState) => void

  isLoading?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  rowCount,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  columnFilters,
  onColumnFiltersChange,
  isLoading
}: DataTableProps<TData, TValue>) {

  const table = useReactTable({
    data,
    columns,
    pageCount: rowCount ? Math.ceil(rowCount / pagination.pageSize) : 1,
    state: {
      sorting,
      pagination,
      columnFilters,
    },
    // Server-Side Flags
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,

    onSortingChange: (updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater),
    onPaginationChange: (updater) => onPaginationChange(typeof updater === 'function' ? updater(pagination) : updater),
    onColumnFiltersChange: (updater) => onColumnFiltersChange(typeof updater === 'function' ? updater(columnFilters) : updater),

    getCoreRowModel: getCoreRowModel(),
  });

  const [conditions, setConditions] = useState<FilterCondition[]>([])

  const addCondition = () => {
    const firstCol = table.getAllColumns().find(c => c.getCanFilter() && !conditions.map(x => x.column).includes(c.id))
    if (firstCol) {
      setConditions([...conditions, { column: firstCol.id, operator: 'eq', value: '', data_type: firstCol.columnDef.meta as string }])
    }
  }

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    setConditions(newConditions)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      onColumnFiltersChange([{ id: "advanced_filters", value: conditions }])
    }, 500)
    return () => clearTimeout(timeout)
  }, [conditions, onColumnFiltersChange])

  return (<div className="flex flex-col h-full gap-4 p-2 min-h-0">
    <div className="flex-none flex flex-row" >
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter-Badge-Liste */}
        {conditions.map((condition, index) => (
          <div key={condition.column} className="flex items-center gap-0 border rounded-md shadow-sm h-8 bg-background">
            {/* Spalten-Auswahl */}
            <Select
              value={condition.column}
              onValueChange={(val) => val && updateCondition(index, { column: val })}
            >
              <SelectTrigger className="h-7 border-0 focus:ring-0 text-xs font-medium px-2 rounded-r-none border-r">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {table.getAllColumns().filter(c => c.getCanFilter()).map(col => (
                  <SelectItem key={col.id} value={col.id} className="text-xs">{col.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator-Auswahl */}
            <Select
              value={condition.operator}
              onValueChange={(val) => val && updateCondition(index, { operator: val })}
            >
              <SelectTrigger className="h-7 border-0 focus:ring-0 text-xs text-blue-600 font-semibold px-2 rounded-none border-r w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>COMPARISON</SelectLabel>

                  <SelectItem indicatorSide="left" value="eq">
                    <Item className="p-0">
                      <ItemContent className="p-0">
                        <ItemTitle>Equals</ItemTitle>
                      </ItemContent>
                      <ItemActions>
                        =
                      </ItemActions>
                    </Item>
                  </SelectItem>
                  <SelectItem indicatorSide="left" value="neq">Not equal !=</SelectItem>
                  <SelectItem indicatorSide="left" value="gt">Greater than {'>'}</SelectItem>
                  <SelectItem indicatorSide="left" value="lt">Less than {'<'}</SelectItem>
                  <SelectItem indicatorSide="left" value="gte">Greater or equal {'=<'}</SelectItem>
                  <SelectItem indicatorSide="left" value="lte">Less or equal {'<='}</SelectItem>
                </SelectGroup>
                <SelectSeparator />

                {
                  condition.data_type !== "timestamptz" && <>
                    <SelectGroup>
                      <SelectLabel>PATTERN MATCHING</SelectLabel>

                      <SelectItem indicatorSide="left" value="like">Like ~~</SelectItem>
                      <SelectItem indicatorSide="left" value="ilike">iLike !~~</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                  </>
                }

                <SelectGroup>
                  <SelectLabel>SET & NULL CHECKS</SelectLabel>

                  <SelectItem indicatorSide="left" value="in">In list in</SelectItem>
                  <SelectItem indicatorSide="left" value="is">is is</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* In deiner DataTable beim Rendern der Bedingungen */}
            {condition.operator === "is" ? (
              <Select
                value={condition.value}
                onValueChange={(val) => val && updateCondition(index, { value: val })}
              >
                <SelectTrigger className="h-7 border-0 w-32 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">null</SelectItem>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="h-7 border-0 focus-visible:ring-0 text-xs w-32"
                placeholder={condition.operator === "in" ? "A, B, C..." : "Wert..."}
                value={condition.value}
                onChange={(e) => updateCondition(index, { value: e.target.value })}
              />
            )}

            {/* Entfernen Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-l-none border-l hover:text-destructive"
              onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed flex gap-2"
            onClick={addCondition}
          >
            <Plus className="h-4 w-4" />
            Filter
          </Button>

          {conditions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => setConditions([])}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
      {/* <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" className="ml-auto">
          Columns
        </Button>}>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {table
            .getAllColumns()
            .filter(
              (column) => column.getCanHide()
            )
            .map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) =>
                    column.toggleVisibility(!!value)
                  }
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              )
            })}
        </DropdownMenuContent>
      </DropdownMenu> */}
    </div >
    <div className="flex-1 min-h-0 relative rounded-md border overflow-auto">
      <Table className="relative overflow-visible">
        <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-0">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}
                    className="sticky top-0 bg-background z-20 h-10">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    <div className="flex-none flex items-center justify-between">
      <div className="flex w-[100px] items-center justify-center text-sm font-medium">
        Page {table.getState().pagination.pageIndex + 1} of{" "}
        {table.getPageCount()}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          className="size-8 lg:flex"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Go to first page</span>
          <ChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 lg:flex"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Go to last page</span>
          <ChevronsRight />
        </Button>
      </div>
    </div>
  </div >
  )
}