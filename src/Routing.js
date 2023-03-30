import { BrowserRouter, Route, Routes } from "react-router-dom"
import App from "./App"
import AuthGate from "./AuthGate"
import PageNotFound from "./components/PageNotFound"

const Routing = () => {
    return <div>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AuthGate><App /></AuthGate>} />
                <Route path="/user" element={<AuthGate><App /></AuthGate>} />
                <Route path="*" element={<PageNotFound />} />
            </Routes>
        </BrowserRouter>
    </div>
}

export default Routing;