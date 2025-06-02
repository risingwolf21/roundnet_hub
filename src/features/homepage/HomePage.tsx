import { Box, List, Typography } from "@mui/material"
import { withProfiler } from "@sentry/react"
import { useNotifications } from "@toolpad/core/useNotifications"
import React from "react"
import Layout from "src/components/Layout"
import { useFetchMode } from "src/hooks/useFetchMode"
import { useDrinks, useInsertHistoryEntryMutation } from "src/tanstack/drinks"
import { useEvents, useUpdateAttendanceMutation } from "src/tanstack/events"
import { useAuthentication } from "../auth/AuthContext"
import { useAllItems } from 'src/tanstack/items';
import { DrinkCard } from "./DrinkCard"
import { EventCard } from "./EventCard"
import { ItemCard } from "./ItemCard"
import { LoadingDrinkCard } from "./LoadingDrinkCard"
import { LoadingEventCard } from "./LoadingEventCard"
import { LoadingItemCard } from "./LoadingItemCard"
import { PullToRefresh } from "src/components/pull-to-refresh/PullToRefresh"

const HomePage = () => {

    const [fetchMode] = useFetchMode();

    const { user } = useAuthentication();
    const { data: drinks = [], isLoading: isDrinksLoading, refetch: refetchDrinks } = useDrinks();
    const { data: events = [], isLoading: isEventsLoading, refetch: refetchEvents } = useEvents(fetchMode);
    const { data: items = [], isLoading: isItemsLoading, refetch: refetchItems } = useAllItems();
    const notifications = useNotifications();

    const updateAttendance = useUpdateAttendanceMutation(fetchMode);
    const updateHistory = useInsertHistoryEntryMutation(user.userId);

    return <Layout>
        <PullToRefresh onRefresh={() => {
            refetchDrinks();
            refetchEvents();
            refetchItems();
        }}>
            <List sx={{ pb: 10 }}>
                <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: "bold" }}>
                    Events
                </Typography>
                <Box
                    sx={{
                        display: "flex",
                        overflowX: "auto",
                        gap: 2,
                        padding: 1,
                    }}
                >
                    {
                        isEventsLoading
                            ? Array.from({ length: 5 }, (v, k) => k + 1).map(x => <LoadingEventCard />)
                            : events.slice(0, 5).map((event, index) => <EventCard
                                index={index}
                                user={user}
                                event={event}
                                updateAttendance={(user, event, newState) => {
                                    updateAttendance.mutate({ user, event, newState })
                                }} />
                            )
                    }
                </Box>
                <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: "bold" }}>
                    Getränke
                </Typography>
                <Box
                    sx={{
                        display: "flex",
                        overflowX: "auto",
                        gap: 2,
                        padding: 1,
                    }}
                >
                    {
                        isDrinksLoading
                            ? Array.from({ length: 5 }, (v, k) => k + 1).map(x => <LoadingDrinkCard index={x} />)
                            : drinks.filter((x: Drink) => !x.deleted && x.active && x.type === "Drink").map((drink, index) => (
                                <DrinkCard index={index} drink={drink} insertHistory={(drink) => updateHistory.mutate(drink, {
                                    onSuccess: () => {
                                        notifications.show("Getränk erfolgreich gebucht!", { severity: "success", autoHideDuration: 1500 })
                                    },
                                    onError: (error) => {
                                        notifications.show(`Getränk konnte nicht gebucht werden. ${error.message}`, { severity: "error" })
                                    }
                                })
                                } />
                            ))
                    }
                </Box>
                <Typography variant="h6" sx={{ mx: 2, mt: 2, fontWeight: "bold" }}>
                    Schlüssel
                </Typography>
                <Box
                    sx={{
                        display: "flex",
                        overflowX: "auto",
                        gap: 2,
                        padding: 1,
                    }}
                >
                    {
                        isItemsLoading
                            ? Array.from({ length: 5 }, (v, k) => k + 1).map(x => <LoadingItemCard index={x} />)
                            : items
                                .map((item, index) => <ItemCard index={index} item={item} user={user} />)
                    }
                </Box>
            </List>
        </PullToRefresh>
    </Layout >
}
export default withProfiler(HomePage);