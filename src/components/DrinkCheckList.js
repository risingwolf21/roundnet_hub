import { Button, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper } from "@mui/material";
import { useEffect } from "react";
import { connect } from "react-redux";
import { compose } from "redux";
import { createStructuredSelector } from "reselect";
import { loadDrinks } from "../redux/actions";
import firebase from "firebase/compat/app";
import { firestoreConnect, isLoaded } from "react-redux-firebase";
import logo from '../images/coca_cola_logo.svg';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { useTheme } from '@mui/material/styles';


const DrinkCheckList = ({ dispatch, drinks }) => {
    const theme = useTheme();

    return <Paper elevation={3} sx={{ display: "inline-block" }}>
        <Grid>
            {
                isLoaded(drinks) && drinks.map(drink => {
                    return <Card sx={{ display: 'flex' }}>

                        <CardMedia
                            component="img"
                            sx={{ width: 151 }}
                            image="/static/images/cards/live-from-space.jpg"
                            alt="Live from space album cover"
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flex: '1 0 auto' }}>
                                <Typography component="div" variant="h5">
                                    Coca Cola
                                </Typography>
                                <Typography variant="subtitle1" color="text.secondary" component="div">
                                    Preis: 1.5€
                                </Typography>
                            </CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, pb: 1 }}>
                                <IconButton aria-label="previous">
                                    {theme.direction === 'rtl' ? <SkipNextIcon /> : <SkipPreviousIcon />}
                                </IconButton>
                                <IconButton aria-label="play/pause">
                                    <PlayArrowIcon sx={{ height: 38, width: 38 }} />
                                </IconButton>
                                <IconButton aria-label="next">
                                    {theme.direction === 'rtl' ? <SkipPreviousIcon /> : <SkipNextIcon />}
                                </IconButton>
                            </Box>
                        </Box>
                    </Card>
                })
            }
        </Grid>
        <List>
            {
                isLoaded(drinks) && drinks.map(drink => <ListItem divider secondaryAction={
                    <IconButton edge="end" aria-label="delete">
                        <AddIcon />
                    </IconButton>
                }>
                    <ListItemAvatar>
                        <img src={logo} alt="logo" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText>{drink.name}</ListItemText>
                </ListItem>)
            }
        </List>
    </Paper>
}

export default compose(
    firestoreConnect(() => ['drinks']),
    connect((state) => ({
        drinks: state.firestore.ordered.drinks
    }))
)(DrinkCheckList);