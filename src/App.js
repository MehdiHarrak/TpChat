import './App.css';
import { Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { SignupPage } from "./pages/SignupPage";
import MessagePage from "./pages/MessagePage";

function App() {
  return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/chat" element={<MessagePage />} />
      </Routes>
  );
}

export default App;
//