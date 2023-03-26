import { useSelector } from "react-redux";
import { isEmpty, isLoaded } from "react-redux-firebase";
import AuthScreen from "./components/AuthScreen";

const AuthGate = ({ children }) => {
    const auth = useSelector(state => state.firebase.auth)

    if(!isLoaded(auth)){
        return <span>loading...</span>
    } else if(!isEmpty(auth)){
        return children;
    } else {
        return <AuthScreen />
    }
}

export default AuthGate;