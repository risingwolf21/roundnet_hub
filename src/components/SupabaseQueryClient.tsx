import {Box} from "@mui/system";
import React, {useEffect, useState} from "react";
import CustomAppBar from "./AppBar";
import {Button, List, ListItemButton, ListItemSecondaryAction, ListItemText, TextField, Grid, Item} from "@mui/material";
import {useClient} from "react-supabase";
import {Cancel, Delete, Edit, ExpandMoreOutlined, Save} from "@mui/icons-material";
import {SwipeableDialog} from "./SwipeableDialog";
import {LoadingIndicator} from "./LoadingIndicator";
import {
    DataGrid,
    GridActionsCellItem,
    GridColDef,
    GridColType,
    GridRowId,
    GridRowModel,
    GridRowModes,
    GridRowModesModel,
    GridRowsProp,
    GridSlots,
    GridToolbarContainer
} from "@mui/x-data-grid";
import {AlertMessage, AlertSnackbar} from "./AlertSnackbar";
import {isNull, omit, omitBy} from "lodash";
import {supabase} from "./services/supabase/supabaseClient";
import AddIcon from "@mui/icons-material/Add";
import {formatDateFromDatabase} from "../utils";

const AutoItem = (content:any) => <Grid item xs="auto">
    <Item>{content}</Item>
  </Grid>

export const SupabaseQueryClient = () => {

    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<any[]>([]);
    const [error, setError] = useState<string|null>(null);

  const executeQuery = async () => {
    setError(null);
    try {
      const { data, error } = await supabase.rpc('execute_query', { query_text: query });

      if (error) {
        setError(error.message);
        return;
      }

      setResult(data.map((x,id)=>{
            return {
                ...x.result,
                distinctId: id
            }
        })
        );
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten: ' + JSON.stringify(err));
    }
  };

    return <Box>
        <CustomAppBar navigateBack/>
        <LoadingIndicator loading={loading}/>
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
            {
                ["SELECT","FROM","WHERE", "ORDER BY"].map(x => <AutoItem>
    <Button onClick={()=>setQuery(query + x + " ")}>{x}</Button>
</AutoItem>
            }
        </Grid>
      <br />
      <button onClick={executeQuery}>Abfrage ausführen</button>
      {error && <p style={{ color: 'red' }}>Fehler: {error}</p>}
      <h2>Ergebnisse:</h2>
        {
            result && result[0] && <DataGrid columns={Object.keys(result[0]).map(x => {
                return {
                    field: x,
                    headerName: x,
                    hideable: true,
                    width: 150
                } as GridColDef;
            })}
rows={result}
density={"compact"}
getRowId={(row:any)=> row.distinctId}
onProcessRowUpdateError={(error) => console.log(error)}/>
        }
        </Box>
    </Box>
}