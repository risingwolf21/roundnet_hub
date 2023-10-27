import { Grid, LinearProgress } from "@mui/material";
import { useSelector } from "react-redux";
import CustomAppBar from "../AppBar";
import React, { useEffect, useState } from "react";
import { useClient } from "react-supabase";
import { groupBy } from "../../utils";
import { RootState } from "../../redux/store";
import { TABLE_HISTORY } from "../../constants";

type DrinkStockType = {
    count: number,
    amount: number,
    created_at: string,
    drink: { id: number, name: string, price: number, stock: number },
    user: { displayName: string }
}

const AnalyzeDrinkStockHistory = () => {

    const { loading } = useSelector((state: RootState) => state.adminDrinks);
    const [mappedHistory, setMappedHistory] = useState<Map<string, any[]>>();
    const client = useClient();

    useEffect(() => {
        client
            .from(TABLE_HISTORY)
            .select("count, amount, created_at, drink (id, name, price, stock), user(displayName)")
            .returns<DrinkStockType[]>()
            .order('id', { ascending: false })
            .then(result => {
                setMappedHistory(groupBy(result.data ?? [], x => x.drink.id.toString()))
            })
    }, [client, mappedHistory]);

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack />
        {loading && <LinearProgress style={{ position: "fixed", left: 0, right: 0, top: 56 }} />}
        {/* <List sx={{ width: "100%" }}>
            {
                drinks && drinks.filter(x => x.active).map((drink, index) => <>
                    <ListItem key={index}>
                        <ListItemAvatar>
                            <Avatar>
                                {
                                    drink.imageUrl
                                        ? <img src={drink.imageUrl} alt="logo" width={40} height={40} />
                                        : <LocalDrink />
                                }
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={drink.name} />
                    </ListItem>
                    {
                        mappedHistory && mappedHistory[drink.id] && <LineChart
                            height={300}
                            xAxis={[{ data: mappedHistory[drink.id].map(x => x.stock) }]}
                            series={[
                                {
                                    data: mappedHistory[drink.id].map(x => x.stock),
                                },
                            ]} />
                    }
                </>)
            }
        </List> */}
        {/* 
        <PieChart
            series={[
                {
                    data: Object.values(mappedHistory).map((x, index) => { return { id: index, value: x.length, label: x[0].drink.name } })
                },
            ]}
            width={400}
            height={200} /> */}

    </Grid>

}

export default AnalyzeDrinkStockHistory;