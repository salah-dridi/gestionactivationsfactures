import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MyDrawer from './MyDrawer';
import Home from './Home';
import ListeClients from './Components/ListeClients';
import ActivationsOrange from './Components/ActivationsOrange';
import ActivationsOoredoo from './Components/ActivationsOoredoo';
import FacturesAvances from './Components/FacturesAvances';
import FacturesPayees from './Components/FacturesPayees';
import ListeOffres from './Components/ListeOffres';
import DetailsClient from './Components/DetailsClient';
function App() {
  return (
    <Router>
      <MyDrawer>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listeclients" element={<ListeClients />} />
          <Route path="/activationsorange" element={<ActivationsOrange />} />
          <Route path="/activationsooredoo" element={<ActivationsOoredoo />} />
          <Route path="/facturesavances" element={<FacturesAvances />} />
          <Route path="/facturespayees" element={<FacturesPayees />} />
          <Route path="/listeoffres" element={<ListeOffres />} />
          <Route path="/detailsclient/:id" element={<DetailsClient />} />
        </Routes>
      </MyDrawer>
    </Router>
  
  );
}

export default App;