import { Liquor, List, CalendarToday } from "@mui/icons-material"
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material"
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { onModeChange } from "../redux/applicationReducer";

const CustomBottomNavigation = () => {

    let navigate = useNavigate();
    let dispatch = useDispatch();

    const tabs = [
        {
            label: "Getränke",
            path: "drinks",
            index: 0,
            icon: <Liquor />
        },
        {
            label: "Training",
            path: "training",
            index: 1,
            icon: <CalendarToday />
        },
        {
            label: "Browse",
            path: "browse",
            index: 2,
            icon: <List />
        }
    ];

    const [tab, setTab] = useState(tabs.findIndex(x => "/" + x.path === window?.location?.pathname));

    const handleChange = (event, newValue) => {
        setTab(newValue);
        navigate(tabs[newValue].path, { replace: true });
        dispatch(onModeChange(tabs[newValue].path));
    }

    return <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation
            showLabels
            value={tab}
            onChange={handleChange}>
            {
                tabs.map(x => <BottomNavigationAction key={x.label} label={x.label} icon={x.icon} />)
            }
        </BottomNavigation>
    </Paper>
}

export default CustomBottomNavigation;