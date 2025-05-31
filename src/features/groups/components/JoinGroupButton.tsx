import { Button } from "@mui/material";
import React from "react";
import { useJoinGroup } from "src/tanstack/groups";

export const JoinGroupButton = ({ group, user }: { group: Group, user: User }) => {

  const joinGroup = useJoinGroup(group.id, user, group.need_request_to_join ? "joinRequested" : "user")

  return <Button
    disabled={joinGroup.isPending}
    onClick={(event) => {
      joinGroup.mutate();
      event.stopPropagation();
    }}
  >
    {
      joinGroup.isPending ? "Tritt bei..." :
        group.need_request_to_join ? "Beitritt anfragen" : "Beitreten"
    }
  </Button>
}