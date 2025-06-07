import { Add, Delete } from '@mui/icons-material';
import {
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Switch
} from '@mui/material';
import { useNotifications } from '@toolpad/core/useNotifications';
import _ from 'lodash';
import React, { useState } from 'react';
import { useAddGroupFeature, useGroupFeatures, useRemoveGroupFeature, useUpdateGroupFeature } from 'src/tanstack/group_feature';
import { FullGroupFeature } from 'src/types/supabaseTypes';
import Layout from '../../components/layout/Layout';
import { SwipeableDialog } from '../../components/SwipeableDialog';


const ALL_FEATURES = ["drinks", "events", "items", "challenges", "games", "events.constellations"]

const GroupFeatureList = () => {
  const notifications = useNotifications();

  const [addFeatureOpen, setAddFeatureOpen] = useState<{ title: string, group: string, values: string[] } | null>(null);

  const { data = [] } = useGroupFeatures();

  const updateGroupFeature = useUpdateGroupFeature();
  const removeGroupFeature = useRemoveGroupFeature();
  const addGroupFeature = useAddGroupFeature();

  const removeFeature = (value: FullGroupFeature) => {
    removeGroupFeature.mutate({
      group: value.group,
      feature: value.feature,
      is_enabled: value.is_enabled
    }, {
      onError: (error) => notifications.show(error.message, { severity: "error" })
    })
  }

  const addFeature = (group: string, feature: Feature, is_enabled: boolean) => {
    addGroupFeature.mutate({
      group: group,
      feature: feature,
      is_enabled: is_enabled
    }, {
      onError: (error) => notifications.show(error.message, { severity: "error" })
    })
  }

  const updateFeature = (value: FullGroupFeature, is_enabled: boolean) => {
    updateGroupFeature.mutate({
      group: value.group,
      feature: value.feature,
      is_enabled: is_enabled
    }, {
      onError: (error) => notifications.show(error.message, { severity: "error" })
    })
  }

  return (
    <Layout>
      <List sx={{ pb: 10 }}>
        {Object.entries(
          _.groupBy(
            data,
            (x) => x.fullGroup.name
          )
        )
          .filter(([_key, value]) => value.length > 0)
          .map(([key, value]) => {
            return <List
              key={key}
              subheader={
                <ListSubheader sx={{ fontWeight: 'bold', fontSize: '16pt' }}>{key}</ListSubheader>
              }
            >
              {value
                .sort((a, b) => a.feature.localeCompare(b.feature))
                .map((x) => {
                  return (
                    <ListItem
                      key={x.feature + x.group}
                      divider
                      secondaryAction={
                        <IconButton onClick={() => removeFeature(x)}>
                          <Delete />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <Switch
                          disableRipple
                          tabIndex={-1}
                          checked={x.is_enabled}
                          onChange={(e) => updateFeature(x, e.target.checked)} />
                      </ListItemIcon>
                      <ListItemText primary={x.feature} />
                    </ListItem>
                  );
                })}
              <ListItemButton
                key={key + ' add'}
                onClick={() => {
                  setAddFeatureOpen({
                    title: key,
                    group: value.reduce((p, c) => p = c.fullGroup.name, ''),
                    values: ALL_FEATURES.filter(
                      (y) =>
                        !value
                          .map((x) => x.feature)
                          .includes(y as Feature)
                    ),
                  });
                }}
              >
                <ListItemAvatar>
                  <Add />
                </ListItemAvatar>
                <ListItemText primary={'Hinzufügen'} />
              </ListItemButton>
            </List>
          })}
      </List>
      {
        addFeatureOpen && <SwipeableDialog
          title={`Berechtigung zu "${addFeatureOpen?.title}" hinzufügen`}
          open={addFeatureOpen !== null}
          onClose={() => setAddFeatureOpen(null)}
        >
          {addFeatureOpen &&
            addFeatureOpen.values.map((x) => (
              <ListItemButton
                key={x}
                divider
                onClick={() => {
                  addFeature(
                    addFeatureOpen.group,
                    x as Feature,
                    true
                  )
                  setAddFeatureOpen(null);
                }}
              >
                <ListItemText primary={x} />
              </ListItemButton>
            ))}
        </SwipeableDialog>
      }
    </Layout>
  );
};
export default GroupFeatureList;