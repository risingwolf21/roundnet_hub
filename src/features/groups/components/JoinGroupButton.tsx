import { Button } from "@mui/material";
import { useJoinGroup } from "../query/joinGroupMutation";
import React from "react";

export const JoinGroupButton = ({ group, user }: { group: Group, user: User }) => {

  const joinGroup = useJoinGroup(group.id, user, group.need_request_to_join ? "joinRequested" : "user")

  return <Button
    disabled={joinGroup.isPending}
    onClick={(event) => {
      event.stopPropagation();
      joinGroup.mutate();
    }}
  >
    {
      joinGroup.isPending ? "Tritt bei..." :
        group.need_request_to_join ? "Beitritt anfragen" : "Beitreten"
    }
  </Button>
}