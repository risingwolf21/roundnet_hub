import { Box, Card, CardContent, Grid, LinearProgress, Typography } from "@mui/material";
import { PieChart } from '@mui/x-charts/PieChart';
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useDependency } from "../../hooks/useDependency";
import { RootState } from "../../redux/store";
import { IDrinkRepository } from "../../repository/IDrinkRepository";
import { groupBy } from "../../utils";
import { AlertSnackbar } from "../AlertSnackbar";
import CustomAppBar from "../AppBar";

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

const AnalyzeDrinkStockHistoryProvider = () => {
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const { loading } = useSelector((state: RootState) => state.adminDrinks);

    if (!drinksRepository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    return <AnalyzeDrinkStockHistory drinksRepository={drinksRepository} loading={loading} />
}

const AnalyzeDrinkStockHistory = ({ drinksRepository, loading }: AnalyzeDrinkStockHistoryProps) => {
    const [mappedHistory, setMappedHistory] = useState<Map<string, DrinkStockType[]>>();

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

export default AnalyzeDrinkStockHistoryProvider;