import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MyDrawer from './MyDrawer';
import Home from './Home';
import ListeClients from './Components/ListeClients';
function App() {
  return (
    <Router>
      <MyDrawer>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listeclients" element={<ListeClients />} />
        </Routes>
      </MyDrawer>
    </Router>
  
  );
}

export default App;