import { Box } from '@mui/system';
import React, { useState } from 'react';
import { Button, Grid, TextField } from '@mui/material';
import { LoadingIndicator } from './LoadingIndicator';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { supabase } from './services/supabase/supabaseClient';
import { Json } from 'src/types/supabase-generated.types';
import Layout from './Layout';

export const SupabaseQueryClient = () => {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sanitizeQuery = (query: string) => {
    let sanitizedQuery = query.replace(/[‘’]/g, "'");
    sanitizedQuery = sanitizedQuery.replace(/[“”]/g, '"');

    return sanitizedQuery;
  };

  function safeSpread(value: Json): { [p: string]: Json | undefined } {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { ...value };
    }
    throw new Error('Value is not a spreadable object');
  }

  const executeQuery = async () => {
    setError(null);
    setLoading(true);
    try {
      const sanitizedQuery = sanitizeQuery(query);
      const { data, error } = await supabase.rpc('execute_query', { query_text: sanitizedQuery });

      if (error) {
        setError(error.message);
        return;
      }

      setResult(
        data.map((x: { result: Json }, id) => {
          return {
            ...safeSpread(x.result),
            distinctId: id,
          };
        })
      );
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten: ' + JSON.stringify(err));
    }
    setLoading(false);
  };

  return (
    <Layout>
      <LoadingIndicator loading={loading} />
      <Box sx={{ padding: 2 }}>
        <TextField
          fullWidth
          multiline
          label="Schreibe deine SELECT-Abfrage hier..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          variant="outlined"
          minRows={5}
        />
        <Grid container spacing={2}>
          {['SELECT', 'FROM', 'WHERE', 'ORDER BY'].map((x) => (
            <Grid item xs="auto">
              <Button
                onMouseDown={(e: any) => {
                  e.preventDefault();
                  setQuery(query + x + ' ');
                }}
              >
                {x}
              </Button>
            </Grid>
          ))}
        </Grid>
        <br />
        <button onClick={executeQuery}>Abfrage ausführen</button>
        {error && <p style={{ color: 'red' }}>Fehler: {error}</p>}
        <h2>Ergebnisse:</h2>
        {result && result[0] && (
          <DataGrid
            columns={Object.keys(result[0]).map((x) => {
              return {
                field: x,
                headerName: x,
                hideable: true,
                width: 150,
              } as GridColDef;
            })}
            rows={result}
            density={'compact'}
            getRowId={(row: any) => row.distinctId}
            onProcessRowUpdateError={(error) => console.log(error)}
          />
        )}
      </Box>
    </Layout>
  );
};
