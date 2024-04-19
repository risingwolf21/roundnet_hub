import {useSelector} from "react-redux";
import {RootState} from "../redux/store";
import {useFirebase} from "../hooks/useFirebase";

export const FirebaseMessaging = ({children}: { children: string | JSX.Element | JSX.Element[] }) => {
    const {user} = useSelector((state: RootState) => state.application);
    useFirebase(user);

    return children;
}