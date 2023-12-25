export type UserTag = {
    tag: string
    label: string
}

export default <UserTag[]>[
    {
        tag: "eventComments",
        label: "Event Kommentare"
    },
    {
        tag: "eventCancellation",
        label: "Event abgesagt"
    },
    {
        tag: "eventUpdate",
        label: "Event aktualisiert"
    },
    {
        tag: "eventWaitingListMoveUp",
        label: "Eventteilnahme nach Warteliste"
    },
    {
        tag: "userRegistration",
        label: "Benutzer-Registrierung"
    },
    {
        tag: "paymentRequest",
        label: "Zahlungsaufforderung"
    }
];