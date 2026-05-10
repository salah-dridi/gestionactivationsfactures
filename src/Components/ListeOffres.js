import React, { useEffect, useState } from 'react';
import { db } from '../firebase'; 
import { collection, query, getDocs, deleteDoc, doc, addDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Box, Button, Typography, IconButton, Stack, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import Swal from 'sweetalert2';

const ListeOffres = () => {
    const [offres, setOffres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false); 
    const [currentOffre, setCurrentOffre] = useState({ id: '', nom: '' });
    const [originalNom, setOriginalNom] = useState('');

    const fetchOffres = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, "Offres")); 
            const querySnapshot = await getDocs(q);
            
            const fetchedOffres = await Promise.all(querySnapshot.docs.map(async (offreDoc) => {
                const data = offreDoc.data();
                const offreName = data.nom;

                const tables = ["ActivationsOrange", "ActivationsOoredoo"];
                let isUsed = false;

                for (const table of tables) {
                    const checkQ = query(collection(db, table), where("offre", "==", offreName));
                    const snap = await getDocs(checkQ);
                    if (!snap.empty) {
                        isUsed = true;
                        break;
                    }
                }

                return {
                    id: offreDoc.id,
                    nom: offreName,
                    isUsed: isUsed 
                };
            }));

            setOffres(fetchedOffres);
        } catch (error) {
            console.error("Error:", error);
            Swal.fire('Erreur', 'Impossible de charger les offres', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffres();
    }, []);

    const handleDelete = async (id, nom) => {
        const result = await Swal.fire({
            title: 'Supprimer ?',
            text: `Voulez-vous supprimer l'offre: ${nom} ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Oui, supprimer'
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, "Offres", id));
                setOffres(offres.filter(o => o.id !== id));
                Swal.fire('Supprimé', '', 'success');
            } catch (e) {
                Swal.fire('Erreur', 'Echec de suppression', 'error');
            }
        }
    };

    const handleSave = async () => {
        if (!currentOffre.nom.trim()) {
            Swal.fire('Attention', 'Le nom est obligatoire', 'warning');
            return;
        }

        try {
            setLoading(true);
            if (currentOffre.id) {
                const batch = writeBatch(db);
                const tables = ["ActivationsOrange", "ActivationsOoredoo"];

                for (const table of tables) {
                    const q = query(collection(db, table), where("offre", "==", originalNom));
                    const snap = await getDocs(q);
                    snap.forEach((d) => {
                        batch.update(doc(db, table, d.id), { offre: currentOffre.nom });
                    });
                }

                batch.update(doc(db, "Offres", currentOffre.id), { nom: currentOffre.nom });
                
                await batch.commit();
                Swal.fire('Modifié', 'Mise à jour effectuée partout', 'success');
            } else {
                await addDoc(collection(db, "Offres"), { nom: currentOffre.nom });
                Swal.fire('Ajouté', 'Nouvelle offre créée', 'success');
            }
            setOpen(false);
            fetchOffres(); 
        } catch (e) {
            console.error(e);
            Swal.fire('Erreur', 'Opération échouée', 'error');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 220 },
        { field: 'nom', headerName: 'Nom de l\'Offre', flex: 1 },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <IconButton color="primary" onClick={() => { 
                        setCurrentOffre(params.row); 
                        setOriginalNom(params.row.nom); 
                        setOpen(true); 
                    }}>
                        <EditIcon />
                    </IconButton>
                    
                    {!params.row.isUsed && (
                        <IconButton color="error" onClick={() => handleDelete(params.row.id, params.row.nom)}>
                            <DeleteIcon />
                        </IconButton>
                    )}
                </Stack>
            )
        }
    ];

    return (
        <Box sx={{ p: 3, height: '90%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
                    Gestion des Offres
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => { setCurrentOffre({ id: '', nom: '' }); setOpen(true); }}
                    sx={{ borderRadius: '8px' }}
                >
                    Ajouter Offre
                </Button>
            </Stack>

            <Box sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: 3, height: 500 }}>
                <DataGrid
                    rows={offres}
                    columns={columns}
                    loading={loading}
                    slots={{ toolbar: GridToolbar }}
                    sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f5f5f5' } }}
                />
            </Box>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    {currentOffre.id ? 'Modifier Offre' : 'Nouvelle Offre'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nom de l'offre"
                        fullWidth
                        variant="outlined"
                        value={currentOffre.nom}
                        onChange={(e) => setCurrentOffre({ ...currentOffre, nom: e.target.value })}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)} color="inherit">Annuler</Button>
                    <Button onClick={handleSave} variant="contained" color="success">
                        Enregistrer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListeOffres;