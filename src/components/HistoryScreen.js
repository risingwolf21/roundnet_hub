import { Grid, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from "@mui/material"
import moment from "moment/moment";
import { Loading } from "./Loading";
import { Error } from "./Error";
import { groupBy } from "../utils";
import { useSelector } from "react-redux";
import { useState } from "react";
import { useEffect } from "react";

const HistoryItem = ({ items, header }) => {
    return <List dense component={"div"} disablePadding subheader={<ListSubheader component="div" id="nested-list-subheader">{header}</ListSubheader>}>
        {
            items.map((item, index) => <ListItem dense key={"sublist" + index}>
                <ListItemAvatar>
                    <Typography>{item.count} x</Typography>
                </ListItemAvatar>
                <ListItemText primary={item.drink?.name} secondary={moment(new Date(item.created_at)).format("HH:mm")} />
                <ListItemSecondaryAction>
                    <Typography>{item.count * item.drink?.price} €</Typography>
                </ListItemSecondaryAction>
            </ListItem>)
        }
    </List>
}

const HistoryScreen = () => {
    const { items: history, loading, error } = useSelector((state) => state.history);
    const { items: drinks } = useSelector((state) => state.drinks);

    const [historyItems, setHistoryItems] = useState([]);

    useEffect(() => {
        let mappedEntries = history.map(x => {
            return {
                ...x,
                drink: drinks.find(y => y.id === x.drinkId)
            }
        });
        setHistoryItems(mappedEntries);
    }, [history, drinks]);

    if (loading)
        return <Loading />
    if (error)
        return <Error message={error} />

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ overflow: "auto" }}>
        {
            historyItems && <List sx={{ width: "100%" }} >
                {
                    Object.entries(groupBy(historyItems.filter(x => x.drink), x => moment(new Date(x.created_at)).format("DD MMMM yyyy")))
                        .map((x) => <HistoryItem key={x[0]} items={x[1]} header={x[0]} />)
                }
                {
                    historyItems.filter(x => !x.drink).length > 1 && <ListItem>
                        <ListItemText>Es gibt {historyItems.filter(x => x.drink).length} Einträge bei welchen eine Zuweisung nicht geschehen konnte. Bitte wende dich an den Administrator!</ListItemText>
                    </ListItem>
                }
            </List>
        }
    </Grid>
}

export default HistoryScreen