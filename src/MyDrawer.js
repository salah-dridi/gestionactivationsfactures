import * as React from 'react';
import { Box, Drawer, CssBaseline, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Toolbar } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import SimCardIcon from '@mui/icons-material/SimCard';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CreditCardOffIcon from '@mui/icons-material/CreditCardOff';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 190;
const headerHeight = 64;

export default function MyDrawer({ children }) { 
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const liste = [
    { text: 'Home', icon: <HomeIcon />, path: '/', color: 'white' },
    { text: 'Clients', icon: <PeopleIcon />, path: '/listeclients', color: 'white' },
    { text: 'Activations Orange', icon: <SimCardIcon />, path: '/activationsorange', color: '#ff7900' },
    { text: 'Activations Ooredoo', icon: <SimCardIcon />, path: '/activationsooredoo', color: '#ed1c24' },
    { text: 'Factures en avances', icon: <CreditCardIcon />, path: '/facturesavances', color: 'white' },
    { text: 'Factures payées', icon: <CreditCardOffIcon />, path: '/facturespayees', color: 'white' },
    { text: 'Liste des offres', icon: <AlignHorizontalLeftIcon />, path: '/listeoffres', color: 'white' },
  ];

  const getPageTitle = () => {
    const current = liste.find(item => item.path === location.pathname);
    if (current) return current.text;
    else if (location.pathname === '/detailsclient') return 'Détails du Client';
    else return 'Admin Dashboard';
  };

  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    const interval = setInterval(() => { setVisible((prev) => !prev); }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />

      {/* Header */}
      <Box sx={{
          height: `${headerHeight}px`,
          background: 'linear-gradient(to right, #001, #4db2b6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: 2,
          color: 'white',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 1300,
          boxSizing: 'border-box',
        }}>
        <Box sx={{
            fontWeight: 'bold',
            fontSize: '1.25rem',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.4s ease-in-out',
          }}>
          {getPageTitle()}
        </Box>

        <IconButton onClick={() => setOpen(true)} sx={{ color: 'white', flexDirection: 'column', fontSize: 15 }}>
          <MenuIcon />
          Menu
        </IconButton>
      </Box>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        variant="temporary"
        sx={{ 
          '& .MuiDrawer-paper': { 
            width: drawerWidth, 
            boxSizing: 'border-box', 
            background: 'linear-gradient(to bottom, #001, #4db2b6)',
          } 
        }}
      >
        <Box sx={{ height: `${headerHeight}px` }} />
        
        <List>
          {liste.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setOpen(false);
                }}
                sx={{
                  backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: item.color }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      color: item.color,
                      fontWeight: location.pathname === item.path ? 'bold' : 'normal'
                    } 
                  }} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Zone de contenu principal */}
      <Box component="main" sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          paddingTop: `${headerHeight}px`,
          overflowY: 'auto',
          height: '100vh'
        }}>
        {children}
      </Box>
    </Box>
  );
}