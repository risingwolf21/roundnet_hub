import {AccountCircle, ArrowBack, ThumbDownOffAlt, ThumbUpOffAlt} from "@mui/icons-material";
import {
    AppBar,
    Avatar,
    Box,
    Card,
    CardContent,
    CardHeader,
    CardMedia,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    TextField,
    Toolbar,
    Typography
} from "@mui/material";
import React from "react";
import {useNavigate} from "react-router-dom";

const LoadingEventInfo = () => {
    const navigate = useNavigate();
    return <Box
        sx={{
            width: "100%",
            direction: "column",
            alignItems: "center",
            justifyContent: "center"
        }}>
        <AppBar position="sticky" sx={{zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary"}}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => navigate(-1)}
                    edge="start"
                    sx={{mr: 2}}>
                    <ArrowBack/>
                </IconButton>
                <Typography variant="h6" component="div" sx={{flexGrow: 1}}/>
                <IconButton color="inherit" onClick={() => navigate("/user")}>
                    <AccountCircle/>
                </IconButton>
            </Toolbar>
        </AppBar>

        <Box sx={{justifyContent: "space-between", display: "flex", flexDirection: "column"}}>
            <Box>
                <Box pl={1} pr={1}>
                    <Card sx={{mt: 2, mb: 2, p: 0}} variant="elevation" elevation={3}>
                        <CardMedia sx={{maxHeight: "15%", borderRadius: 5}}>
                            <Box sx={{width: "100%", maxHeight: "15%", alignSelf: "center"}}>
                                <Box
                                    style={{width: "100%", height: "200px", borderRadius: "16px", background: "#eee"}}>
                                </Box>
                            </Box>
                        </CardMedia>
                        <CardHeader title={"..."} subheader={"....."}/>

                        <CardContent sx={{'&.MuiCardContent-root': {paddingBottom: 1}}}>

                            <Typography sx={{fontSize: 16, fontWeight: "bold"}} color="text.secondary" gutterBottom>
                                Beschreibung
                            </Typography>
                            <Typography pb={1}>........</Typography>
                        </CardContent>
                    </Card>

                    <Card sx={{mt: 2, mb: 2, pb: 0}} variant="elevation" elevation={3}>
                        <CardContent sx={{'&.MuiCardContent-root': {paddingBottom: 1}}}>
                            <Typography sx={{fontSize: 16, fontWeight: "bold"}} color="text.secondary" gutterBottom>
                                Teilnehmer
                            </Typography>
                            <List sx={{p: 0}}>
                                <ListItem key={"attendEvent"} sx={{'&.MuiListItem-root': {paddingLeft: 0}}}
                                          secondaryAction={<IconButton disabled>
                                              <ThumbUpOffAlt fontSize="inherit" sx={{fontSize: "28px"}}/>
                                          </IconButton>}>
                                    <ListItemAvatar>
                                        <CircularProgress size={"20px"}/>
                                    </ListItemAvatar>
                                    <ListItemText primary={"0 zusagen"}/>
                                </ListItem>
                                <Divider/>
                                <ListItem key={"declineEvent"} sx={{'&.MuiListItem-root': {paddingLeft: 0}}}
                                          secondaryAction={<IconButton disabled>
                                              <ThumbDownOffAlt fontSize="inherit" sx={{fontSize: "28px"}}/>
                                          </IconButton>}>
                                    <ListItemAvatar
                                        sx={{justifyContent: "left", alignItems: "center", display: "flex"}}>
                                        <CircularProgress size={"20px"}/>
                                    </ListItemAvatar>
                                    <ListItemText primary={"0 absagen"}/>
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>

                    <Card sx={{mt: 2, mb: 2, pb: 0}} variant="elevation" elevation={3}>
                        <CardContent sx={{'&.MuiCardContent-root': {paddingBottom: 1}}}>
                            <Typography sx={{fontSize: 16, fontWeight: "bold"}} color="text.secondary" gutterBottom>
                                Kommentare 0
                            </Typography>
                            <ListItem dense sx={{'&.MuiListItem-root': {paddingLeft: 0}}}>
                                <ListItemAvatar>
                                    <Avatar sx={{width: 25, height: 25}}>
                                        <Typography fontSize={12}>?</Typography>
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText>
                                    <TextField
                                        fullWidth
                                        disabled
                                        placeholder="Write a comment..."
                                        sx={{
                                            width: "100%",
                                            '& fieldset': {borderRadius: "30px"},
                                            '& input': {pt: 0, pb: 0},
                                            '& .MuiInputBase-input.Mui-disabled': {
                                                WebkitTextFillColor: "#000000",
                                            },
                                        }}/>
                                </ListItemText>
                            </ListItem>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    </Box>
}

export default LoadingEventInfo;