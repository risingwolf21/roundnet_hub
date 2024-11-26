import {Voucher} from "../../../types/supabaseTypes";
import {Avatar, Card, CardHeader} from "@mui/material";
import React from "react";
import Grid from "@mui/material/Grid2";
import {WorkspacePremium} from "@mui/icons-material";

type VoucherProps = {
    vouchers: Voucher[]
}

const VoucherCard = ({vouchers}: VoucherProps) => {

    let total = vouchers.reduce((p, a) => p + a.total_drinks, 0);
    let used = vouchers.reduce((p, a) => p + a.used_drinks, 0);

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
                Array.from({length: total - used}, (v, k) => k + 1).map(x => <Grid>
                    <Avatar sx={{borderRadius: 2, width: "60px", height: "60px"}}>
                        <WorkspacePremium fontSize={"large"}/>
                    </Avatar>
                </Grid>)
            }
        </Grid>
    </Card>
}

export default VoucherCard;