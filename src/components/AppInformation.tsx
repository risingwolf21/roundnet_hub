import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import Layout from "./layout/Layout";

import { iOS } from "@/utils";
import translations from "../translation/locales/translation.de.json";

const AppInformation = () => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const t = (key: string) => translate(`help.${key}`)

  return <Layout appBarConfig={{ title: "Hilfe und Informationen" }}>
    <List sx={{ mx: 2, mb: "env(safe-area-inset-bottom)" }}>
      <List subheader={<ListSubheader sx={{ m: 0, p: 0 }}>Inhalt dieser Seite</ListSubheader>}>
        <ListItemButton dense href="#refresh">
          <ListItemText primary={t("titles.refresh")} />
        </ListItemButton>
        <ListItemButton dense href="#installation">
          <ListItemText primary={t("titles.installation")} />
        </ListItemButton>
        <ListItemButton dense href="#groups">
          <ListItemText primary={t("titles.groups")} />
        </ListItemButton>
        <ListItemButton dense href="#events">
          <ListItemText primary={t("titles.events")} />
        </ListItemButton>
        <ListItemButton dense href="#faq">
          <ListItemText primary={t("titles.faq")} />
        </ListItemButton>
      </List>
      <Divider />
      <Typography id="refresh" variant="h6" sx={{ fontWeight: 'bold', mt: 2 }}>
        {t("titles.refresh")}
      </Typography>

      <ul>
        <li>{t("pullToRefresh")}</li>
        <li>{t("refreshApplication")}</li>
      </ul>

      <Typography id="installation" variant="h6" sx={{ fontWeight: 'bold', mt: 2 }}>
        {t("titles.installation")}
      </Typography>
      {
        iOS
          ? <ol>
            <li>{t("openShareMenuIOS")}</li>
            <li>{t("clickAddToHomeScreen")}</li>
            <li>{t("confirmName")}</li>
            <li>{t("clickAdd")}</li>
          </ol>
          : <ol>
            <li>{t("openMenuAndroid")}</li>
            <li>{t("clickInstallApp")}</li>
            <li>{t("confirmInstallation")}</li>
          </ol>
      }
      <Typography sx={{ mt: 1 }}>{t("updateAvailable")}</Typography>
      <Typography id="groups" variant="h6" sx={{ fontWeight: 'bold', mt: 2 }}>
        {t("titles.groups")}
      </Typography>
      <ol>
        <li>{t("navigateToGroups")}</li>
        <li>{t("listAllGroups")}</li>
        <li>{t("joinGroup")}</li>
      </ol>
      <div style={{ justifyContent: "center", width: "100%", display: "flex", marginTop: "16px" }}>
        <Button variant="contained" onClick={() => navigate("/groups/list")}>Zu den Gruppen</Button>
      </div>
      <Typography sx={{ mt: 1 }}>{t("eventsFromGroupInfo")}</Typography>
      <Typography sx={{ mt: 1 }}>{t("challengesFromGroupInfo")}</Typography>
      <Typography id="events" variant="h6" sx={{ fontWeight: 'bold', mt: 2 }}>
        {t("titles.events")}
      </Typography>
      <ol>
        <li>{t("navigateToEvents")}</li>
        <li>{t("listAllEvents")}</li>
        <li>{t("eventInformation")}</li>
      </ol>
      <Typography sx={{ mt: 1 }}>{t("eventComments")}</Typography>
      <Typography sx={{ mt: 1 }}>{t("eventAttendance")}</Typography>
      <Typography sx={{ mt: 1 }}>{t("eventMap")}</Typography>
      <Typography id="faq" variant="h6" sx={{ fontWeight: "bold", my: 1 }}>{t("titles.faq")}</Typography>
      {
        Object.entries(translations.help.faq).map(([key]) => <Accordion key={key}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{t(`faq.${key}.title`)}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>{t(`faq.${key}.answer`)}</Typography>
          </AccordionDetails>
        </Accordion>)
      }

    </List>
  </Layout>
}

export default AppInformation;