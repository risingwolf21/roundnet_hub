import CustomAppBar from "../AppBar";
import {Grid, LinearProgress, List, ListItem, ListItemText} from "@mui/material";
import React, {useEffect} from "react";
import {RootState, useAppDispatch} from "../../redux/store";
import {challengeSelector, fetchChallengesAsync} from "../../redux/challengeSlice";
import {Challenge} from "../../types/supabaseTypes";
import {useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";

const ChallengeListProvider = () => {
    const dispatch = useAppDispatch();
    const challenges = useSelector((state: RootState) => challengeSelector.selectAll(state));

    useEffect(() => {
        dispatch(fetchChallengesAsync());
    }, [dispatch]);

    return <ChallengeList loading={false} challenges={challenges}/>
}

type ChallengeListProps = {
    loading: boolean,
    challenges: Challenge[]
}

const ChallengeList = ({loading, challenges}: ChallengeListProps) => {
    const navigate = useNavigate();
    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack/>
        {
            loading && <LinearProgress sx={{position: "fixed", top: 56, left: 0, right: 0}}/>
        }
        <List sx={{width: "100%"}}>
            {
                challenges.map(entry => <ListItem key={entry.id} onClick={() => navigate("/challenges/" + entry.id)}>
                    <ListItemText primary={entry.name} secondary={entry.description}/>
                </ListItem>)
            }
        </List>
    </Grid>
}

export default ChallengeListProvider;