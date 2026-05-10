import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { 
    collection, query, getDocs, addDoc, where, deleteDoc, doc // *** MODIFICATION: Added deleteDoc, doc ***
} from 'firebase/firestore';
import { DataGrid, GridToolbar } from '@mui/x-data-grid'; 
import { 
    Box, Button, Typography, Stack, Dialog, 
    DialogTitle, DialogContent, DialogActions, TextField, IconButton // *** MODIFICATION: Added IconButton ***
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete'; // *** MODIFICATION: Icons for actions ***
import VisibilityIcon from '@mui/icons-material/Visibility';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom'; // *** MODIFICATION: Added for navigation ***

const ListeClients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate(); // *** MODIFICATION: Navigation hook ***

    const [newClient, setNewClient] = useState({
        cin: '',
        nom: '',
        prenom: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const clientsSnap = await getDocs(collection(db, "Clients"));
            const clientsList = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const [ooredooSnap, orangeSnap] = await Promise.all([
                getDocs(collection(db, "ActivationsOoredoo")),
                getDocs(collection(db, "ActivationsOrange"))
            ]);

            const ooredooData = ooredooSnap.docs.map(doc => doc.data());
            const orangeData = orangeSnap.docs.map(doc => doc.data());

            const finalClients = clientsList.map(client => {
                const countOoredoo = ooredooData.filter(act => act.idclient === client.id).length;
                const countOrange = orangeData.filter(act => act.idclient === client.id).length;
                
                return {
                    ...client,
                    countOoredoo,
                    countOrange,
                    totalActivations: countOoredoo + countOrange
                };
            });

            setClients(finalClients);
        } catch (error) {
            console.error("Fetch Error:", error);
            Swal.fire('Erreur', 'Impossible de charger les clients', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // *** MODIFICATION: Delete Function with usage check ***
    const handleDeleteClient = async (clientId) => {
        const result = await Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cette action est irréversible !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                // Check if client exists in other collections
                const collectionsToCheck = [
                    "ActivationsOrange",
                    "ActivationsOoredoo",
                    "FacturesAvances",
                    "FacturesPayees"
                ];

                let isUsed = false;

                for (const colName of collectionsToCheck) {
                    const q = query(collection(db, colName), where("idclient", "==", clientId));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        isUsed = true;
                        break;
                    }
                }

                if (isUsed) {
                    Swal.fire('Action Impossible', 'Ce client est lié à des factures ou des activations .', 'error');
                    return;
                }

                await deleteDoc(doc(db, "Clients", clientId));
                Swal.fire('Supprimé !', 'Le client a été supprimé.', 'success');
                fetchData();
            } catch (error) {
                console.error("Delete Error:", error);
                Swal.fire('Erreur', 'Une erreur est survenue lors de la suppression.', 'error');
            }
        }
    };

    const handleAddClient = async () => {
        if (!newClient.cin || !newClient.nom || !newClient.prenom) {
            Swal.fire('Attention', 'Veuillez remplir tous les champs', 'warning');
            return;
        }

        const cinRegex = /^\d{8}$/;
        if (!cinRegex.test(newClient.cin)) {
            Swal.fire('Attention', 'Le CIN doit contenir exactement 8 chiffres', 'warning');
            return;
        }

        try {
            const q = query(collection(db, "Clients"), where("cin", "==", newClient.cin));
            const checkSnap = await getDocs(q);
            
            if (!checkSnap.empty) {
                Swal.fire('Erreur', 'Ce CIN existe déjà', 'error');
                return;
            }

            const docRef = await addDoc(collection(db, "Clients"), {
                cin: newClient.cin,
                nom: newClient.nom,
                prenom: newClient.prenom,
                dateCreation: new Date().toISOString()
            });

            if(docRef.id) {
                setOpen(false);
                setNewClient({ cin: '', nom: '', prenom: '' });
                await fetchData();
                Swal.fire('Succès', 'Client ajouté avec succès', 'success');
            }
        } catch (e) {
            console.error("Add Error:", e);
            Swal.fire('Erreur', "Database connection error: " + e.message, 'error');
        }
    };

    const columns = [
        { field: 'cin', headerName: 'CIN', width: 120 },
        { field: 'nom', headerName: 'Nom', width: 150 },
        { field: 'prenom', headerName: 'Prénom', width: 150 },
        { 
            field: 'countOoredoo', 
            headerName: 'Ooredoo', 
            width: 100, 
            renderCell: (params) => <Box sx={{ color: '#ed1c24', fontWeight: 'bold' }}>{params.value || 0}</Box>
        },
        { 
            field: 'countOrange', 
            headerName: 'Orange', 
            width: 100, 
            renderCell: (params) => <Box sx={{ color: '#ff7900', fontWeight: 'bold' }}>{params.value || 0}</Box>
        },
        { 
            field: 'totalActivations', 
            headerName: 'Total', 
            width: 80,
            renderCell: (params) => <Box sx={{ fontWeight: 'bold' }}>{params.value || 0}</Box>
        },
        // *** MODIFICATION: Added Actions Column ***
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => navigate(`/detailsclient/${params.row.id}`)}
                    >
                        <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                        color="error" 
                        size="small"
                        onClick={() => handleDeleteClient(params.row.id)}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>
            )
        }
    ];

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Stack 
                direction="row" 
                justifyContent="space-between" 
                alignItems="center" 
                mb={3}
                sx={{ width: '100%' }}
            >
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
                    Liste des Clients
                </Typography>
                
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setOpen(true)} 
                    sx={{ 
                        bgcolor: '#1a237e', 
                        '&:hover': { bgcolor: '#0d1442' },
                        textTransform: 'none',
                        px: 3,
                        ml: 'auto' 
                    }}
                >
                    Ajouter Client
                </Button>
            </Stack>

            <Box sx={{ height: 650, width: '100%', bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                <DataGrid
                    rows={clients}
                    columns={columns}
                    loading={loading}
                    slots={{ toolbar: GridToolbar }}
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 25, 50]}
                />
            </Box>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Nouveau Client</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField 
                            label="Numéro CIN (8 chiffres)" 
                            fullWidth 
                            inputProps={{ maxLength: 8 }} 
                            value={newClient.cin} 
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, ''); 
                                setNewClient({...newClient, cin: val});
                            }} 
                        />
                        <TextField 
                            label="Nom" 
                            fullWidth 
                            value={newClient.nom} 
                            onChange={(e) => setNewClient({...newClient, nom: e.target.value})} 
                        />
                        <TextField 
                            label="Prénom" 
                            fullWidth 
                            value={newClient.prenom} 
                            onChange={(e) => setNewClient({...newClient, prenom: e.target.value})} 
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)} color="error">Annuler</Button>
                    <Button onClick={handleAddClient} variant="contained" sx={{ bgcolor: '#1a237e' }}>
                        Enregistrer le client
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListeClients;