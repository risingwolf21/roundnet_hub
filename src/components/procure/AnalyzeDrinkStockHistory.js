import { Avatar, Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemText } from "@mui/material";
import { useSelector } from "react-redux";
import CustomAppBar from "../AppBar";
import { LocalDrink } from "@mui/icons-material";
import { LineChart } from "@mui/x-charts";

const AnalyzeDrinkStockHistory = () => {

    const { drinks, loading } = useSelector(state => state.adminDrinks);

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack />
        {loading && <LinearProgress style={{ position: "fixed", left: 0, right: 0, top: 56 }} />}
        <List sx={{ width: "100%" }}>
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
                    <LineChart
                        height={300}
                        xAxis={[{ data: [1, 2, 3, 5, 8, 10] }]}
                        series={[
                            {
                                data: [2, 5.5, 2, 8.5, 1.5, 5],
                            },
                        ]} />
                </>)
            }
        </List>

    </Grid>

}

export default AnalyzeDrinkStockHistory;