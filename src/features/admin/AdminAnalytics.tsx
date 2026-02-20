import Layout from "@/components/layout/Layout"
import { useAdminAnalytics } from "@/tanstack/admin"
import Close from "@mui/icons-material/Close"
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import Stack from "@mui/system/Stack"
import { DataGrid } from "@mui/x-data-grid/DataGrid"
import { GridColDef } from "@mui/x-data-grid/models"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { DialogProps, useDialogs } from "@toolpad/core"
import { add } from "date-fns"
import { useState } from "react"
import { NoRowsOverlay } from "../supabase/SupabaseClient"

const ADMIN_FUNCTONS: { title: string, rpc: RpcName }[] = [
  {
    title: "Anmeldungen pro Nutzer",
    rpc: "admin_attendance_leaderboard"
  }
]

export const AdminAnalytics = () => {
  const dialogs = useDialogs();

  const [from, setFrom] = useState(() => add(new Date(), { years: -1 }));
  const [to, setTo] = useState(() => new Date());

  const [selectedRpc, setSelectedRpc] = useState(ADMIN_FUNCTONS[0])

  const { data, isLoading } = useAdminAnalytics(selectedRpc.rpc, from, to);

  const onSelectRpc = async () => {
    const result = await dialogs.open(SelectRpcDialog, { functions: ADMIN_FUNCTONS });
    if (result) {
      setSelectedRpc(result)
    }
  }

  return <Layout>
    <ListItem dense onClick={onSelectRpc} secondaryAction={<ExpandMoreOutlined />}>
      <ListItemText
        primary={selectedRpc.title ?? 'Nicht gewählt'}
        secondary={selectedRpc.rpc ?? 'Nicht gewählt'}
      />
    </ListItem>

    <Stack direction={"row"} sx={{ p: 1 }} spacing={1}>
      <DatePicker
        format="dd.MM.yyyy"
        value={from}
        onChange={(v) => v && setFrom(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDay()))}
        formatDensity="dense"
        slotProps={{
          textField: {
            size: "small"
          },
        }} />
      <DatePicker
        format="dd.MM.yyyy"
        value={to}
        onChange={(v) => v && setTo(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDay()))}
        formatDensity="dense"
        slotProps={{
          textField: {
            size: "small"
          },
        }} />
    </Stack>

    <DataGrid
      sx={{
        '--DataGrid-overlayHeight': '300px',
        mb: 'min(56px,env(safe-area-inset-bottom))',
        maxHeight: 'calc(100% - 61px - 56px - env(safe-area-inset-bottom))',
        height: 'calc(100% - 61px - 56px - env(safe-area-inset-bottom))',
      }}
      slots={{ noRowsOverlay: NoRowsOverlay }}
      rows={data ?? []}
      columns={Object.keys((data && data.length > 0 ? data[0] : {})).map(x =>
        ({ field: x, headerName: x, width: 150 }) as GridColDef
      )}
      loading={isLoading}
      getRowId={(row) => Object.values(row).join("_")}
      rowCount={data?.length}
      disableRowSelectionOnClick
    />
  </Layout>
}

const SelectRpcDialog = ({ payload, open, onClose }: DialogProps<{ functions: { title: string, rpc: RpcName }[] }, { title: string, rpc: RpcName } | null>) => {
  return (
    <Dialog
      open={open}
      onClose={() => onClose(null)}
      scroll={'paper'}
      sx={{
        '.MuiDialog-container > .MuiPaper-root': {
          margin: 0,
          maxHeight: '75vh',
          minHeight: `40vh`,
          width: '100%',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
        },
        '.MuiDialog-container': {
          position: 'absolute',
          m: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          alignItems: 'end',
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="close drawer"
            onClick={() => onClose(null)}
            edge="start"
            sx={{ mr: 2 }}
          >
            <Close />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Funktion auswählen
          </Typography>
        </Toolbar>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <List>
          {
            payload.functions.map((x) => <ListItemButton
              divider
              key={x.rpc}
              onClick={() => {
                onClose(x);
              }}
            >
              <ListItemText primary={x.title} secondary={x.rpc} />
            </ListItemButton>)
          }
        </List>
      </DialogContent>
    </Dialog>
  );
};