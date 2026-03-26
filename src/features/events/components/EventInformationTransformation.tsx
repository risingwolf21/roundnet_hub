import { useEventTransformationApplication } from "@/tanstack/events"
import { EventsUserView } from "@/types/supabaseTypes"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Container from "@mui/material/Container"

export const EventInformationTransformation = ({ event }: { event: EventsUserView }) => {

  const { data: application = null } = useEventTransformationApplication(event.id);

  return <Container>
    <Card elevation={3} sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
      <CardContent sx={{ p: 0 }}>

      </CardContent>
    </Card>
  </Container>
}