import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { 
    doc, getDoc, updateDoc, collection, query, 
    where, getDocs, deleteDoc, addDoc 
} from 'firebase/firestore';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Button, IconButton, 
    TextField, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
    MenuItem, Select, FormControl, InputLabel
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
    const [allOffres, setAllOffres] = useState([]); 

    const [isEditingClient, setIsEditingClient] = useState(false);
    const [tempClient, setTempClient] = useState({});

    const [openChar, setOpenChar] = useState(false);
    const [newChar, setNewChar] = useState({ key: '', value: '' });

    // States for adding a new activation
    const [openAddActivation, setOpenAddActivation] = useState(false);
    const [newActivation, setNewActivation] = useState({ numero: '', operator: '', offre: '' });

    const [editIdx, setEditIdx] = useState(null);
    const [editData, setEditData] = useState({});

    const availableKeys = [
        "Civilité",
        "Date d'émission",
        "Date de naissance",
        "Adresse",
        "Tel"
    ];

    const dateFieldStyle = {
        "& input::-webkit-calendar-picker-indicator": { cursor: 'pointer' },
        "& .MuiInputLabel-root": {
            transform: 'translate(14px, -9px) scale(0.75)',
            backgroundColor: 'white',
            padding: '0 4px'
        }
    };

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
                setTempClient(data);
            }

            const offresSnap = await getDocs(collection(db, "Offres"));
            const offresList = offresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllOffres(offresList);

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

    const handleSaveClientInfo = async () => {
        try {
            await updateDoc(doc(db, "Clients", id), {
                nom: tempClient.nom,
                prenom: tempClient.prenom,
                features: tempClient.features || {}
            });
            setClient({ ...tempClient });
            setIsEditingClient(false);
            Swal.fire('Succès', 'Informations client mises à jour', 'success');
        } catch (error) {
            Swal.fire('Erreur', 'Échec de modification', 'error');
        }
    };

    const handleAddChar = async () => {
        if (!newChar.key || !newChar.value) return;
        if (newChar.key === "Tel" && !/^\d{8}$/.test(newChar.value)) {
            Swal.fire('Erreur', 'Le numéro de téléphone doit contenir exactement 8 chiffres', 'error');
            return;
        }
        const updatedFeatures = { ...(client.features || {}), [newChar.key]: newChar.value };
        await updateDoc(doc(db, "Clients", id), { features: updatedFeatures });
        const updatedClient = { ...client, features: updatedFeatures };
        setClient(updatedClient);
        setTempClient(updatedClient); 
        setOpenChar(false);
        setNewChar({ key: '', value: '' });
        Swal.fire('Succès', 'Caractéristique ajoutée', 'success');
    };

    const handleDeleteChar = async (keyToDelete) => {
        const { [keyToDelete]: removed, ...remainingFeatures } = client.features;
        await updateDoc(doc(db, "Clients", id), { features: remainingFeatures });
        const updatedClient = { ...client, features: remainingFeatures };
        setClient(updatedClient);
        setTempClient(updatedClient);
    };


    const handleAddActivation = async () => {
        if (!newActivation.numero || !newActivation.operator || !newActivation.offre) {
            Swal.fire('Erreur', 'Veuillez remplir tous les champs', 'error');
            return;
        }
        if (!/^\d{8}$/.test(newActivation.numero)) {
            Swal.fire('Erreur', 'Le numéro doit contenir 8 chiffres', 'error');
            return;
        }

        try {
            // 1. Check if number exists in both collections before adding
            const checkOrange = query(collection(db, "ActivationsOrange"), where("numero", "==", newActivation.numero));
            const checkOoredoo = query(collection(db, "ActivationsOoredoo"), where("numero", "==", newActivation.numero));

            const [snapOrange, snapOoredoo] = await Promise.all([
                getDocs(checkOrange),
                getDocs(checkOoredoo)
            ]);

            if (!snapOrange.empty || !snapOoredoo.empty) {
                Swal.fire('Erreur', 'Ce numéro existe déjà dans la base de données (Orange ou Ooredoo)', 'error');
                return;
            }

            // 2. If number doesn't exist, proceed with addition
            const collectionName = newActivation.operator === 'Orange' ? "ActivationsOrange" : "ActivationsOoredoo";
            await addDoc(collection(db, collectionName), {
                numero: newActivation.numero,
                offre: newActivation.offre,
                idclient: id
            });

            setOpenAddActivation(false);
            setNewActivation({ numero: '', operator: '', offre: '' });
            fetchClientData();
            Swal.fire('Succès', 'Activation ajoutée avec succès', 'success');
        } catch (error) {
            console.error("Error adding activation:", error);
            Swal.fire('Erreur', 'Erreur lors de l\'ajout', 'error');
        }
    };

    const startEdit = (idx, item) => {
        setEditIdx(idx);
        setEditData({ ...item });
    };

    const saveEdit = async (item) => {
        try {
            if (!/^\d{8}$/.test(editData.numero)) {
                Swal.fire('Erreur', 'Le numéro doit contenir exactement 8 chiffres', 'error');
                return;
            }
            const collectionName = item.operator === 'Orange' ? "ActivationsOrange" : "ActivationsOoredoo";
            const { id: docId, operator, ...dataToUpdate } = editData;
            await updateDoc(doc(db, collectionName, docId), dataToUpdate);
            setEditIdx(null);
            fetchClientData();
            Swal.fire('Mis à jour', 'L\'activation a été modifiée', 'success');
        } catch (error) {
            Swal.fire('Erreur', 'Échec de modification', 'error');
        }
    };

    const handleDeleteActivation = async (item) => {
        const result = await Swal.fire({
            title: 'Supprimer ?',
            text: "Toute la ligne sera supprimée !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler'
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
                            
                            {client.features && Object.entries(client.features).map(([key, val]) => (
                                <TableRow key={key}>
                                    <TableCell>{key}</TableCell>
                                    <TableCell>
                                        {isEditingClient ? (
                                            key === "Civilité" ? (
                                                <Select
                                                    size="small"
                                                    value={tempClient.features[key]}
                                                    onChange={(e) => setTempClient({
                                                        ...tempClient,
                                                        features: { ...tempClient.features, [key]: e.target.value }
                                                    })}
                                                >
                                                    <MenuItem value="Homme">Homme</MenuItem>
                                                    <MenuItem value="Femme">Femme</MenuItem>
                                                </Select>
                                            ) : (
                                                <TextField 
                                                    size="small" 
                                                    type={key.includes("Date") ? "date" : "text"}
                                                    sx={key.includes("Date") ? dateFieldStyle : {}}
                                                    value={tempClient.features[key]} 
                                                    onChange={(e) => setTempClient({
                                                        ...tempClient, 
                                                        features: { ...tempClient.features, [key]: e.target.value }
                                                    })} 
                                                />
                                            )
                                        ) : val}
                                    </TableCell>
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

            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Liste des activations</Typography>
                    <Button 
                        startIcon={<AddIcon />} 
                        variant="contained" 
                        color="primary" 
                        onClick={() => setOpenAddActivation(true)}
                    >
                        Ajouter Activation
                    </Button>
                </Stack>

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
                                                <Select
                                                    size="small"
                                                    fullWidth
                                                    value={editData.offre || ''}
                                                    onChange={(e) => setEditData({...editData, offre: e.target.value})}
                                                >
                                                    {allOffres.map((off) => (
                                                        <MenuItem key={off.id} value={off.nom || off.name || off.title}>
                                                            {off.nom || off.name || off.title}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
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

            {/* Dialog Ajouter Caractéristique */}
            <Dialog open={openChar} onClose={() => setOpenChar(false)} fullWidth maxWidth="xs">
                <DialogTitle>Ajouter Caractéristique</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Champ (Key)</InputLabel>
                            <Select
                                label="Champ (Key)"
                                value={newChar.key}
                                onChange={(e) => setNewChar({ key: e.target.value, value: '' })}
                            >
                                {availableKeys
                                    .filter(k => !client.features || !client.features[k])
                                    .map(k => (
                                        <MenuItem key={k} value={k}>{k}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>
                        {newChar.key === "Civilité" ? (
                            <FormControl fullWidth>
                                <InputLabel>Valeur</InputLabel>
                                <Select
                                    label="Valeur"
                                    value={newChar.value}
                                    onChange={(e) => setNewChar({...newChar, value: e.target.value})}
                                >
                                    <MenuItem value="Homme">Homme</MenuItem>
                                    <MenuItem value="Femme">Femme</MenuItem>
                                </Select>
                            </FormControl>
                        ) : (
                            <TextField 
                                label="Valeur" 
                                fullWidth 
                                type={newChar.key.includes("Date") ? "date" : "text"}
                                InputLabelProps={newChar.key.includes("Date") ? { shrink: true } : {}}
                                sx={newChar.key.includes("Date") ? dateFieldStyle : {}}
                                value={newChar.value}
                                onChange={(e) => setNewChar({...newChar, value: e.target.value})}
                                helperText={newChar.key === "Tel" ? "8 chiffres requis" : ""}
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenChar(false)}>Annuler</Button>
                    <Button onClick={handleAddChar} variant="contained" disabled={!newChar.key || !newChar.value}>
                        Ajouter
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Ajouter Activation */}
            <Dialog open={openAddActivation} onClose={() => setOpenAddActivation(false)} fullWidth maxWidth="xs">
                <DialogTitle>Ajouter une nouvelle activation</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField 
                            label="Numéro" 
                            fullWidth 
                            value={newActivation.numero}
                            onChange={(e) => setNewActivation({...newActivation, numero: e.target.value})}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Opérateur</InputLabel>
                            <Select
                                label="Opérateur"
                                value={newActivation.operator}
                                onChange={(e) => setNewActivation({...newActivation, operator: e.target.value})}
                            >
                                <MenuItem value="Orange">Orange</MenuItem>
                                <MenuItem value="Ooredoo">Ooredoo</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Offre</InputLabel>
                            <Select
                                label="Offre"
                                value={newActivation.offre}
                                onChange={(e) => setNewActivation({...newActivation, offre: e.target.value})}
                            >
                                {allOffres.map((off) => (
                                    <MenuItem key={off.id} value={off.nom || off.name || off.title}>
                                        {off.nom || off.name || off.title}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenAddActivation(false)}>Annuler</Button>
                    <Button 
                        onClick={handleAddActivation} 
                        variant="contained" 
                        color="primary"
                        disabled={!newActivation.numero || !newActivation.operator || !newActivation.offre}
                    >
                        Enregistrer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DetailsClient;