import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { 
    doc, getDoc, updateDoc, collection, query, 
    where, getDocs, deleteDoc, setDoc 
} from 'firebase/firestore';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Button, IconButton, 
    TextField, Dialog, DialogTitle, DialogContent, DialogActions, Stack 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import Swal from 'sweetalert2';

const DetailsClient = () => {
    const { id } = useParams();
    const [client, setClient] = useState(null);
    const [activations, setActivations] = useState([]);
    const [loading, setLoading] = useState(true);

    // State for editing Client main info (Nom, Prenom)
    const [isEditingClient, setIsEditingClient] = useState(false);
    const [tempClient, setTempClient] = useState({});

    // Dialog state for adding characteristic
    const [openChar, setOpenChar] = useState(false);
    const [newChar, setNewChar] = useState({ key: '', value: '' });

    // State for inline editing in activations
    const [editIdx, setEditIdx] = useState(null);
    const [editData, setEditData] = useState({});

    useEffect(() => {
        fetchClientData();
    }, [id]);

    const fetchClientData = async () => {
        try {
            setLoading(true);
            const clientDoc = await getDoc(doc(db, "Clients", id));
            if (clientDoc.exists()) {
                const data = { id: clientDoc.id, ...clientDoc.data() };
                setClient(data);
                setTempClient(data); // Sync temp state
            }

            const [orangeSnap, ooredooSnap] = await Promise.all([
                getDocs(query(collection(db, "ActivationsOrange"), where("idclient", "==", id))),
                getDocs(query(collection(db, "ActivationsOoredoo"), where("idclient", "==", id)))
            ]);

            const orangeList = orangeSnap.docs.map(doc => ({ id: doc.id, operator: 'Orange', ...doc.data() }));
            const ooredooList = ooredooSnap.docs.map(doc => ({ id: doc.id, operator: 'Ooredoo', ...doc.data() }));
            
            setActivations([...orangeList, ...ooredooList]);
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Fiche Client Main Info Logic ---
    const handleSaveClientInfo = async () => {
        try {
            await updateDoc(doc(db, "Clients", id), {
                nom: tempClient.nom,
                prenom: tempClient.prenom
            });
            setClient({ ...client, nom: tempClient.nom, prenom: tempClient.prenom });
            setIsEditingClient(false);
            Swal.fire('Succès', 'Informations client mises à jour', 'success');
        } catch (error) {
            Swal.fire('Erreur', 'Echec de modification', 'error');
        }
    };

    // --- Fiche Client Features Logic ---
    const handleAddChar = async () => {
        if (!newChar.key || !newChar.value) return;
        if (client.features && client.features[newChar.key]) {
            Swal.fire('Erreur', 'Cette caractéristique existe déjà', 'error');
            return;
        }
        const updatedFeatures = { ...(client.features || {}), [newChar.key]: newChar.value };
        await updateDoc(doc(db, "Clients", id), { features: updatedFeatures });
        setClient({ ...client, features: updatedFeatures });
        setOpenChar(false);
        setNewChar({ key: '', value: '' });
        Swal.fire('Succès', 'Caractéristique ajoutée', 'success');
    };

    const handleDeleteChar = async (keyToDelete) => {
        const { [keyToDelete]: removed, ...remainingFeatures } = client.features;
        await updateDoc(doc(db, "Clients", id), { features: remainingFeatures });
        setClient({ ...client, features: remainingFeatures });
    };

    // --- Activations Logic ---
    const startEdit = (idx, item) => {
        setEditIdx(idx);
        setEditData({ ...item });
    };

    const saveEdit = async (item) => {
        try {
            const collectionName = item.operator === 'Orange' ? "ActivationsOrange" : "ActivationsOoredoo";
            const { id: docId, operator, ...dataToUpdate } = editData;
            await updateDoc(doc(db, collectionName, docId), dataToUpdate);
            setEditIdx(null);
            fetchClientData();
            Swal.fire('Mis à jour', 'L\'activation a été modifiée', 'success');
        } catch (error) {
            Swal.fire('Erreur', 'Echec de modification', 'error');
        }
    };

    const handleDeleteActivation = async (item) => {
        const result = await Swal.fire({
            title: 'Supprimer ?',
            text: "Toute la ligne sera supprimée !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, supprimer'
        });
        if (result.isConfirmed) {
            const collectionName = item.operator === 'Orange' ? "ActivationsOrange" : "ActivationsOoredoo";
            await deleteDoc(doc(db, collectionName, item.id));
            fetchClientData();
            Swal.fire('Supprimé', '', 'success');
        }
    };

    if (loading) return <Typography sx={{ p: 4 }}>Chargement...</Typography>;
    if (!client) return <Typography sx={{ p: 4 }}>Client introuvable</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#1a237e', fontWeight: 'bold' }}>
                Détails Client : {client.nom} {client.prenom}
            </Typography>

            {/* --- SECTION 1: FICHE CLIENT --- */}
            <Paper sx={{ p: 2, mb: 4, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Fiche Client</Typography>
                    <Stack direction="row" spacing={1}>
                        {isEditingClient ? (
                            <Button startIcon={<SaveIcon />} variant="contained" color="success" onClick={handleSaveClientInfo}>
                                Enregistrer
                            </Button>
                        ) : (
                            <Button startIcon={<EditIcon />} variant="outlined" onClick={() => setIsEditingClient(true)}>
                                Modifier Infos
                            </Button>
                        )}
                        <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setOpenChar(true)}>
                            Ajouter une ligne
                        </Button>
                    </Stack>
                </Stack>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell><strong>Champ</strong></TableCell>
                                <TableCell><strong>Valeur</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* Static Fields: Nom, Prenom, CIN */}
                            <TableRow>
                                <TableCell>Nom</TableCell>
                                <TableCell>
                                    {isEditingClient ? 
                                        <TextField size="small" value={tempClient.nom} onChange={(e) => setTempClient({...tempClient, nom: e.target.value})} /> 
                                        : client.nom}
                                </TableCell>
                                <TableCell align="right">-</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Prénom</TableCell>
                                <TableCell>
                                    {isEditingClient ? 
                                        <TextField size="small" value={tempClient.prenom} onChange={(e) => setTempClient({...tempClient, prenom: e.target.value})} /> 
                                        : client.prenom}
                                </TableCell>
                                <TableCell align="right">-</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>CIN (Non modifiable)</TableCell>
                                <TableCell>{client.cin}</TableCell>
                                <TableCell align="right">-</TableCell>
                            </TableRow>
                            
                            {/* Dynamic Features */}
                            {client.features && Object.entries(client.features).map(([key, val]) => (
                                <TableRow key={key}>
                                    <TableCell>{key}</TableCell>
                                    <TableCell>{val}</TableCell>
                                    <TableCell align="right">
                                        <IconButton color="error" onClick={() => handleDeleteChar(key)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* --- SECTION 2: LISTE DES ACTIVATIONS --- */}
            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Liste des activations</Typography>
                {activations.length === 0 ? (
                    <Typography sx={{ py: 4, textAlign: 'center', color: 'gray', fontStyle: 'italic' }}>
                        Aucune activation
                    </Typography>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: '#1a237e' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'white' }}>Index</TableCell>
                                    <TableCell sx={{ color: 'white' }}>Numéro</TableCell>
                                    <TableCell sx={{ color: 'white' }}>Opérateur</TableCell>
                                    <TableCell sx={{ color: 'white' }}>Offre</TableCell>
                                    <TableCell align="right" sx={{ color: 'white' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {activations.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>
                                            {editIdx === index ? (
                                                <TextField 
                                                    size="small" 
                                                    value={editData.numero} 
                                                    onChange={(e) => setEditData({...editData, numero: e.target.value})}
                                                />
                                            ) : item.numero}
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ 
                                                color: item.operator === 'Orange' ? '#ff7900' : '#ed1c24',
                                                fontWeight: 'bold'
                                            }}>
                                                {item.operator}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {editIdx === index ? (
                                                <TextField 
                                                    size="small" 
                                                    value={editData.offre} 
                                                    onChange={(e) => setEditData({...editData, offre: e.target.value})}
                                                />
                                            ) : item.offre}
                                        </TableCell>
                                        <TableCell align="right">
                                            {editIdx === index ? (
                                                <IconButton color="success" onClick={() => saveEdit(item)}>
                                                    <SaveIcon />
                                                </IconButton>
                                            ) : (
                                                <IconButton color="primary" onClick={() => startEdit(index, item)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            <IconButton color="error" onClick={() => handleDeleteActivation(item)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Dialog for New Feature */}
            <Dialog open={openChar} onClose={() => setOpenChar(false)}>
                <DialogTitle>Ajouter Caractéristique</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField 
                            label="Nom (Key)" fullWidth 
                            value={newChar.key}
                            onChange={(e) => setNewChar({...newChar, key: e.target.value})}
                        />
                        <TextField 
                            label="Valeur" fullWidth 
                            value={newChar.value}
                            onChange={(e) => setNewChar({...newChar, value: e.target.value})}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenChar(false)}>Annuler</Button>
                    <Button onClick={handleAddChar} variant="contained">Ajouter</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DetailsClient;