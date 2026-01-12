import { useState } from "react";
import Login from "./pages/Login";
import MySheets from "./pages/MySheets";
import SheetDetail from "./pages/SheetDetail";

export default function App() {
  const [view, setView] = useState("list");
  const [sheetId, setSheetId] = useState(null);

  const token = localStorage.getItem("token");

  if (!token) {
    return <Login onLogin={() => setView("list")} />;
  }

  if (view === "detail") {
    return <SheetDetail sheetId={sheetId} onBack={() => setView("list")} />;
  }

  return (
    <MySheets
      onOpen={(id) => {
        setSheetId(id);
        setView("detail");
      }}
    />
  );
}