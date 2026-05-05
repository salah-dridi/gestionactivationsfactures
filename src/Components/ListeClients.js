import React, { useEffect, useState } from 'react';
import { db } from '../firebase'
import { 
    collection, query, getDocs, addDoc, where 
} from 'firebase/firestore';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
    Box, Button, Typography, Stack, Dialog, 
    DialogTitle, DialogContent, DialogActions, TextField, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Swal from 'sweetalert2';

const ListeClients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

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
                // تأكد أن الحقل في جداول التفعيل اسمه idclient ويطابق الـ id (الـ doc.id)
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

    const handleAddClient = async () => {
        if (!newClient.cin || !newClient.nom || !newClient.prenom) {
            Swal.fire('Attention', 'Veuillez remplir tous les champs', 'warning');
            return;
        }

        try {
            // تثبت من الـ CIN قبل التسجيل
            const q = query(collection(db, "Clients"), where("cin", "==", newClient.cin));
            const checkSnap = await getDocs(q);
            
            if (!checkSnap.empty) {
                Swal.fire('Erreur', 'Ce CIN existe déjà', 'error');
                return;
            }

            // عملية التسجيل
            const docRef = await addDoc(collection(db, "Clients"), {
                cin: newClient.cin,
                nom: newClient.nom,
                prenom: newClient.prenom,
                dateCreation: new Date().toISOString()
            });

            if(docRef.id) {
                setOpen(false);
                setNewClient({ cin: '', nom: '', prenom: '' });
                await fetchData(); // تحديث القائمة
                Swal.fire('Succès', 'Client ajouté avec succès', 'success');
            }
        } catch (e) {
            console.error("Add Error:", e);
            Swal.fire('Erreur', "خطأ في الاتصال بقاعدة البيانات: " + e.message, 'error');
        }
    };

    const columns = [
        { field: 'cin', headerName: 'CIN', width: 150 },
        { field: 'nom', headerName: 'Nom', width: 180 },
        { field: 'prenom', headerName: 'Prénom', width: 180 },
        { 
            field: 'countOoredoo', 
            headerName: 'Activations Ooredoo', 
            width: 180, 
            renderCell: (params) => <Box sx={{ color: '#ed1c24', fontWeight: 'bold' }}>{params.value || 0}</Box>
        },
        { 
            field: 'countOrange', 
            headerName: 'Activations Orange', 
            width: 180, 
            renderCell: (params) => <Box sx={{ color: '#ff7900', fontWeight: 'bold' }}>{params.value || 0}</Box>
        },
        { 
            field: 'totalActivations', 
            headerName: 'Total', 
            width: 120,
            renderCell: (params) => <Box sx={{ fontWeight: 'bold' }}>{params.value || 0}</Box>
        }
    ];

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            {/* التنسيق لجعل الزر على اليمين */}
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
                        px: 3
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

            {/* Dialog الحريف الجديد */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Nouveau Client</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField 
                            label="Numéro CIN" 
                            fullWidth 
                            value={newClient.cin} 
                            onChange={(e) => setNewClient({...newClient, cin: e.target.value})} 
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