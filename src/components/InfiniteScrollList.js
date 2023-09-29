import { Alert, List, Snackbar } from "@mui/material";
import { isUndefined } from "lodash";
import { useEffect } from "react";
import { useRef, useState } from "react";

export const InfiniteScrollList = ({ children, fetch, error, loading, endReached }) => {

    const [snackbarOpen, setSnackbarOpen] = useState(isUndefined(error));
    const observerTarget = useRef(null);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    useEffect(() => {
        let pagesCounter = 1
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
                <Alert onClose={handleClose} severity={"error"} sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        }
    </div>
}