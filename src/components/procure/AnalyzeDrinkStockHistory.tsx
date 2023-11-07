import { Box, Card, CardContent, Grid, LinearProgress, Paper, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import CustomAppBar from "../AppBar";
import React, { useEffect, useState } from "react";
import { useClient } from "react-supabase";
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { groupBy } from "../../utils";
import { RootState } from "../../redux/store";
import { useDependency } from "../../hooks/useDependency";
import { IDrinkRepository } from "../../repository/IDrinkRepository";
import { AxisConfig, ChartsXAxisProps } from "@mui/x-charts/models/axis";

export type DrinkStockType = {
    count: number,
    amount: number,
    created_at: string,
    drink: { id: number, name: string, price: number, stock: number },
    user: { displayName: string }
}

type AnalyzeDrinkStockHistoryProps = {
    drinksRepository: IDrinkRepository,
    loading: boolean
}

export const AnalyzeDrinkStockHistoryProvider = () => {
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const { loading } = useSelector((state: RootState) => state.adminDrinks);

    if (!drinksRepository)
        return;

    return <AnalyzeDrinkStockHistory drinksRepository={drinksRepository} loading={loading} />
}

const AnalyzeDrinkStockHistory = ({ drinksRepository, loading }: AnalyzeDrinkStockHistoryProps) => {
    const [mappedHistory, setMappedHistory] = useState<Map<string, DrinkStockType[]>>();
    const [sevenDayHistory, setSevenDayHistory] = useState<Map<string, DrinkStockType[]>>();

    useEffect(() => {
        drinksRepository.fetchHistoryStockType().then(result => {
            setMappedHistory(groupBy(result.data ?? [], x => x.drink.id.toString()))
        });
    }, [drinksRepository]);

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
        <Box sx={{ width: "100%" }}>
            <Card sx={{ m: 2, borderRadius: 3 }}>
                <CardContent>
                    <Typography sx={{ fontSize: 16, pb: 1, fontWeight: "bold" }} gutterBottom>
                        Getränkenutzung
                    </Typography>
                    {
                        mappedHistory && <PieChart
                            height={175}
                            width={300}
                            slotProps={{
                                legend: {
                                    direction: "column",
                                    position: { vertical: "top", horizontal: "right" },
                                    padding: 0
                                }
                            }}
                            series={[
                                {
                                    data: [...Array.from(mappedHistory).map((entry) => { return { label: entry[1][0].drink.name, value: entry[1].reduce((prev, curr) => prev + curr.count, 0) ?? 0 } })],
                                    innerRadius: 15,
                                    outerRadius: 75,
                                    paddingAngle: 5,
                                    cornerRadius: 5,
                                    cx: 75,
                                    cy: 75,
                                }]}
                        />
                    }
                </CardContent>
            </Card>
        </Box>
    </Grid>

}