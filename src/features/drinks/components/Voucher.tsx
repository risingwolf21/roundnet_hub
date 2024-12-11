import {Avatar, Chip, List, ListItem, ListItemAvatar, ListItemText, ListSubheader} from '@mui/material';
import React, {useEffect} from 'react';
import {useSelector} from 'react-redux';
import {RootState, useAppDispatch} from '../../../redux/store';
import {fetchVouchersAsync} from '../slices/drinksSlice';
import {useAuth} from '../../auth/AuthContext';
import {Redeem} from "@mui/icons-material";

const VoucherCard = () => {
    const user = useAuth();
    const {vouchers} = useSelector((state: RootState) => state.drinks);
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchVouchersAsync(user.userId));
    }, [dispatch, user]);

    return (
        <List subheader={<ListSubheader
            sx={{zIndex: '-1', fontWeight: 'bold', lineHeight: 'normal', my: 1}}
            id="nested-list-subheader">
            Gutscheine
        </ListSubheader>}>
            {
                vouchers.map(x => <ListItem key={x.id}
                                            secondaryAction={<Chip color={"secondary"} label={x.available}/>}>
                    <ListItemAvatar>
                        <Avatar sx={{background: '#88AEBF', width: 40, height: 40, borderRadius: 2}}>
                            <Redeem/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={x.title}/>
                </ListItem>)
            }
        </List>
    );
};

export default VoucherCard;
