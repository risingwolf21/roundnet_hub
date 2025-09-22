import { NumberInput } from '@/components/mui/NumberInput';
import { customEnLocale } from '@/lib/date-fns';
import { supabase } from '@/lib/supabase';
import { formatDateFromDatabase, formatSafeDateToDatabase } from '@/utils';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DialogProps, DialogsProvider } from '@toolpad/core';
import _ from 'lodash';
import { useEffect, useState } from 'react';

import Close from '@mui/icons-material/Close';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type EditEntryDialogPayload = {
  entry: any;
  columns: {
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    foreign_key_schema_name: string;
    foreign_key_table_name: string;
    foreign_key_column_name: string;
  }[];
};

const displayKeysForForeign = (c: {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  foreign_key_schema_name: string;
  foreign_key_table_name: string;
  foreign_key_column_name: string;
}) => {
  switch (true) {
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'user':
      return {
        keys: ['name', 'userId'],
        orderby: 'name',
      };
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'event_group':
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'challenge':
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'drink':
      return {
        keys: ['name', 'id'],
        orderby: 'name',
      };
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'events':
      return {
        keys: ['startingDateTime', 'id'],
        orderby: 'startingDateTime',
      };
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'items':
      return {
        keys: ['name', 'type', 'id'],
        orderby: 'name',
      };
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'payments':
      return {
        keys: ['userId', 'paymentState'],
        orderby: 'userId',
      };
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'event_comments':
      return {
        keys: ['displayName', 'comment'],
        orderby: 'displayName',
      };
    case c.foreign_key_schema_name === 'public' && c.foreign_key_table_name === 'vouchers':
      return {
        keys: ['user', 'title'],
        orderby: 'user',
      };
    default:
      return {
        keys: [],
        orderby: '',
      };
  }
};

const ForeignSelection = ({
  value,
  column,
  onChange,
}: {
  value: any;
  column: {
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    foreign_key_schema_name: string;
    foreign_key_table_name: string;
    foreign_key_column_name: string;
  };
  onChange: (value: any) => void;
}) => {
  const keys = displayKeysForForeign(column);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      // @ts-ignore
      .schema(column.foreign_key_schema_name)
      // @ts-ignore
      .from(column.foreign_key_table_name)
      .select('*')
      .order(keys.orderby)
      .then((result) => {
        if (result.data) {
          setOptions(result.data);
        }
        setLoading(false);
      });
  }, [column, keys]);

  if (loading) {
    return (
      <ListItem>
        <ListItemText primary={<pre>Wird geladen...</pre>} secondary={column.column_name} />
      </ListItem>
    );
  }

  if (options.length <= 0) {
    return (
      <ListItem>
        <ListItemText primary={<pre>{value}</pre>} secondary={column.column_name} />
      </ListItem>
    );
  }

  return (
    <ListItem>
      <ListItemText
        primary={
          <Select fullWidth onChange={(e) => onChange(e.target.value)} value={value ?? 'nothing'}>
            {options.map((y) => (
              <MenuItem value={y[column.foreign_key_column_name]}>
                {JSON.stringify(Object.values(_.pick(y, keys.keys)))}
              </MenuItem>
            ))}
            {!value && <MenuItem value={'nothing'}>Nichts gewählt</MenuItem>}
          </Select>
        }
        secondary={column.column_name}
      />
    </ListItem>
  );
};

const DialogContent = ({ payload, open, onClose }: DialogProps<EditEntryDialogPayload, any | null>) => {
  const [selectOptions, setSelectOptions] = useState<Map<string, any[]>>(new Map());
  const [updatedObject, setUpdatedObject] = useState<any>({});
  const [enums, setEnums] = useState<Map<string, string[]>>(new Map<string, string[]>());

  useEffect(() => {
    supabase
      .rpc('get_enum_types')
      .select('*')
      .then((result) => {
        if (result.data) {
          let loaded = new Map<string, string[]>();
          result.data.forEach((x) => loaded.set(x.enum_name, x.enum_values));
          setEnums(loaded);
        }
      });
  }, []);

  useEffect(() => {
    const fetcher = async () => {
      payload.columns.forEach(async (x) => {
        if (x.foreign_key_schema_name && x.foreign_key_table_name) {
          const result = await supabase
            // @ts-ignore
            .schema(x.foreign_key_schema_name)
            // @ts-ignore
            .from(x.foreign_key_table_name)
            .select('*');

          if (result.data) {
            setSelectOptions(
              selectOptions.set(x.foreign_key_schema_name + '/' + x.foreign_key_table_name, result.data)
            );
          }
        }
      });
    };
    fetcher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.columns]);

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <AppBar sx={{ position: 'sticky', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div"></Typography>
          <Button color="inherit" onClick={() => onClose(updatedObject)}>
            Speichern
          </Button>
        </Toolbar>
      </AppBar>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={customEnLocale}>
        <List>
          {payload.columns.map((x, index) => {
            const value = payload.entry[x.column_name];

            if (x.column_name === 'id') {
              return (
                <ListItem key={x.column_name + index}>
                  <ListItemText primary={<pre style={{ margin: 0 }}>{value}</pre>} secondary={x.column_name} />
                </ListItem>
              );
            }

            if (x.foreign_key_schema_name && x.foreign_key_table_name) {
              return (
                <ForeignSelection
                  value={updatedObject[x.column_name] ?? value}
                  column={x}
                  onChange={(value: any) => {
                    setUpdatedObject({
                      ...updatedObject,
                      [x.column_name]: value,
                    });
                    console.log(updatedObject, value, x.column_name);
                  }}
                />
              );
            }

            if (x.data_type === 'timestamp with time zone') {
              return (
                <ListItem key={x.column_name + index}>
                  {x.is_nullable && (
                    <ListItemAvatar>
                      <Checkbox
                        sx={{ pl: 0 }}
                        checked={(updatedObject[x.column_name] ?? value) !== null}
                        onChange={(_e, c) =>
                          setUpdatedObject({
                            ...updatedObject,
                            [x.column_name]: c ? formatSafeDateToDatabase(Date.now()) : null,
                          })
                        }
                      />
                    </ListItemAvatar>
                  )}
                  <ListItemText
                    primary={
                      <DateTimePicker
                        sx={{ width: '100%' }}
                        disabled={(updatedObject[x.column_name] ?? value) === null}
                        value={formatDateFromDatabase(updatedObject[x.column_name] ?? value)}
                        onChange={(value) =>
                          setUpdatedObject({
                            ...updatedObject,
                            [x.column_name]: formatSafeDateToDatabase(value),
                          })
                        }
                      />
                    }
                    secondary={x.column_name}
                  />
                </ListItem>
              );
            }

            if (x.data_type === 'numeric' || x.data_type === 'bigint') {
              return (
                <ListItem key={x.column_name + index}>
                  {x.is_nullable && (
                    <ListItemAvatar>
                      <Checkbox
                        sx={{ pl: 0 }}
                        checked={(updatedObject[x.column_name] ?? value) !== null}
                        onChange={(_e, c) =>
                          setUpdatedObject({
                            ...updatedObject,
                            [x.column_name]: c ? 0 : null,
                          })
                        }
                      />
                    </ListItemAvatar>
                  )}
                  <ListItemText
                    primary={
                      <NumberInput
                        fullWidth
                        value={updatedObject[x.column_name] ?? value}
                        disabled={(updatedObject[x.column_name] ?? value) === null}
                        onValueChange={(val) => {
                          if (val && val >= 0)
                            setUpdatedObject({ ...updatedObject, [x.column_name]: val ?? 0 });
                        }}
                      />
                    }
                    secondary={x.column_name}
                  />
                </ListItem>
              );
            }

            if (x.data_type === 'boolean') {
              return (
                <ListItem key={x.column_name + index}>
                  <ListItemText
                    primary={
                      <Checkbox
                        sx={{ pl: 0 }}
                        checked={
                          (updatedObject[x.column_name] ?? value) !== null && (updatedObject[x.column_name] ?? value)
                        }
                        onChange={(_e, c) =>
                          setUpdatedObject({
                            ...updatedObject,
                            [x.column_name]: c,
                          })
                        }
                      />
                    }
                    secondary={x.column_name}
                  />
                </ListItem>
              );
            }

            if (x.data_type === 'text') {
              return (
                <ListItem key={x.column_name + index}>
                  {x.is_nullable && (
                    <ListItemAvatar>
                      <Checkbox
                        sx={{ pl: 0 }}
                        checked={
                          (updatedObject[x.column_name] ?? value) !== null &&
                          (updatedObject[x.column_name] ?? value) !== ''
                        }
                        onChange={(_e, c) =>
                          setUpdatedObject({
                            ...updatedObject,
                            [x.column_name]: c ? '' : null,
                          })
                        }
                      />
                    </ListItemAvatar>
                  )}
                  <ListItemText
                    primary={
                      <TextField
                        fullWidth
                        multiline
                        value={updatedObject[x.column_name] ?? value}
                        onChange={(e) => setUpdatedObject({ ...updatedObject, [x.column_name]: e.target.value })}
                        variant="standard"
                        margin="normal"
                      />
                    }
                    secondary={x.column_name}
                  />
                </ListItem>
              );
            }

            if (x.data_type.startsWith('ENUM')) {
              const enumType = x.data_type.split(',')[1];
              return (
                <ListItem>
                  {x.is_nullable && (
                    <ListItemAvatar>
                      <Checkbox
                        sx={{ pl: 0 }}
                        checked={(updatedObject[x.column_name] ?? value) !== null}
                        onChange={(_e, c) =>
                          setUpdatedObject({
                            ...updatedObject,
                            [x.column_name]: c ? (enums.get(enumType)?.entries()?.next()?.value?.[1] ?? null) : null,
                          })
                        }
                      />
                    </ListItemAvatar>
                  )}
                  <ListItemText
                    primary={
                      <Select
                        fullWidth
                        onChange={(e) => setUpdatedObject({ ...updatedObject, [x.column_name]: e.target.value })}
                        value={updatedObject[x.column_name] ?? value ?? ''}
                      >
                        {enums.get(enumType)?.map((y) => <MenuItem value={y}>{y}</MenuItem>)}
                        <MenuItem value={''}></MenuItem>
                      </Select>
                    }
                    secondary={x.column_name}
                  />
                </ListItem>
              );
            }

            return (
              <ListItem key={x.column_name + index}>
                {x.is_nullable && (
                  <ListItemAvatar>
                    <Checkbox
                      sx={{ pl: 0 }}
                      checked={(updatedObject[x.column_name] ?? value) !== null}
                      onChange={(_e, c) =>
                        setUpdatedObject({
                          ...updatedObject,
                          [x.column_name]: c ? 0 : null,
                        })
                      }
                    />
                  </ListItemAvatar>
                )}
                <ListItemText primary={<pre style={{ margin: 0 }}>{value}</pre>} secondary={x.column_name} />
              </ListItem>
            );
          })}
        </List>
      </LocalizationProvider>
    </Dialog>
  );
};

export const EditEntryDialog = (props: DialogProps<EditEntryDialogPayload, any | null>) => {
  return (
    <DialogsProvider>
      <DialogContent {...props} />
    </DialogsProvider>
  );
};
