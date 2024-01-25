import React, { useState } from "react";
import { useMap } from "react-leaflet"

type LeafletOnClickProps = {
    onClick?: () => void
}

export const LeafletOnClick = ({ onClick }: LeafletOnClickProps) => {
    const map = useMap();
    const [clickable, setClickable] = useState(true);

    map.addEventListener("click", (event) => {
        if (clickable && onClick) {
            setClickable(false);
            onClick();
            new Promise(res => setTimeout(res, 1000)).then(() => {
                setClickable(true);
            })
        }
    });

    return <div></div>
}