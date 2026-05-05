import React from 'react';
import { Box, Typography } from '@mui/material';

const Home = () => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '80vh' 
      }}
    >
      {/* Titre principal de la page d'accueil */}
      <Typography variant="h3" component="h1" gutterBottom color="primary">
        Bienvenue
      </Typography>

      {/* Sous-titre pour la gestion de la boutique */}
      <Typography variant="h6" color="textSecondary">
        Application de gestion des activations et des factures
      </Typography>
    </Box>
  );
};

export default Home;