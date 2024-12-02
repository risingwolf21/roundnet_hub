import {Avatar, Card, CardHeader} from "@mui/material";
import React, {useEffect} from "react";
import Grid from "@mui/material/Grid2";
import {WorkspacePremium} from "@mui/icons-material";
import {useSelector} from "react-redux";
import {RootState, useAppDispatch} from "../../../redux/store";
import {fetchVouchersAsync} from "../slices/drinksSlice";
import {useAuth} from "../../auth/AuthContext";


const VoucherCard = () => {

    const user = useAuth();
    const {vouchers} = useSelector((state: RootState) => state.drinks);
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchVouchersAsync(user.userId));
    }, [dispatch, user]);

    let total = vouchers.reduce((p, a) => p + a.total_drinks, 0);
    let used = vouchers.reduce((p, a) => p + a.used_drinks, 0);

    if (!vouchers || vouchers.length === 0 || total - used === 0) return null;

    return <Card elevation={4} sx={{m: 2, pb: 2}}>
        <CardHeader sx={{pt: 0, pb: 0}} titleTypographyProps={{fontSize: "14pt"}}
                    title={"Getränke-Gutscheine"}></CardHeader>
        {/*<ListItem secondaryAction={<Typography sx={{ml: 2}}>{`${used} / ${total}`}</Typography>}>
            <ListItemAvatar>
                <Typography fontSize={"26pt"}>🏅</Typography>
            </ListItemAvatar>
            <ListItemText primary={<LinearProgress sx={{flexGrow: 1, height: "20px", borderRadius: "10px", mr: 2}}
                                                   variant={"determinate"}
                                                   value={(used / total) * 100}/>}>

            </ListItemText>
        </ListItem>*/}
        <Grid container rowSpacing={2} columnSpacing={2}>
            {
                Array.from({length: total - used}, (v, k) => k + 1).map(x => <Grid key={x}>
                    <Avatar sx={{borderRadius: 2, width: "60px", height: "60px"}}>
                        <WorkspacePremium fontSize={"large"}/>
                    </Avatar>
                </Grid>)
            }
        </Grid>
    </Card>
}

export default VoucherCard;