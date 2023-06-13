import { useSelector } from "react-redux";
import { isEmpty, isLoaded } from "react-redux-firebase";
import AuthScreen from "./components/AuthScreen";
import { CircularProgress, Grid, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";

const AuthGate = ({ children }) => {
    const auth = useSelector(state => state.firebase.auth)

    if (!isLoaded(auth)) {
        return <Grid>
            <CustomAppBar logout={() => { }} drawerOpen={false} handleMenuClick={() => { }} />
            <Toolbar />
            <Grid
                container
                spacing={0}
                direction="column"
                alignItems="center"
                justifyContent="center"
                style={{ minHeight: '100vh' }}>
                <CircularProgress />
            </Grid>
        </Grid>
    } else if (!isEmpty(auth)) {
        return children;
    } else {
        return <AuthScreen />
    }
}

export default AuthGate;