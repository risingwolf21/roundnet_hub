import { Alert, List, Snackbar, SnackbarCloseReason } from "@mui/material";
import React from "react";
import { useEffect } from "react";
import { useRef, useState } from "react";

type InfiniteScrollListProps = {
    fetch: (page: number) => any,
    error: string,
    loading: boolean,
    endReached: boolean,
    children: any
}

export const InfiniteScrollList = ({ children, fetch, error, loading, endReached }: InfiniteScrollListProps) => {

    const [snackbarOpen, setSnackbarOpen] = useState(error !== "");
    const observerTarget = useRef(null);

    const handleClose = (event: Event | React.SyntheticEvent<any, Event>, reason: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleAlertClose = (event: React.SyntheticEvent<Element, Event>) => setSnackbarOpen(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        let pagesCounter = 0
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !endReached && !loading) {
                    fetch(pagesCounter)
                    pagesCounter++
                }
            },
            { threshold: 1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [observerTarget]);

    return <div style={{ width: "100%" }}>
        <List sx={{ overflowY: "auto" }}>
            {children}
            <div ref={observerTarget}></div>
        </List>
        {
            <Snackbar sx={{ position: "absolute", right: "16px", bottom: "16px" }} open={snackbarOpen} onClose={handleClose}>
                <Alert onClose={handleAlertClose} severity={"error"} sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        }
    </div>
}