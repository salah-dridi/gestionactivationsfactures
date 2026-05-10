import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { 
    collection, query, getDocs, addDoc, where, orderBy, startAt, endAt 
} from 'firebase/firestore';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
    Box, Button, Typography, Stack, Dialog, 
    DialogTitle, DialogContent, DialogActions, TextField, 
    Stepper, Step, StepLabel, MenuItem // *** MODIFICATION: Added MenuItem ***
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import Swal from 'sweetalert2';

const ActivationsOrange = () => {
    const [activations, setActivations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [offres, setOffres] = useState([]); // *** MODIFICATION: State for Offres list ***

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [formData, setFormData] = useState({
        idclient: '',
        cin: '',
        nom: '',
        prenom: '',
        numero: '',
        offre: '',
        date: new Date().toISOString().split('T')[0]
    });

    const steps = ['Check CIN', 'Confirm Client', 'Activation Details'];

    useEffect(() => {
        fetchData();
        fetchOffres(); // *** MODIFICATION: Fetch offres on mount ***
    }, []);

    // *** MODIFICATION: Function to fetch offres from Firestore ***
    const fetchOffres = async () => {
        try {
            const q = query(collection(db, "Offres"));
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOffres(list);
        } catch (error) {
            console.error("Error fetching offres:", error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            let q;

            if (startDate && endDate) {
                q = query(
                    collection(db, "ActivationsOrange"),
                    orderBy("date"),
                    startAt(startDate),
                    endAt(endDate)
                );
            } else {
                q = query(
                    collection(db, "ActivationsOrange"),
                    orderBy("date", "desc")
                );
            }

            const querySnapshot = await getDocs(q);
            const finalData = querySnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));

            setActivations(finalData);
        } catch (error) {
            console.error("Fetch Error:", error);
            Swal.fire('Erreur', 'Erreur lors du chargement des données', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckClient = async () => {
        if (formData.cin.length !== 8) {
            Swal.fire('Attention', 'Le CIN doit contenir 8 chiffres', 'warning');
            return;
        }

        try {
            const q = query(collection(db, "Clients"), where("cin", "==", formData.cin));
            const snap = await getDocs(q);

            if (snap.empty) {
                Swal.fire('Info', 'Client non trouvé. Veuillez le créer d\'abord.', 'info');
            } else {
                const clientData = snap.docs[0].data();
                setFormData({
                    ...formData,
                    idclient: snap.docs[0].id,
                    nom: clientData.nom,
                    prenom: clientData.prenom
                });
                setActiveStep(1);
            }
        } catch (error) {
            Swal.fire('Erreur', 'Erreur de vérification', 'error');
        }
    };

    const handleSaveActivation = async () => {
        if (formData.numero.length !== 8 || !formData.offre) {
            Swal.fire('Attention', 'Veuillez remplir tous les champs', 'warning');
            return;
        }

        try {
            const qNum = query(collection(db, "ActivationsOrange"), where("numero", "==", formData.numero));
            const snapNum = await getDocs(qNum);
            
            if (!snapNum.empty) {
                Swal.fire('Erreur', 'Ce numéro existe déjà', 'error');
                return;
            }

            await addDoc(collection(db, "ActivationsOrange"), formData);
            
            Swal.fire('Succès', 'Activation enregistrée', 'success');
            setOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            Swal.fire('Erreur', 'Erreur lors de l\'enregistrement', 'error');
        }
    };

    const resetForm = () => {
        setFormData({ idclient: '', cin: '', nom: '', prenom: '', numero: '', offre: '', date: new Date().toISOString().split('T')[0] });
        setActiveStep(0);
    };

    const columns = [
        { field: 'cin', headerName: 'CIN', width: 130 },
        { field: 'nom', headerName: 'Nom', width: 150 },
        { field: 'prenom', headerName: 'Prénom', width: 150 },
        { field: 'numero', headerName: 'Numéro', width: 180, renderCell: (params) => (
            <Typography sx={{ color: '#ff7900', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {params.value}
            </Typography>
        )},
        { field: 'offre', headerName: 'Offre', width: 150 },
        { field: 'date', headerName: 'Date', width: 130 }
    ];

    const dateFieldStyle = {
        "& input::-webkit-calendar-picker-indicator": {
            cursor: 'pointer',
        },
        "& .MuiInputLabel-root": {
            transform: 'translate(14px, -9px) scale(0.75)', 
            backgroundColor: 'white',
            padding: '0 4px'
        }
    };

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff7900', mb: 3 }}>
                Activations Orange
            </Typography>

            <Stack direction="row" spacing={2} mb={3} alignItems="center" sx={{ bgcolor: '#fff', p: 2, borderRadius: 2, boxShadow: 1 }}>
                <TextField 
                    label="Date Début" 
                    type="date" 
                    size="small" 
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    sx={{ width: 200, ...dateFieldStyle }}
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <TextField 
                    label="Date Fin" 
                    type="date" 
                    size="small" 
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    sx={{ width: 200, ...dateFieldStyle }}
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                />
                <Button variant="contained" startIcon={<SearchIcon />} onClick={fetchData} sx={{ bgcolor: '#ff7900', '&:hover': { bgcolor: '#e66d00' } }}>
                    Filtrer
                </Button>

                {(startDate || endDate) && (
                    <Button variant="text" size="small" onClick={() => { setStartDate(''); setEndDate(''); fetchData(); }}>
                        Effacer
                    </Button>
                )}
                
                <Button 
                    variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
                    sx={{ ml: 'auto', bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
                >
                    Ajouter Activation
                </Button>
            </Stack>

            <Box sx={{ height: 600, width: '100%', bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                <DataGrid
                    rows={activations}
                    columns={columns}
                    loading={loading}
                    slots={{ toolbar: GridToolbar }}
                    disableRowSelectionOnClick
                />
            </Box>

            <Dialog open={open} onClose={() => { setOpen(false); resetForm(); }} fullWidth maxWidth="sm">
                <DialogTitle>Nouvelle Activation Orange</DialogTitle>
                <DialogContent dividers>
                    <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 1 }}>
                        {steps.map((label) => (
                            <Step key={label}><StepLabel>{label}</StepLabel></Step>
                        ))}
                    </Stepper>

                    {activeStep === 0 && (
                        <Stack spacing={3}>
                            <TextField 
                                label="CIN Client" fullWidth autoFocus
                                value={formData.cin}
                                onChange={(e) => setFormData({...formData, cin: e.target.value.replace(/\D/g, '')})}
                                inputProps={{ maxLength: 8 }}
                            />
                        </Stack>
                    )}

                    {activeStep === 1 && (
                        <Box sx={{ p: 3, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffb74d' }}>
                            <Typography variant="subtitle1" gutterBottom><strong>Confirmation Client</strong></Typography>
                            <Typography><strong>Nom:</strong> {formData.nom}</Typography>
                            <Typography><strong>Prénom:</strong> {formData.prenom}</Typography>
                            <Typography><strong>CIN:</strong> {formData.cin}</Typography>
                        </Box>
                    )}

                    {activeStep === 2 && (
                        <Stack spacing={3}>
                            <TextField 
                                label="Numéro Orange" fullWidth autoFocus
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value.replace(/\D/g, '')})}
                                inputProps={{ maxLength: 8 }}
                            />
                            
                            {/* *** MODIFICATION: Changed TextField to Select for Offres *** */}
                            <TextField 
                                select
                                label="Choisir l'offre" 
                                fullWidth
                                value={formData.offre}
                                onChange={(e) => setFormData({...formData, offre: e.target.value})}
                            >
                                {offres.map((option) => (
                                    <MenuItem key={option.id} value={option.nom}>
                                        {option.nom}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField 
                                label="Date d'activation" 
                                type="date" 
                                fullWidth 
                                InputLabelProps={{ shrink: true }}
                                sx={dateFieldStyle}
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => { setOpen(false); resetForm(); }}>Annuler</Button>
                    {activeStep === 0 && (
                        <Button variant="contained" onClick={handleCheckClient} sx={{ bgcolor: '#ff7900' }}>Suivant</Button>
                    )}
                    {activeStep === 1 && (
                        <>
                            <Button onClick={() => setActiveStep(0)}>Retour</Button>
                            <Button variant="contained" onClick={() => setActiveStep(2)} sx={{ bgcolor: '#ff7900' }}>Confirmer</Button>
                        </>
                    )}
                    {activeStep === 2 && (
                        <>
                            <Button onClick={() => setActiveStep(1)}>Retour</Button>
                            <Button variant="contained" onClick={handleSaveActivation} sx={{ bgcolor: '#ff7900' }}>Enregistrer</Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ActivationsOrange;