import { connect } from "react-redux";
import { compose } from "redux";
import HistoryList from "./HistoryList";

const HistoryScreen = ({ profile, auth }) => {
    return <HistoryList authId={auth.uid} />
}

export default compose(
    connect((state) => ({
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)(HistoryScreen);