import { Button } from "@mui/material";
import { captureException } from "@sentry/react";
import { useNotifications } from "@toolpad/core";
import React from "react";
import { useJoinGroup } from "src/tanstack/groups";

export const JoinGroupButton = ({ group, user }: { group: Group, user: User }) => {

  const notifications = useNotifications();
  const joinGroup = useJoinGroup(group.id, user, group.need_request_to_join ? "joinRequested" : "user")

  return <Button
    disabled={joinGroup.isPending}
    onClick={(event) => {
      joinGroup.mutate(undefined, {
        onError: (e) => {
          captureException(e);
          console.log(e)
          notifications.show("Der Gruppe konnte nicht beigetreten werden.", { severity: "error" });
        }
      });
      event.stopPropagation();
    }}
  >
    {
      joinGroup.isPending ? "Tritt bei..." :
        group.need_request_to_join ? "Beitritt anfragen" : "Beitreten"
    }
  </Button>
}