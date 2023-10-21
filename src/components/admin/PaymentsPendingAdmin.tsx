import { AppBar, Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, Grid, IconButton, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Toolbar, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check"
import { useState } from "react";
import { FULFILLED } from "../../constants";
import { Error } from "../Error";
import { useClient } from "react-supabase";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminsPaymentsAsync } from "../../redux/adminPaymentsSlice";
import { ArrowBack, Refresh } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import { Search, SearchIconWrapper, StyledInputBase } from "../SearchBar";
import { useNavigate } from "react-router-dom";
import React from "react";
import { useAppDispatch } from "../..";
import { RootState } from "../../redux/store";
import { Payment, FullPayment } from "../../types/supabaseTypes";

const PaymentsPendingAdmin = () => {

    const [open, setOpen] = useState(false);
    const [currentPayment, setPayment] = useState<FullPayment | null>(null);
    const [searchString, setSearchString] = useState("");
    const client = useClient();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { payments, error, loading } = useSelector((state: RootState) => state.adminPayments);

    useEffect(() => {
        dispatch(fetchAdminsPaymentsAsync({ client }));
    }, [client, dispatch]);

    if (error)
        return <Error message={error} />

    const selectedPayment = (payment: FullPayment) => {
        setPayment(payment);
        setOpen(true);
    }

    const confirmPayment = (payment: FullPayment | null) => {
        if (!payment)
            return;
        client.from("payments").update({ state: FULFILLED }).eq("userId", payment?.user?.userId).then(res => {
            setOpen(false);
        });
    }

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <AppBar position="sticky">
            <Toolbar>
                <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    onClick={() => navigate(-1)}>
                    <ArrowBack />
                </IconButton>
                <Search>
                    <SearchIconWrapper>
                        <SearchIcon />
                    </SearchIconWrapper>
                    <StyledInputBase
                        placeholder="Search…"
                        onChange={(e) => setSearchString(e.target.value)}
                        inputProps={{ 'aria-label': 'search' }}
                    />
                </Search>
            </Toolbar>
        </AppBar>
        {
            loading && <LinearProgress style={{ position: "fixed", left: 0, top: 56, right: 0 }} />
        }
        {
            (payments && payments.length > 1) && <List sx={{ width: "100%", pt: 0 }}>
                {
                    Object.values(payments)
                        .filter(x => searchString === "" || (x.user?.displayName ?? "").toLowerCase().includes(searchString.toLowerCase()))
                        .map((x, index) => {
                            return <ListItem key={x.user.email} divider={index < Object.values(payments).length - 1}>
                                <ListItemAvatar>
                                    <Typography fontWeight={"bold"}>{x.history.reduce((prev, curr) => prev + (curr.amount ?? 0), 0)} €</Typography>
                                </ListItemAvatar>
                                <ListItemText primary={x.user?.displayName ?? x.user.email} secondary={x.user.displayName ? "Benutzername" : "Email"} />
                                <ListItemSecondaryAction >
                                    <IconButton onClick={() => selectedPayment(x)}>
                                        <CheckIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        })
                }
            </List>
        }
        {
            payments && payments.length < 1 && <Grid
                container
                spacing={0}
                direction="column"
                alignItems="center"
                justifyContent="center"
                style={{ minHeight: '100vh' }}>
                <Typography>Keine aktiven Zahlungen gefunden</Typography>
            </Grid>
        }
        <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "72px" }} onClick={() => dispatch(fetchAdminsPaymentsAsync({ client }))}>
            <Refresh sx={{ color: "white" }} />
        </Fab>
        <Dialog open={open} onClose={() => setOpen(false)} title="Zahlung bestätigen">
            <DialogTitle id="alert-dialog-title">
                {"Zahlung bestätigen"}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    Hiermit bestätigst du, dass
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment?.user?.displayName}`}
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment?.user?.email}`}
                </Typography>
                <Typography>
                    eine Zahlung in Höhe von
                </Typography>
                <Typography fontWeight={"bold"}>
                    {`${currentPayment?.history?.reduce((prev, curr) => prev + (curr.amount ?? 0), 0)} €`}
                </Typography>
                <Typography>
                    getätigt hat.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={() => confirmPayment(currentPayment)} autoFocus>
                    Bestätigen
                </Button>
            </DialogActions>
        </Dialog>
    </Grid>

}

export default PaymentsPendingAdmin