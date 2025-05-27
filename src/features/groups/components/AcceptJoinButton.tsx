import { Button } from "@mui/material"
import { useNotifications } from "@toolpad/core"
import React from "react"
import { useAcceptRequestMutation } from "../query/acceptRequestMutation"

export const AcceptJoinButton = ({ group, user }: { group: Group, user: User }) => {

  const notifications = useNotifications();
  const acceptJoinMutation = useAcceptRequestMutation(group);

  return <Button
    onClick={() => acceptJoinMutation.mutate(user, {
      onError: (error) => {
        notifications.show("Anfrage konnte nicht akzeptiert werden. " + error.message, { severity: "error" })
      },
      onSuccess: () => {
        notifications.show("Anfrage erfolgreich akzeptiert.", { severity: "success" })
      }
    })}>
    {
      acceptJoinMutation.isPending ? "Wird akzeptiert..." : "Akzeptieren"
    }
  </Button>
}