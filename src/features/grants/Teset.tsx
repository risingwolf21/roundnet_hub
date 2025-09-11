import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from 'src/components/services/supabase/supabaseClient'
// MUI
import {
  AppBar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  Button,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ShieldIcon from '@mui/icons-material/Security'
import GroupIcon from '@mui/icons-material/Groups'
import KeyIcon from '@mui/icons-material/VpnKey'
import { useGrants } from '../auth/GrantsContext'

const GLOBAL_TENANT = '00000000-0000-0000-0000-000000000000'

type GrantKind = 'perm' | 'feat'
interface DirectGrantRow { user: string; tenant: string; kind: GrantKind; key: string }
interface EffectiveGrantRow { user: string; kind: GrantKind; key: string; granted_by: 'group' | 'direct' }
interface PermissionRow { name: string }
interface FeatureRow { name: string }
interface GroupRow { id: string; name: string; color?: string | null }
interface GroupPermissionRow { group: string; permission: string }
interface GroupFeatureRow { group: string; feature: string }

function useAuthUid() {
  const [uid, setUid] = React.useState<string | null>(null)
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      setUid(data.user?.id ?? null)
    })()
  }, [])
  return uid
}

function useIsGrantsAdmin() {
  const uid = useAuthUid()
  const { data } = useQuery({
    queryKey: ['authorize', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('authorize', { requested_permission: 'grants.manage' })
      if (error) return false
      return Boolean(data)
    },
  })
  return Boolean(data)
}

function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async (): Promise<PermissionRow[]> => {
      const { data, error } = await supabase.from('permissions').select('name').order('name')
      if (error) throw error
      return data as PermissionRow[]
    },
  })
}

function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: async (): Promise<FeatureRow[]> => {
      const { data, error } = await supabase.from('features').select('name').order('name')
      if (error) throw error
      return data as FeatureRow[]
    },
  })
}

function useDirectGrants(userId: string, tenant = GLOBAL_TENANT) {
  return useQuery({
    queryKey: ['direct-grants', userId, tenant],
    enabled: !!userId,
    queryFn: async (): Promise<DirectGrantRow[]> => {
      const { data, error } = await supabase
        .from('user_direct_grants')
        .select('user, tenant, kind, key')
        .eq('user', userId)
        .eq('tenant', tenant)
      if (error) throw error
      return data as DirectGrantRow[]
    },
  })
}

function useEffectiveGrants(userId: string) {
  return useQuery({
    queryKey: ['effective-grants', userId],
    enabled: !!userId,
    queryFn: async (): Promise<EffectiveGrantRow[]> => {
      const { data, error } = await supabase
        .from('user_grants')
        .select('user, kind, key, granted_by')
        .eq('user', userId)
      if (error) throw error
      return data as EffectiveGrantRow[]
    },
  })
}

async function fetchAdminGroupsFor(uid: string): Promise<GroupRow[]> {
  const { data: maps, error: e1 } = await supabase
    .from('group_user_mapping')
    .select('group')
    .eq('user', uid)
    .eq('role', 'admin')
  if (e1) throw e1
  const groupIds = (maps || []).map((m: any) => m.group)
  if (groupIds.length === 0) return []
  const { data: groups, error: e2 } = await supabase
    .from('event_group')
    .select('id, name, color')
    .in('id', groupIds)
  if (e2) throw e2
  return groups as GroupRow[]
}

function useGroupsICanAdmin() {
  const uid = useAuthUid()
  return useQuery({
    queryKey: ['groups-i-admin', uid],
    enabled: !!uid,
    queryFn: async () => fetchAdminGroupsFor(uid as string),
  })
}

function useGroupPermissions(groupId?: string) {
  return useQuery({
    queryKey: ['group-perms', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupPermissionRow[]> => {
      const { data, error } = await supabase
        .from('group_permissions')
        .select('group, permission')
        .eq('group', groupId as string)
      if (error) throw error
      return data as GroupPermissionRow[]
    },
  })
}

function useGroupFeatures(groupId?: string) {
  return useQuery({
    queryKey: ['group-feats', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupFeatureRow[]> => {
      const { data, error } = await supabase
        .from('group_features')
        .select('group, feature')
        .eq('group', groupId as string)
      if (error && (error as any).code === '42P01') return []
      if (error) throw error
      return data as GroupFeatureRow[]
    },
  })
}

// Mutations via SECURITY DEFINER RPCs
function useGrantUserGrants() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { user: string; tenant?: string; perms?: string[]; feats?: string[] }) => {
      const { user, tenant = GLOBAL_TENANT, perms = [], feats = [] } = args
      const { error } = await supabase.rpc('grant_user_grants', {
        p_user: user,
        p_tenant: tenant,
        p_perms: perms,
        p_feats: feats,
      })
      if (error) throw error
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ['direct-grants', vars.user] })
      qc.invalidateQueries({ queryKey: ['effective-grants', vars.user] })
    },
  })
}

function useRevokeUserGrants() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { user: string; tenant?: string; removePerms?: string[]; removeFeats?: string[] }) => {
      const { user, tenant = GLOBAL_TENANT, removePerms = [], removeFeats = [] } = args
      const { error } = await supabase.rpc('revoke_user_grants', {
        p_user: user,
        p_tenant: tenant,
        p_perms: removePerms,
        p_feats: removeFeats,
      })
      if (error) throw error
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ['direct-grants', vars.user] })
      qc.invalidateQueries({ queryKey: ['effective-grants', vars.user] })
    },
  })
}

function useGrantGroupPermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { group: string; perms?: string[]; feats?: string[] }) => {
      const { group, perms = [], feats = [] } = args
      const { error } = await supabase.rpc('grant_group_grants', { p_group: group, p_perms: perms, p_feats: feats })
      if (error) throw error
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ['group-perms', vars.group] })
      qc.invalidateQueries({ queryKey: ['group-feats', vars.group] })
    },
  })
}

function useRevokeGroupPermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { group: string; removePerms?: string[]; removeFeats?: string[] }) => {
      const { group, removePerms = [], removeFeats = [] } = args
      const { error } = await supabase.rpc('revoke_group_grants', { p_group: group, p_perms: removePerms, p_feats: removeFeats })
      if (error) throw error
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ['group-perms', vars.group] })
      qc.invalidateQueries({ queryKey: ['group-feats', vars.group] })
    },
  })
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

const DirectGrantsPanel: React.FC<{ targetUserId: string }> = ({ targetUserId }) => {
  const { data: perms, isLoading: l1 } = usePermissions()
  const { data: feats, isLoading: l2 } = useFeatures()
  const { data: direct, isLoading: l3 } = useDirectGrants(targetUserId)
  const grant = useGrantUserGrants()
  const revoke = useRevokeUserGrants()
  const [snack, setSnack] = React.useState<string | null>(null)

  const directPerms = new Set((direct || []).filter(d => d.kind === 'perm').map(d => d.key))
  const directFeats = new Set((direct || []).filter(d => d.kind === 'feat').map(d => d.key))

  const onTogglePerm = async (key: string, on: boolean) => {
    try { on ? await grant.mutateAsync({ user: targetUserId, perms: [key] }) : await revoke.mutateAsync({ user: targetUserId, removePerms: [key] }) }
    catch (e: any) { setSnack(e.message || 'Fehler beim Setzen der Permission') }
  }
  const onToggleFeat = async (key: string, on: boolean) => {
    try { on ? await grant.mutateAsync({ user: targetUserId, feats: [key] }) : await revoke.mutateAsync({ user: targetUserId, removeFeats: [key] }) }
    catch (e: any) { setSnack(e.message || 'Fehler beim Setzen des Features') }
  }

  return (
    <Card variant="outlined">
      <CardHeader avatar={<KeyIcon />} title="Direkte Berechtigungen" sx={{ py: 1.5 }} />
      {(l1 || l2 || l3) && <LinearProgress />}
      <CardContent>
        <Typography variant="overline" color="text.secondary">Permissions</Typography>
        <List dense>
          {(perms || []).map(p => (
            <ListItem key={p.name} secondaryAction={<Switch edge="end" checked={directPerms.has(p.name)} onChange={(_, on) => onTogglePerm(p.name, on)} />}> 
              <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={p.name} />
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
        <Typography variant="overline" color="text.secondary">Features</Typography>
        <List dense>
          {(feats || []).map(f => (
            <ListItem key={f.name} secondaryAction={<Switch edge="end" checked={directFeats.has(f.name)} onChange={(_, on) => onToggleFeat(f.name, on)} />}> 
              <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={f.name} />
            </ListItem>
          ))}
        </List>
      </CardContent>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Card>
  )
}

const EffectiveGrantsPanel: React.FC<{ targetUserId: string }> = ({ targetUserId }) => {
  const { data: effective, isLoading } = useEffectiveGrants(targetUserId)
  const perms = (effective || []).filter(r => r.kind === 'perm')
  const feats = (effective || []).filter(r => r.kind === 'feat')

  return (
    <Card variant="outlined">
      <CardHeader avatar={<ShieldIcon />} title="Effektiv (Gruppen ∪ Direkt)" sx={{ py: 1.5 }} />
      {isLoading && <LinearProgress />}
      <CardContent>
        <Typography variant="overline" color="text.secondary">Permissions</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 1 }}>
          {perms.map(p => (
            <Chip key={p.key} label={p.key} color={p.granted_by === 'group' ? 'default' : 'primary'} size="small" />
          ))}
          {perms.length === 0 && <Typography variant="body2" color="text.secondary">Keine</Typography>}
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography variant="overline" color="text.secondary">Features</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 1 }}>
          {feats.map(f => (
            <Chip key={f.key} label={f.key} color={f.granted_by === 'group' ? 'default' : 'primary'} size="small" />
          ))}
          {feats.length === 0 && <Typography variant="body2" color="text.secondary">Keine</Typography>}
        </Box>
      </CardContent>
    </Card>
  )
}

const GroupGrantsPanel: React.FC<{ targetUserId: string }> = () => {
  const { data: myAdminGroups, isLoading } = useGroupsICanAdmin()

  return (
    <Card variant="outlined">
      <CardHeader avatar={<GroupIcon />} title="Gruppen (du verwaltest)" sx={{ py: 1.5 }} />
      {isLoading && <LinearProgress />}
      <CardContent>
        <List dense>
          {(myAdminGroups || []).map(g => (
            <ListItem key={g.id}
              secondaryAction={<GroupEditorDialog group={g} />}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: g.color ?? 'text.secondary', mr: 1.25 }} />
              <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={g.name} />
            </ListItem>
          ))}
        </List>
        {(myAdminGroups || []).length === 0 && (
          <Typography variant="body2" color="text.secondary">Du bist in keiner Gruppe mit Rolle <b>admin</b>.</Typography>
        )}
      </CardContent>
    </Card>
  )
}

const GroupEditorDialog: React.FC<{ group: GroupRow }> = ({ group }) => {
  const { data: perms } = usePermissions()
  const { data: feats } = useFeatures()
  const { data: currentPerms } = useGroupPermissions(group.id)
  const { data: currentFeats } = useGroupFeatures(group.id)
  const grant = useGrantGroupPermissions()
  const revoke = useRevokeGroupPermissions()

  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState('')
  const curPermKeys = new Set((currentPerms || []).map(p => p.permission))
  const curFeatKeys = new Set((currentFeats || []).map(f => f.feature))
  const [snack, setSnack] = React.useState<string | null>(null)

  const onTogglePerm = async (key: string, on: boolean) => {
    try { on ? await grant.mutateAsync({ group: group.id, perms: [key] }) : await revoke.mutateAsync({ group: group.id, removePerms: [key] }) }
    catch (e: any) { setSnack(e.message || 'Fehler beim Aktualisieren der Gruppen-Permission') }
  }
  const onToggleFeat = async (key: string, on: boolean) => {
    try { on ? await grant.mutateAsync({ group: group.id, feats: [key] }) : await revoke.mutateAsync({ group: group.id, removeFeats: [key] }) }
    catch (e: any) { setSnack(e.message || 'Fehler beim Aktualisieren der Gruppen-Features') }
  }

  const filterMatch = (k: string) => k.toLowerCase().includes(filter.toLowerCase())

  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>Verwalten</Button>
      <Dialog fullScreen open={open} onClose={() => setOpen(false)}>
        <AppBar sx={{ position: 'sticky' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setOpen(false)} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              {group.name}
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogTitle>Gruppe verwalten</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Suchen…" value={filter}
            onChange={(e) => setFilter(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">🔎</InputAdornment>,
            }}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="overline" color="text.secondary">Permissions</Typography>
            <List dense>
              {(perms || []).filter(p => filterMatch(p.name)).map(p => (
                <ListItem key={p.name} secondaryAction={
                  <Switch edge="end" checked={curPermKeys.has(p.name)} onChange={(_, on) => onTogglePerm(p.name, on)} />
                }>
                  <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={p.name} />
                </ListItem>
              ))}
            </List>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box>
            <Typography variant="overline" color="text.secondary">Features</Typography>
            <List dense>
              {(feats || []).filter(f => filterMatch(f.name)).map(f => (
                <ListItem key={f.name} secondaryAction={
                  <Switch edge="end" checked={curFeatKeys.has(f.name)} onChange={(_, on) => onToggleFeat(f.name, on)} />
                }>
                  <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={f.name} />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={() => setOpen(false)}>Fertig</Button>
        </Box>
        <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ''} />
      </Dialog>
    </>
  )
}

export function GrantsManager() {
  const {user} = useGrants();
  const isAdmin = useIsGrantsAdmin()
  const [tab, setTab] = React.useState(0)

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <KeyIcon />
        <Typography variant="h6">Berechtigungen verwalten</Typography>
      </Box>

      {!isAdmin && (
        <Card sx={{ borderColor: 'warning.light', bgcolor: 'warning.50', mb: 2 }} variant="outlined">
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="body2">Du benötigst <code>grants.manage</code> oder entsprechende Admin-Rechte, um Grants zu ändern. Anzeigen ist möglich.</Typography>
          </CardContent>
        </Card>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="grant tabs" variant="fullWidth">
          <Tab icon={<ShieldIcon />} iconPosition="start" label="Effektiv" />
          <Tab icon={<KeyIcon />} iconPosition="start" label="Direkt" />
          <Tab icon={<GroupIcon />} iconPosition="start" label="Gruppen" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        <EffectiveGrantsPanel targetUserId={user.userId} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <DirectGrantsPanel targetUserId={user.userId} />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <GroupGrantsPanel targetUserId={user.userId} />
      </TabPanel>
    </Container>
  )
}
