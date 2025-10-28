import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { styled } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import {
  GridColDef,
  GridFilterModel,
  GridPaginationModel,
  GridSortModel,
  GridValidRowModel,
} from '@mui/x-data-grid';
import { ErrorBoundary } from '@sentry/react';
import { keepPreviousData, QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDialogs, useLocalStorageState } from '@toolpad/core';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { lazy } from 'react';
import { useSearchParams } from 'react-router';

import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Visibility from '@mui/icons-material/Visibility';

const SelectTableDialog = lazy(() => import('./dialogs/SelectTableDialog'));
const EditEntryDialog = lazy(() => import('./EditEntryDialog'));
const ViewEntryDialog = lazy(() => import('./ViewEntryDialog'));

const DataGrid = lazy(() => import('@mui/x-data-grid').then((mod) => ({ default: mod.DataGrid })));
const GridActionsCellItem = lazy(() => import('@mui/x-data-grid').then((mod) => ({ default: mod.GridActionsCellItem })));


export type Table = { name: string; schema: string };

export type ColumnInfo = {
  column_name: string;
  data_type: string;
  foreign_key_column_name: string | null;
  foreign_key_schema_name: string | null;
  foreign_key_table_name: string | null;
  is_nullable: boolean;
};

export type UseSupabaseTableQueryArgs = {
  schema: string;
  table: string;
  paginationModel: GridPaginationModel;
  filterModel?: GridFilterModel;
  sortModel?: GridSortModel;
  enabled?: boolean;
};

export type UseSupabaseTableQueryResult<Row = Record<string, unknown>> = {
  rows: Row[];
  rowCount: number;
  columns: ColumnInfo[];
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
  error: unknown;
};

const StyledGridOverlay = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  '& .no-rows-primary': {
    fill: '#3D4751',
    ...theme.applyStyles('light', { fill: '#AEB8C2' }),
  },
  '& .no-rows-secondary': {
    fill: '#1D2126',
    ...theme.applyStyles('light', { fill: '#E8EAED' }),
  },
}));

function NoRowsOverlay() {
  return (
    <StyledGridOverlay>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" width={96} viewBox="0 0 452 257" aria-hidden>
        <path className="no-rows-primary" d="M348 69c-46.392 0-84 37.608-84 84s37.608 84 84 84 84-37.608 84-84-37.608-84-84-84Zm-104 84c0-57.438 46.562-104 104-104s104 46.562 104 104-46.562 104-104 104-104-46.562-104-104Z" />
        <path className="no-rows-primary" d="M308.929 113.929c3.905-3.905 10.237-3.905 14.142 0l63.64 63.64c3.905 3.905 3.905 10.236 0 14.142-3.906 3.905-10.237 3.905-14.142 0l-63.64-63.64c-3.905-3.905-3.905-10.237 0-14.142Z" />
        <path className="no-rows-primary" d="M308.929 191.711c-3.905-3.906-3.905-10.237 0-14.142l63.64-63.64c3.905-3.905 10.236-3.905 14.142 0 3.905 3.905 3.905 10.237 0 14.142l-63.64 63.64c-3.905 3.905-10.237 3.905-14.142 0Z" />
        <path className="no-rows-secondary" d="M0 10C0 4.477 4.477 0 10 0h380c5.523 0 10 4.477 10 10s-4.477 10-10 10H10C4.477 20 0 15.523 0 10ZM0 59c0-5.523 4.477-10 10-10h231c5.523 0 10 4.477 10 10s-4.477 10-10 10H10C4.477 69 0 64.523 0 59ZM0 106c0-5.523 4.477-10 10-10h203c5.523 0 10 4.477 10 10s-4.477 10-10 10H10c-5.523 0-10-4.477-10-10ZM0 153c0-5.523 4.477-10 10-10h195.5c5.523 0 10 4.477 10 10s-4.477 10-10 10H10c-5.523 0-10-4.477-10-10ZM0 200c0-5.523 4.477 10 10-10h203c5.523 0 10 4.477 10 10s-4.477 10-10 10H10c-5.523 0-10-4.477-10-10ZM0 247c0-5.523 4.477-10 10-10h231c5.523 0 10 4.477 10 10s-4.477 10-10 10H10c-5.523 0-10-4.477-10-10Z" />
      </svg>
      <Box sx={{ mt: 2 }}>No rows</Box>
    </StyledGridOverlay>
  );
}


const serializeSortKey = (sortModel?: GridSortModel) =>
  JSON.stringify((sortModel ?? []).map(({ field, sort }) => ({ field, sort })));

const serializeFilterKey = (filterModel?: GridFilterModel) =>
  JSON.stringify({
    quickFilterValues: filterModel?.quickFilterValues ?? [],
    items: (filterModel?.items ?? [])
      .filter((i) => i.field && i.operator && i.value !== undefined)
      .map(({ field, operator, value }) => ({ field, operator, value })),
  });

function mapOperator(qb: any, field: string, operator: string, value: unknown) {
  if (value == null) return qb;
  const v = String(value);
  switch (operator) {
    case 'contains':
      return qb.ilike(field, `%${v}%`);
    case 'startsWith':
      return qb.ilike(field, `${v}%`);
    case 'endsWith':
      return qb.ilike(field, `%${v}`);
    case 'equals':
      return qb.eq(field, v);
    case 'isEmpty':
      return qb.or(`${field}.is.null,${field}.eq.`);
    case 'isNotEmpty':
      return qb.or(`${field}.not.is.null,${field}.neq.`);
    case 'greaterThan':
    case '>':
      return qb.gt(field, v);
    case 'greaterThanOrEqual':
    case '>=':
      return qb.gte(field, v);
    case 'lessThan':
    case '<':
      return qb.lt(field, v);
    case 'lessThanOrEqual':
    case '<=':
      return qb.lte(field, v);
    case 'in': {
      const list = v.split(',').map((s) => s.trim()).filter(Boolean);
      return qb.in(field, list);
    }
    default:
      return qb.ilike(field, `%${v}%`);
  }
}

async function fetchColumns(schema: string, table: string): Promise<ColumnInfo[]> {
  const { data, error } = await supabase.rpc('get_column_info', {
    schema_name: schema,
    selected_table: table,
  });
  if (error) throw error;
  return (data ?? []) as ColumnInfo[];
}

export function useSupabaseTableQuery<Row = Record<string, unknown>>({
  schema,
  table,
  paginationModel,
  filterModel,
  sortModel,
  enabled = true,
}: UseSupabaseTableQueryArgs): UseSupabaseTableQueryResult<Row> {
  const page = paginationModel.page ?? 0;
  const pageSize = paginationModel.pageSize ?? 25;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const colsQuery = useQuery({
    queryKey: ['sb', 'columns', schema, table],
    queryFn: () => fetchColumns(schema, table),
    enabled: enabled && Boolean(schema && table),
    staleTime: 5 * 60 * 1000,
  });

  const rowsQuery = useQuery({
    queryKey: [
      'sb',
      'rows',
      schema,
      table,
      { from, to },
      serializeSortKey(sortModel),
      serializeFilterKey(filterModel),
    ],
    enabled: enabled && Boolean(schema && table) && !colsQuery.isLoading && !colsQuery.error,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let qb = supabase
        // @ts-ignore
        .schema(schema).from(table)
        .select('*', { count: 'exact' })
        .range(from, to)
        .setHeader('x-app-client', '1');

      (sortModel ?? []).forEach(({ field, sort }) => {
        if (field && sort) qb = qb.order(field, { ascending: sort === 'asc', nullsFirst: false });
      });

      (filterModel?.items ?? []).forEach((item) => {
        if (!item.field || !item.operator || item.value === undefined) return;
        qb = mapOperator(qb, item.field, item.operator as string, item.value);
      });

      if (filterModel?.quickFilterValues?.length) {
        const q = filterModel.quickFilterValues.join(' ');
        const textCols = (colsQuery.data ?? [])
          .filter((c) => ['text', 'varchar', 'char', 'uuid', 'citext'].some((t) => c.data_type?.includes(t)))
          .map((c) => `${c.column_name}.ilike.%${q}%`);
        if (textCols.length) qb = qb.or(textCols.join(','));
      }

      const { data, error, count } = await qb;
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });

  return {
    rows: (rowsQuery.data?.rows ?? []) as Row[],
    rowCount: rowsQuery.data?.count ?? 0,
    columns: colsQuery.data ?? [],
    isLoading: colsQuery.isLoading || rowsQuery.isLoading,
    isFetching: colsQuery.isFetching || rowsQuery.isFetching,
    refetch: async () => Promise.all([colsQuery.refetch(), rowsQuery.refetch()]),
    error: colsQuery.error ?? rowsQuery.error,
  } as UseSupabaseTableQueryResult<Row>;
}

export type UseSupabaseTableMutationsArgs = {
  schema?: string;
  table?: string;
  primaryKey?: string; // default 'id'
};

function useSupabaseTableMutations<Row = Record<string, unknown>>({
  schema,
  table,
  primaryKey = 'id',
}: UseSupabaseTableMutationsArgs) {
  const queryClient = useQueryClient();
  const rowsKeyPrefix = React.useMemo(() => ['sb', 'rows', schema, table], [schema, table]);

  const patchCachedPages = (
    patch: (page: { rows: Row[]; count: number }) => { rows: Row[]; count: number },
  ) => {
    const caches = queryClient.getQueriesData<{ rows: Row[]; count: number }>({ queryKey: rowsKeyPrefix });
    for (const [key, old] of caches) {
      if (!old) continue;
      queryClient.setQueryData(key, patch({ rows: old.rows ?? [], count: old.count ?? 0 }));
    }
  };

  const createRow = useMutation({
    mutationFn: async (payload: Partial<Row>) => {
      if (!schema || !table) throw new Error('schema and table are required for createRow');
      const { data, error } = await supabase
        // @ts-ignore
        .schema(schema).from(table)
        .insert(payload as any)
        .select('*')
        .single()
        .setHeader('x-app-client', '1');
      if (error) throw error;
      return data as Row;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: rowsKeyPrefix });
      let optimistic: Row | null = null;
      patchCachedPages(({ rows, count }) => {
        optimistic = { ...(payload as any) } as Row;
        if ((optimistic as any)[primaryKey] == null) {
          (optimistic as any)[primaryKey] = `temp_${Date.now()}`;
          (optimistic as any).__temp = true;
        }
        return { rows: [optimistic!, ...rows], count: count + 1 };
      });
      return { optimistic };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.optimistic) {
        patchCachedPages(({ rows, count }) => ({
          rows: rows.filter((r) => (r as any)[primaryKey] !== (ctx.optimistic as any)[primaryKey]),
          count: Math.max(0, count - 1),
        }));
      }
    },
    onSuccess: (created) => {
      patchCachedPages(({ rows, count }) => {
        const idx = rows.findIndex((r) => (r as any).__temp);
        if (idx >= 0) {
          const clone = rows.slice();
          clone[idx] = created as any;
          return { rows: clone, count };
        }
        return { rows: [created as any, ...rows], count };
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: rowsKeyPrefix }),
  });

  const updateRow = useMutation({
    mutationFn: async (payload: Partial<Row> & Record<string, any>) => {
      const id = payload[primaryKey];
      if (id == null) throw new Error(`updateRow requires payload.${primaryKey}`);
      if (!schema || !table) throw new Error('schema and table are required for updateRow');
      const { data, error } = await supabase
        // @ts-ignore
        .schema(schema).from(table)
        .update(payload as never)
        .eq(primaryKey, id)
        .select('*')
        .single()
        .setHeader('x-app-client', '1');
      console.log('updateRow', { payload, data, error, primaryKey, schema, table });
      if (error) throw error;
      return data as Row;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: rowsKeyPrefix });
      const id = (payload as any)[primaryKey];
      const prevSnapshots = queryClient.getQueriesData<{ rows: Row[]; count: number }>({ queryKey: rowsKeyPrefix });
      patchCachedPages(({ rows, count }) => ({
        rows: rows.map((r) => ((r as any)[primaryKey] === id ? { ...r, ...payload } : r)),
        count,
      }));
      return { prevSnapshots };
    },
    onError: (_err, _payload, ctx) => {
      for (const [key, snapshot] of ctx?.prevSnapshots ?? []) queryClient.setQueryData(key, snapshot);
    },
    onSuccess: (updated) => {
      patchCachedPages(({ rows, count }) => ({
        rows: rows.map((r) => ((r as any)[primaryKey] === (updated as any)[primaryKey] ? (updated as any) : r)),
        count,
      }));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: rowsKeyPrefix }),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string | number) => {
      if (!schema || !table) throw new Error('schema and table are required for deleteRow');
      const { error } = await supabase
        // @ts-ignore
        .schema(schema).from(table)
        .delete().eq(primaryKey, id)
        .setHeader('x-app-client', '1');
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: rowsKeyPrefix });
      const prevSnapshots = queryClient.getQueriesData<{ rows: Row[]; count: number }>({ queryKey: rowsKeyPrefix });
      patchCachedPages(({ rows, count }) => ({
        rows: rows.filter((r) => (r as any)[primaryKey] !== id),
        count: Math.max(0, count - 1),
      }));
      return { prevSnapshots };
    },
    onError: (_err, _id, ctx) => {
      for (const [key, snapshot] of ctx?.prevSnapshots ?? []) queryClient.setQueryData(key, snapshot);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: rowsKeyPrefix }),
  });

  // Extended helpers for composite keys / match-based ops
  const updateRowByMatch = useMutation({
    mutationFn: async ({ where, changes }: { where: Record<string, any>; changes: Partial<Row> }) => {
      if (!schema || !table) throw new Error('schema and table are required for updateRowByMatch');
      let qb = supabase
        // @ts-ignore
        .schema(schema).from(table)
        .update(changes as never)
        .setHeader('x-app-client', '1');
      Object.entries(where).forEach(([k, v]) => (qb = qb.eq(k, v as any)));
      console.log(where, changes);
      const { data, error } = await qb.select('*');
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Row;
    },
    onMutate: async ({ where, changes }) => {
      await queryClient.cancelQueries({ queryKey: rowsKeyPrefix });
      const prevSnapshots = queryClient.getQueriesData<{ rows: Row[]; count: number }>({ queryKey: rowsKeyPrefix });
      patchCachedPages(({ rows, count }) => ({
        rows: rows.map((r) => (Object.entries(where).every(([k, v]) => (r as any)[k] === v) ? { ...r, ...changes } : r)),
        count,
      }));
      return { prevSnapshots };
    },
    onError: (_err, _payload, ctx) => {
      for (const [key, snapshot] of ctx?.prevSnapshots ?? []) queryClient.setQueryData(key, snapshot);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: rowsKeyPrefix }),
  });

  const deleteByMatch = useMutation({
    mutationFn: async (where: Record<string, any>) => {
      if (!schema || !table) throw new Error('schema and table are required for deleteByMatch');
      let qb = supabase
        // @ts-ignore
        .schema(schema).from(table)
        .delete()
        .setHeader('x-app-client', '1');
      Object.entries(where).forEach(([k, v]) => (qb = qb.eq(k, v as any)));
      const { error } = await qb;
      if (error) throw error;
      return where;
    },
    onMutate: async (where) => {
      await queryClient.cancelQueries({ queryKey: rowsKeyPrefix });
      const prevSnapshots = queryClient.getQueriesData<{ rows: Row[]; count: number }>({ queryKey: rowsKeyPrefix });
      patchCachedPages(({ rows, count }) => ({
        rows: rows.filter((r) => !Object.entries(where).every(([k, v]) => (r as any)[k] === v)),
        count: Math.max(0, count - 1),
      }));
      return { prevSnapshots };
    },
    onError: (_err, _payload, ctx) => {
      for (const [key, snapshot] of ctx?.prevSnapshots ?? []) queryClient.setQueryData(key, snapshot);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: rowsKeyPrefix }),
  });

  return { createRow, updateRow, deleteRow, updateRowByMatch, deleteByMatch } as const;
}

// Primary key discovery via RPC
async function fetchPrimaryKeys(schema: string, table: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('util_get_primary_keys', { schema_name: schema, table_name: table });
  if (error) throw error;
  return (data ?? []).map((r: { column_name: string }) => r.column_name);
}

function usePrimaryKeys(schema?: string, table?: string) {
  return useQuery({
    queryKey: ['sb', 'pk', schema, table] as QueryKey,
    enabled: Boolean(schema && table),
    queryFn: () => fetchPrimaryKeys(schema!, table!),
    staleTime: 10 * 60 * 1000,
  });
}

function useSupabaseTableMutationsPkAware<Row = Record<string, unknown>>({
  schema,
  table,
  primaryKey = 'id',
}: UseSupabaseTableMutationsArgs & { primaryKey?: string }) {
  const { data: pkColumns = [] } = usePrimaryKeys(schema, table);
  const base = useSupabaseTableMutations<Row>({ schema, table, primaryKey });

  const updateSmart = {
    mutateAsync: async (row: any) => {
      if (!schema || !table) throw new Error('schema and table are required for update');
      if (pkColumns.length === 1 && row[pkColumns[0]] != null) return base.updateRow.mutateAsync(row);
      if (pkColumns.length > 1) {
        const where = Object.fromEntries(pkColumns.map((k) => [k, row[k]]));
        const { __temp, ...changes } = row;
        console.log(where, changes);
        return base.updateRowByMatch.mutateAsync({ where, changes });
      }
      return base.updateRowByMatch.mutateAsync({ where: row, changes: row });
    },
  } as const;

  const deleteSmart = {
    mutateAsync: async (row: any) => {
      if (!schema || !table) throw new Error('schema and table are required for delete');
      if (pkColumns.length === 1 && row[pkColumns[0]] != null) return base.deleteRow.mutateAsync(row[pkColumns[0]]);
      if (pkColumns.length > 1) {
        const where = Object.fromEntries(pkColumns.map((k) => [k, row[k]]));
        return (base as any).deleteByMatch.mutateAsync(where);
      }
      return (base as any).deleteByMatch.mutateAsync(row);
    },
  } as const;

  return { ...base, updateSmart, deleteSmart, pkColumns } as const;
}


export default function SupabaseClient() {
  const [tables = [], setTables] = useLocalStorageState<Table[]>('supabase_tables', [], {
    codec: {
      stringify: (data: Table[]) => JSON.stringify(data),
      parse: (raw: string): Table[] => {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every((item) => typeof item.name === 'string' && typeof item.schema === 'string')) {
            return parsed as Table[];
          }
        } catch {
          // ignore
        }
        return [];
      }
    }
  });
  const [selectedTable, setSelectedTable] = React.useState<Table | null>(null);

  const notifications = useNotifications();
  const dialog = useDialogs();
  const [searchParams] = useSearchParams();

  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>({ items: [] });
  const [sortModel, setSortModel] = React.useState<GridSortModel>([]);

  const { rows, rowCount, columns, isLoading } = useSupabaseTableQuery({
    schema: selectedTable?.schema ?? 'public',
    table: selectedTable?.name ?? '',
    paginationModel,
    filterModel,
    sortModel,
    enabled: Boolean(selectedTable),
  });

  const { createRow, updateSmart, deleteSmart, pkColumns } = useSupabaseTableMutationsPkAware({
    schema: selectedTable?.schema,
    table: selectedTable?.name,
    primaryKey: 'id',
  });

  // Initial load of tables + deep-link selection
  React.useEffect(() => {
    (async () => {
      const result = await supabase.rpc('get_public_table_names').select('*');
      const data = result.data ?? [];
      setTables(data.map((x: any) => ({ name: x.table_name, schema: x.table_schema })));

      const table = searchParams.get('table');
      const schema = searchParams.get('schema');
      if (table && schema && data.some((x: any) => x.table_name === table && x.table_schema === schema)) {
        setSelectedTable({ name: table, schema });
      }
    })().catch((e) => notifications.show(String(e), { severity: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectTable = async () => {
    const result = await dialog.open(SelectTableDialog, { tables: tables ?? [] });
    if (!result) return;
    setPaginationModel({ page: 0, pageSize: 50 });
    setFilterModel({ items: [] });
    setSortModel([]);
    setSelectedTable(result);

    const url = new URL(window.location.href);
    url.searchParams.set('schema', result.schema);
    url.searchParams.set('table', result.name);
    window.history.pushState({ path: url.toString() }, '', url.toString());
  };

  const getRowId = React.useCallback(
    (row: any) => (pkColumns.length ? pkColumns.map((k) => row[k]).join('|') : row.id ?? JSON.stringify(row)),
    [pkColumns],
  );

  const ToolbarButtons = () => (
    <Toolbar>
      <Button size="small" startIcon={<Add />} onClick={async () => {
        const result = await dialog.open(EditEntryDialog, { entry: {}, columns });
        if (!result) return;
        try {
          await createRow.mutateAsync(result);
        } catch (e: any) {
          notifications.show('Der Eintrag konnte nicht erstellt werden. ' + e.message, { severity: 'error' });
        }
      }}>Erstellen</Button>
    </Toolbar>
  );

  return (
    <Layout>
      <ListItem dense onClick={onSelectTable} secondaryAction={<ExpandMoreOutlined />}>
        <ListItemText primary={selectedTable?.name ?? 'Nicht gewählt'} secondary={selectedTable?.schema ?? 'Nicht gewählt'} />
      </ListItem>

      <ErrorBoundary fallback={NoRowsOverlay} onError={(error) => notifications.show(String(error), { severity: 'error' })}>
        <DataGrid
          sx={{ '--DataGrid-overlayHeight': '300px', mb: 'min(56px,env(safe-area-inset-bottom))', maxHeight: 'calc(100% - 61px - env(safe-area-inset-bottom))', height: 'calc(100% - 61px - env(safe-area-inset-bottom))' }}
          slots={{ noRowsOverlay: NoRowsOverlay, toolbar: ToolbarButtons }}
          rows={rows}
          columns={[
            ...columns.map((c) => ({ field: c.column_name, headerName: c.column_name, width: 150, hideable: true } as GridColDef)),
            ...(columns.length
              ? [
                {
                  field: 'actions',
                  type: 'actions',
                  cellClassName: 'actions',
                  headerName: 'Actions',
                  width: 100,
                  getActions: ({ row }) => [
                    <GridActionsCellItem
                      key="view"
                      icon={<Visibility />}
                      label="View"
                      onClick={async () => {
                        const result = await dialog.open(ViewEntryDialog, { entry: row });
                        if (result === 'delete') await deleteSmart.mutateAsync(row);
                      }}
                      color="inherit"
                    />,
                    <GridActionsCellItem
                      key="edit"
                      icon={<Edit />}
                      label="Edit"
                      onClick={async () => {
                        const updates = await dialog.open(EditEntryDialog, { entry: row, columns });
                        if (updates) await updateSmart.mutateAsync({ ...row, ...updates });
                      }}
                      color="inherit"
                    />,
                  ],
                } as GridColDef,
              ]
              : []),
          ]}
          loading={isLoading}
          getRowId={getRowId}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={rowCount}
          paginationMode="server"
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          filterMode="server"
          filterModel={filterModel}
          onFilterModelChange={setFilterModel}
          disableRowSelectionOnClick
          processRowUpdate={async (newRow: GridValidRowModel) => {
            await updateSmart.mutateAsync(newRow);
            return newRow;
          }}
          onProcessRowUpdateError={(err) => notifications.show('Update failed: ' + (err as any).message, { severity: 'error' })}
        />
      </ErrorBoundary>
    </Layout>
  );
}
