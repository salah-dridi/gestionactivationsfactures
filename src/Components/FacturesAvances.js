import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { 
    collection, query, getDocs, addDoc, where, orderBy, startAt, endAt 
} from 'firebase/firestore';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
    Box, Button, Typography, Stack, Dialog, 
    DialogTitle, DialogContent, DialogActions, TextField, 
    Stepper, Step, StepLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import Swal from 'sweetalert2';

const FacturesAvances = () => {
    const [factures, setFactures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(0);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [formData, setFormData] = useState({
        idclient: '',
        cin: '',
        nom: '',
        prenom: '',
        numero: '',
        montant: '',
        date: new Date().toISOString().split('T')[0]
    });

    const steps = ['Check CIN', 'Confirm Client', 'Facture Details'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            let q;

            if (startDate && endDate) {
                q = query(
                    collection(db, "FacturesAvances"),
                    orderBy("date"),
                    startAt(startDate),
                    endAt(endDate)
                );
            } else {
                q = query(
                    collection(db, "FacturesAvances"),
                    orderBy("date", "desc")
                );
            }

            const querySnapshot = await getDocs(q);
            const finalData = querySnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));

            setFactures(finalData);
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

    const handleSaveFacture = async () => {
        if (formData.numero.length !== 8 || !formData.montant) {
            Swal.fire('Attention', 'Veuillez remplir tous les champs', 'warning');
            return;
        }

        try {
            await addDoc(collection(db, "FacturesAvances"), formData);
            
            Swal.fire('Succès', 'Facture enregistrée', 'success');
            setOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            Swal.fire('Erreur', 'Erreur lors de l\'enregistrement', 'error');
        }
    };

    const resetForm = () => {
        setFormData({ idclient: '', cin: '', nom: '', prenom: '', numero: '', montant: '', date: new Date().toISOString().split('T')[0] });
        setActiveStep(0);
    };

    const columns = [
        { field: 'cin', headerName: 'CIN', width: 120 },
        { field: 'nom', headerName: 'Nom', width: 130 },
        { field: 'prenom', headerName: 'Prénom', width: 130 },
        { field: 'numero', headerName: 'Numéro', width: 150 },
        { 
            field: 'montant', 
            headerName: 'Montant', 
            width: 130,
            renderCell: (params) => (
                <Typography sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {params.value} DT
                </Typography>
            )
        },
        { field: 'date', headerName: 'Date', width: 130 }
    ];

    const dateFieldStyle = {
        "& input::-webkit-calendar-picker-indicator": { cursor: 'pointer' },
        "& .MuiInputLabel-root": {
            transform: 'translate(14px, -9px) scale(0.75)',
            backgroundColor: 'white',
            padding: '0 4px'
        }
    };

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#001', mb: 3 }}>
                Factures en Avance
            </Typography>

            <Stack direction="row" spacing={2} mb={3} alignItems="center" sx={{ bgcolor: '#fff', p: 2, borderRadius: 2, boxShadow: 1 }}>
                <TextField 
                    label="Date Début" type="date" size="small" 
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 180, ...dateFieldStyle }}
                    value={startDate} onChange={(e) => setStartDate(e.target.value)}
                />
                <TextField 
                    label="Date Fin" type="date" size="small" 
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 180, ...dateFieldStyle }}
                    value={endDate} onChange={(e) => setEndDate(e.target.value)}
                />
                <Button variant="contained" startIcon={<SearchIcon />} onClick={fetchData} sx={{ bgcolor: '#4db2b6' }}>
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
                    Ajouter Facture
                </Button>
            </Stack>

            <Box sx={{ height: 600, width: '100%', bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                <DataGrid
                    rows={factures}
                    columns={columns}
                    loading={loading}
                    slots={{ toolbar: GridToolbar }}
                    disableRowSelectionOnClick
                />
            </Box>

            <Dialog open={open} onClose={() => { setOpen(false); resetForm(); }} fullWidth maxWidth="sm">
                <DialogTitle>Nouvelle Facture en Avance</DialogTitle>
                <DialogContent dividers>
                    <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 1 }}>
                        {steps.map((label) => (
                            <Step key={label}><StepLabel>{label}</StepLabel></Step>
                        ))}
                    </Stepper>

                    {activeStep === 0 && (
                        <TextField 
                            label="CIN Client" fullWidth autoFocus
                            value={formData.cin}
                            onChange={(e) => setFormData({...formData, cin: e.target.value.replace(/\D/g, '')})}
                            inputProps={{ maxLength: 8 }}
                        />
                    )}

                    {activeStep === 1 && (
                        <Box sx={{ p: 3, bgcolor: '#e0f2f1', borderRadius: 2, border: '1px solid #4db2b6' }}>
                            <Typography><strong>Nom:</strong> {formData.nom}</Typography>
                            <Typography><strong>Prénom:</strong> {formData.prenom}</Typography>
                            <Typography><strong>CIN:</strong> {formData.cin}</Typography>
                        </Box>
                    )}

                    {activeStep === 2 && (
                        <Stack spacing={3}>
                            <TextField 
                                label="Numéro" fullWidth autoFocus
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value.replace(/\D/g, '')})}
                                inputProps={{ maxLength: 8 }}
                            />
                            <TextField 
                                label="Montant (DT)" fullWidth type="number"
                                value={formData.montant}
                                onChange={(e) => setFormData({...formData, montant: e.target.value})}
                            />
                            <TextField 
                                label="Date" type="date" fullWidth 
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
                    {activeStep === 0 && <Button variant="contained" onClick={handleCheckClient} sx={{ bgcolor: '#4db2b6' }}>Suivant</Button>}
                    {activeStep === 1 && (
                        <>
                            <Button onClick={() => setActiveStep(0)}>Retour</Button>
                            <Button variant="contained" onClick={() => setActiveStep(2)} sx={{ bgcolor: '#4db2b6' }}>Confirmer</Button>
                        </>
                    )}
                    {activeStep === 2 && (
                        <>
                            <Button onClick={() => setActiveStep(1)}>Retour</Button>
                            <Button variant="contained" onClick={handleSaveFacture} sx={{ bgcolor: '#000' }}>Enregistrer</Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default FacturesAvances;