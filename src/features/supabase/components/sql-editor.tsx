'use client'

import { Editor } from '@monaco-editor/react'
import {
  AlertTriangle,
  BarChart as BarChartIcon,
  FileText
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useRunQuery } from '../hooks/use-run-query'
import { ResultsTable } from './results-table'

interface SqlEditorProps {
  projectRef: string
  initialSql?: string
  queryKey?: any
  label?: string
  onResults?: (data: any[] | undefined) => void
  onRowClick?: (row: any, queryKey?: any) => void
  hideSql?: boolean
  readOnly?: boolean
  runAutomatically?: boolean
  refetch?: number
  initialNaturalLanguageMode?: boolean
  hideChartOption?: boolean
}

export function SqlEditor({
  projectRef,
  initialSql,
  queryKey,
  onResults,
  onRowClick,
  label = 'Query your data',
  hideSql = false,
  readOnly = false,
  runAutomatically = false,
  refetch,
  initialNaturalLanguageMode = false,
  hideChartOption = false,
}: SqlEditorProps) {
  const [sql, setSql] = useState(initialSql || '')
  const [isSqlVisible, setIsSqlVisible] = useState(!hideSql)

  const { mutate: runQuery, data, isPending, error } = useRunQuery()

  const [isChartVisible, setIsChartVisible] = useState(false)
  const [xAxisColumn, setXAxisColumn] = useState<string | null>(null)
  const [yAxisColumn, setYAxisColumn] = useState<string | null>(null)

  const columns = useMemo(() => {
    if (!data || data.length === 0) return []
    return Object.keys(data[0])
  }, [data])

  useEffect(() => {
    if (initialSql) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSql(initialSql)
    }
  }, [initialSql])

  const handleRunQuery = useCallback(() => {
    if (sql) {
      runQuery({ projectRef, query: sql, readOnly: true })
    }
  }, [sql, projectRef, runQuery])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSqlVisible(!hideSql)
  }, [hideSql])

  useEffect(() => {
    if (runAutomatically && initialSql) {
      runQuery({ projectRef, query: initialSql, readOnly: true })
    }
  }, [runAutomatically, initialSql, projectRef, runQuery])

  useEffect(() => {
    if (refetch && refetch > 0) {
      handleRunQuery()
    }
  }, [refetch, handleRunQuery])

  useEffect(() => {
    if (onResults) {
      onResults(data)
    }
  }, [data, onResults])

  useEffect(() => {
    const noResults = !data || (Array.isArray(data) && data.length === 0)
    if (noResults && !isSqlVisible && !readOnly && !isPending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSqlVisible(true)
    }
  }, [data, isSqlVisible])

  const serverErrorMessage = (error as any)?.response?.data?.message || ''
  const isReadOnlyError =
    serverErrorMessage.includes('permission denied') || serverErrorMessage.includes('42501')
  const customReadOnlyError = "You can't directly alter your database schema, use chat instead"

  // Build the toggle-group selection based on current UI state
  const toggleValues = useMemo(() => {
    const values: string[] = []
    if (isSqlVisible) values.push('sql')
    if (!hideChartOption && isChartVisible) values.push('chart')
    return values
  }, [isSqlVisible, isChartVisible, hideChartOption])

  const handleToggleGroupChange = (values: string[]) => {
    setIsSqlVisible(values.includes('sql'))
    if (!hideChartOption) {
      setIsChartVisible(values.includes('chart'))
    }
  }

  return (
    <div>
      <div className="px-6 pt-4 lg:px-8 lg:pt-8">
        <div className="flex items-center gap-4 mb-4    ">
          <h2 className="font-semibold flex-1">{label}</h2>
          <ToggleGroup
            size="sm"
            value={toggleValues}
            onValueChange={handleToggleGroupChange}
            className="gap-1"
          >
            <ToggleGroupItem value="sql" aria-label="SQL">
              <FileText className="h-4 w-4" />
            </ToggleGroupItem>
            {!hideChartOption && (
              <Popover>
                <PopoverTrigger>
                  <ToggleGroupItem value="chart" aria-label="Chart">
                    <BarChartIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Label className="flex-1 mb-2 block">Show Chart</Label>
                          <p className="text-xs text-muted-foreground">
                            Visualize your data with a chart.
                          </p>
                        </div>
                        <Switch
                          id="show-chart"
                          size="sm"
                          className="mb-0"
                          checked={isChartVisible}
                          onCheckedChange={setIsChartVisible}
                        />
                      </div>
                      {isChartVisible && (
                        <div className="mt-2">
                          <div className="grid grid-cols-3 items-center gap-4 mb-2">
                            <Label htmlFor="x-axis">X-Axis</Label>
                            <Select
                              onValueChange={setXAxisColumn}
                              defaultValue={xAxisColumn || undefined}
                            >
                              <SelectTrigger className="col-span-2 h-8">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {columns.map((col) => (
                                  <SelectItem key={col} value={col}>
                                    {col}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 items-center gap-4 mb-2">
                            <Label htmlFor="y-axis">Y-Axis</Label>
                            <Select
                              onValueChange={setYAxisColumn}
                              defaultValue={yAxisColumn || undefined}
                            >
                              <SelectTrigger className="col-span-2 h-8">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {columns.map((col) => (
                                  <SelectItem key={col} value={col}>
                                    {col}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </ToggleGroup>
        </div>
        <div>
          {isSqlVisible && (
            <div className="border-t border-b bg-muted overflow-hidden -mx-6 lg:-mx-8 mt-4 relative">
              <Editor
                height="200px"
                language="sql"
                value={sql}
                onChange={(value) => setSql(value || '')}
                theme="vs-dark"
                className="bg-transparent"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  readOnly,
                  padding: {
                    top: 24,
                    bottom: 24,
                  },
                }}
              />
              <Button
                size="sm"
                onClick={handleRunQuery}
                disabled={isPending}
                className="absolute bottom-4 right-4"
              >
                {isPending ? 'Running...' : 'Run Query'}
              </Button>
            </div>
          )}
        </div>
      </div>
      {isPending && (
        <div className="space-y-2 p-4 px-6 lg:px-8">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      )}
      {error && (
        <div className="px-6 lg:px-8 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Query Error</AlertTitle>
            <AlertDescription>
              {isReadOnlyError
                ? customReadOnlyError
                : serverErrorMessage || (error as Error)?.message || 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {data && (
        <div>
          <ResultsTable data={data} onRowClick={(row) => onRowClick?.(row, queryKey)} />
        </div>
      )}
    </div>
  )
}