import Layout from "../../components/Layout";
import React, {useEffect, useState} from "react";
import {AdminPermissionsRepository} from "../../repository/AdminPermissionsRepository";
import {AlertMessage, AlertSnackbar} from "../../components/AlertSnackbar";
import _ from "lodash";
import {
    Fab,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    ListSubheader
} from "@mui/material";
import {Add, Delete, Restore, Save} from "@mui/icons-material";
import {TablesInsert} from "../../types/supabase-generated.types";
import {SwipeableDialog} from "../../components/SwipeableDialog";
import {allAppPermissions} from "../../utils";
import {supabase} from "../../components/services/supabase/supabaseClient";

export const PermissionList = () => {
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
    const [permissions, setPermissions] = useState<RolePermissions[]>([]);

    const [markedToDelete, setMarkedToDelete] = useState<RolePermissions[]>([]);
    const [addedPermissions, setAddedPermissions] = useState<TablesInsert<'role_permissions'>[]>([]);
    const [addPermissionsOpen, setAddPermissionsOpen] = useState<{ key: AppRole, value: AppPermission[] } | null>(null);

    const savePermissions = async () => {
        for (const x of markedToDelete) {
            await supabase.from("role_permissions")
                .delete()
                .eq("permission", x.permission)
                .eq("role", x.role)
                .eq("id", x.id);
        }
        await supabase.from("role_permissions")
            .insert(addedPermissions)
    }

    const markDeleted = (x: RolePermissions | TablesInsert<'role_permissions'>) => {
        if (!x.id) {
            setAddedPermissions(addedPermissions.filter(y => !(y.role === x.role && y.permission === x.permission)))
            return;
        }
        if (markedToDelete.includes(x as RolePermissions))
            setMarkedToDelete(markedToDelete.filter(y => y.id !== x.id))
        else
            setMarkedToDelete([...markedToDelete, x as RolePermissions])
    }

    useEffect(() => {
        AdminPermissionsRepository.fetchPermissions().then(result => {
            setPermissions(result.data);
        }).catch(error => setAlertInfo({message: error.message, severity: "error"}))
    }, []);

    return <Layout appBarConfig={{showBackButton: true}}>
        <List>
            {
                Object.entries(_.groupBy([...permissions, ...addedPermissions], (x) => x.role)).map(([key, value]) =>
                    <List
                        subheader={<ListSubheader>{key}</ListSubheader>}>
                        {
                            value.map((x) => {
                                let deleted = x.id ? markedToDelete.includes(x as RolePermissions) : false;
                                let added = !x.id;
                                return <ListItem
                                    sx={{backgroundColor: deleted ? "indianred" : added ? "lightgreen" : "white"}}
                                    key={x.permission} divider
                                    secondaryAction={<IconButton onClick={() => markDeleted(x)}>
                                        {
                                            deleted ? <Restore/> : <Delete/>
                                        }
                                    </IconButton>}>
                                    <ListItemText primary={x.permission}/>
                                </ListItem>
                            })
                        }
                        <ListItemButton key={key + " add"} onClick={() => {
                            setAddPermissionsOpen({
                                key: key as AppRole,
                                value: allAppPermissions.filter(y => !value.map(x => x.permission).includes(y))
                            });
                        }}>
                            <ListItemAvatar>
                                <Add/>
                            </ListItemAvatar>
                            <ListItemText primary={"Hinzufügen"}/>
                        </ListItemButton>
                    </List>)
            }
        </List>
        <SwipeableDialog title={`Berechtigung zu "${addPermissionsOpen?.key}" hinzufügen`}
                         open={addPermissionsOpen !== null}
                         onClose={() => setAddPermissionsOpen(null)}>
            {
                addPermissionsOpen && addPermissionsOpen.value.map((x) => <ListItemButton
                    key={x} divider onClick={() => {
                    setAddedPermissions([...addedPermissions, {
                        role: addPermissionsOpen.key,
                        permission: x
                    }]);
                    setAddPermissionsOpen(null);
                }}>
                    <ListItemText primary={x}/>
                </ListItemButton>)
            }
        </SwipeableDialog>
        {
            (markedToDelete.length > 0 || addedPermissions.length > 0) && <Fab variant={"extended"}
                                                                               color={"primary"}
                                                                               sx={{
                                                                                   color: "#fff",
                                                                                   backgroundColor: (theme) => theme.palette.primary.main,
                                                                                   position: "fixed",
                                                                                   right: "16px",
                                                                                   bottom: "56px",
                                                                                   mb: "16px"
                                                                               }}
                                                                               onClick={savePermissions}>
                <Save sx={{color: "white", mr: 1}}/>
                Speichern
            </Fab>
        }
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </Layout>
}