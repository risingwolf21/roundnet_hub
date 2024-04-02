import {Box} from "@mui/system";
import React, {useEffect, useState} from "react";
import CustomAppBar from "./AppBar";
import {List, ListItemButton, ListItemSecondaryAction, ListItemText} from "@mui/material";
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
    GridRowModesModel
} from "@mui/x-data-grid";
import {AlertMessage, AlertSnackbar} from "./AlertSnackbar";
import {omit} from "lodash";

const table_names = ["distinct_event", "distinct_drinks", "readable_history", "drink", "event_attendance_user_mapping", "event_comments", "event_group", "events", "group_user_mapping", "history", "key_holders", "keys", "payments"]
export const SupabaseClient = () => {

    const [selectedTable, setSelectedTable] = useState<typeof table_names[number]>("drink");
    const [selectTableOpen, setSelectTableOpen] = useState(false);
    const client = useClient();
    const [loading, setLoading] = useState(false);
    const [selectedTableData, setSelectedTableData] = useState<any[]>([]);
    const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>({});
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

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

// 'string' | 'number' | 'date' | 'dateTime' | 'boolean' | 'singleSelect' | 'actions';
    function getRowTypeOptions(key: string): {
        type?: GridColType,
        valueOptions?: any[],
        valueGetter?: (params: any) => any,
        editable?: boolean
    } | null {
        switch (key) {
            case "type":
                return {
                    type: "singleSelect", valueOptions: ["Drink", "Special"], editable: true
                }
            case "paymentState":
                return {
                    type: "singleSelect", valueOptions: ["Open", "Fulfilled"], editable: true
                }
            case "state":
                return {
                    type: "singleSelect",
                    valueOptions: ["Declined", "Unanswered", "Waiting", "Attending"],
                    editable: true
                }
            case "recurrence":
                return {
                    type: "singleSelect",
                    valueOptions: ["Weekly", "Fortnightly", "Monthly", "None"],
                    editable: true
                }
            case "role":
                return {
                    type: "singleSelect",
                    valueOptions: ["user", "admin", "procure", "finance", "trainer"],
                    editable: true,
                }
            case "created_at":
            case "lastUpdate":
            case "meetingDateTime":
            case "startingDateTime":
            case "answerDeadline":
            case "endDateTime":
            case "recurrenceEnd":
                return {
                    type: "dateTime",
                    valueGetter: (params) => params.value ? new Date(params.value) : null,
                    editable: true
                };
            case "active":
            case "deleted":
            case "isCancelled":
            case "verified":
            case "disabled":
                return {
                    type: "boolean", editable: true
                }
            case "user":
            case "drink":
            case "event":
            case "group":
            case "payment":
            case "key":
            case "userId":
            case "place":
            default:
                return {editable: false};
        }
    }

    const handleEditClick = (id: GridRowId) => () => {
        setRowModesModel({...rowModesModel, [id]: {mode: GridRowModes.Edit}});
    };

    const handleSaveClick = (id: GridRowId) => () => {
        setRowModesModel({...rowModesModel, [id]: {mode: GridRowModes.View}});
    };

    const handleDeleteClick = (id: GridRowId) => () => {
        setSelectedTableData(selectedTableData.filter((row) => row.id !== id));
    };

    const handleCancelClick = (id: GridRowId) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: {mode: GridRowModes.View, ignoreModifications: true},
        });

        const editedRow = selectedTableData.find((row) => row.id === id);
        if (editedRow!.isNew) {
            setSelectedTableData(selectedTableData.filter((row) => row.id !== id));
        }
    };

    const processRowUpdate = (newRow: GridRowModel) => {
        const updatedRow = {...newRow, isNew: false};
        client.from(selectedTable).upsert(omit(updatedRow, ["isNew"])).then((result) => {
            if (!result.error)
                setSelectedTableData(selectedTableData.map((row) => (row.id === newRow.id ? updatedRow : row)));
            else
                setAlertInfo({message: result.error.message, severity: "error"});
        });
        return updatedRow;
    };

    const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
        setRowModesModel(newRowModesModel);
    };

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
            selectedTableData[0] && <DataGrid columns={[...Object.keys(selectedTableData[0]).map(x => {
                return {
                    field: x,
                    headerName: x,
                    hideable: true,
                    ...getRowTypeOptions(x)
                } as GridColDef;
            }), {
                field: 'actions',
                type: 'actions',
                headerName: 'Actions',
                width: 100,
                cellClassName: 'actions',
                getActions: ({id}) => {
                    const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

                    if (isInEditMode) {
                        return [
                            <GridActionsCellItem
                                icon={<Save/>}
                                label="Save"
                                sx={{
                                    color: 'primary.main',
                                }}
                                onClick={handleSaveClick(id)}
                            />,
                            <GridActionsCellItem
                                icon={<Cancel/>}
                                label="Cancel"
                                className="textPrimary"
                                onClick={handleCancelClick(id)}
                                color="inherit"
                            />,
                        ];
                    }

                    return [
                        <GridActionsCellItem
                            icon={<Edit/>}
                            label="Edit"
                            className="textPrimary"
                            onClick={handleEditClick(id)}
                            color="inherit"
                        />,
                        <GridActionsCellItem
                            icon={<Delete/>}
                            label="Delete"
                            onClick={handleDeleteClick(id)}
                            color="inherit"
                        />,
                    ];
                },
            }]} rows={selectedTableData} editMode={"row"} rowModesModel={rowModesModel} getRowId={getRowId} initialState={{
                pagination: {
                    paginationModel: {
                        pageSize: 50,
                    },
                },
            }} processRowUpdate={processRowUpdate} onRowModesModelChange={handleRowModesModelChange}
                                              onProcessRowUpdateError={(error) => console.log(error)}/>
        }

        <SwipeableDialog open={selectTableOpen} onClose={() => setSelectTableOpen(false)}
                         setOpen={() => setSelectTableOpen(true)} title={"Tablle auswählen"}>
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

        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </Box>
}