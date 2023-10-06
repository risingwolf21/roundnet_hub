import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { IconButton } from "@mui/material";
import { useNavigate } from 'react-router-dom';
import { AccountCircle, ArrowBack } from '@mui/icons-material';
import { useSelector } from 'react-redux';

const CustomAppBar = ({ navigateBack = false, title = "Roundnet Karlsruhe" }) => {
    const navigate = useNavigate();
    const { user } = useSelector(state => state.application);

    return <AppBar position="sticky" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary" }}>
        <Toolbar>
            {
                navigateBack && <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => navigate(-1)}
                    edge="start"
                    sx={{ mr: 2 }}>
                    <ArrowBack />
                </IconButton>
            }
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                {title}
            </Typography>
            {
                user?.id && <IconButton color="inherit" onClick={() => navigate("/user")}>
                    <AccountCircle />
                </IconButton>
            }
        </Toolbar>
    </AppBar>
}

export default CustomAppBar;