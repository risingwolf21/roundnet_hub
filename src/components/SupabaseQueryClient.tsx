import {Box} from "@mui/system";
import React, {useEffect, useState} from "react";
import CustomAppBar from "./AppBar";
import {Button, List, ListItemButton, ListItemSecondaryAction, ListItemText} from "@mui/material";
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

export const SupabaseQueryClient = () => {

    const [loading, setLoading] = useState(false);

    return <Box>
        <CustomAppBar navigateBack/>
        <LoadingIndicator loading={loading}/>
    </Box>
}