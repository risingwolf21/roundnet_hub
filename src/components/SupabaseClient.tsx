import {Box} from "@mui/system";
import React, {useEffect, useState} from "react";
import CustomAppBar from "./AppBar";
import {List, ListItemButton, ListItemSecondaryAction, ListItemText} from "@mui/material";
import {useClient} from "react-supabase";
import {ExpandMoreOutlined} from "@mui/icons-material";
import {SwipeableDialog} from "./SwipeableDialog";
import {LoadingIndicator} from "./LoadingIndicator";
import {DataGrid, GridColDef} from "@mui/x-data-grid";

const table_names = ["drink", "event_attendance_user_mapping", "event_comments", "event_group", "events", "group_user_mapping", "history", "key_holders", "keys", "payments"]
export const SupabaseClient = () => {

    const [selectedTable, setSelectedTable] = useState<typeof table_names[number]>("drink");
    const [selectTableOpen, setSelectTableOpen] = useState(false);
    const client = useClient();
    const [loading, setLoading] = useState(false);
    const [selectedTableData, setSelectedTableData] = useState<any[]>([]);

    useEffect(() => {
        setLoading(true);
        client.from(selectedTable).select("*").then(result => {
            if (result.data) {
                setSelectedTableData(result.data);
                setLoading(false);
            }
        })
    }, [selectedTable, client]);

    function getRowId(row: any) {
        switch (selectedTable) {
            case "event_attendance_user_mapping":
                return row.user + row.event;
            case "group_user_mapping":
                return row.user + row.group;
            case "key_holders":
                return row.key + row.user;
            case "user":
                return row.user;
            default:
                return row.id;
        }
    }

    return <Box>
        <CustomAppBar navigateBack/>
        <LoadingIndicator loading={loading}/>
        <ListItemButton onClick={() => setSelectTableOpen(true)}>
            <ListItemText primary={selectedTable}/>
            <ListItemSecondaryAction>
                <ExpandMoreOutlined/>
            </ListItemSecondaryAction>
        </ListItemButton>

        {
            selectedTableData[0] && <DataGrid columns={Object.keys(selectedTableData[0]).map(x => {
                return {
                    field: x,
                    headerName: x,
                    editable: getRowId(x) !== "id",
                    hideable: true
                } as GridColDef;
            })} rows={selectedTableData} getRowId={getRowId} initialState={{
                pagination: {
                    paginationModel: {
                        pageSize: 50,
                    },
                },
            }} processRowUpdate={(updatedRow, originalRow) => {
                console.log(updatedRow);
            }} onProcessRowUpdateError={(error) => console.log(error)}/>
        }

        <SwipeableDialog open={selectTableOpen} setOpen={() => setSelectTableOpen(true)} title={"Tablle auswählen"}>
            <List>
                {
                    table_names.map(x => <ListItemButton onClick={() => {
                        setSelectedTable(x);
                        setSelectTableOpen(false);
                    }}>
                        <ListItemText primary={x}/>
                    </ListItemButton>)
                }
            </List>
        </SwipeableDialog>
    </Box>
}