import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { 
    collection, query, getDocs, addDoc, where, orderBy, startAt, endAt 
} from 'firebase/firestore';
import { DataGrid, GridToolbar } from '@mui/x-data-grid'; 
import { 
    Box, Button, Typography, Stack, Dialog, 
    DialogTitle, DialogContent, DialogActions, TextField, 
    Stepper, Step, StepLabel, MenuItem, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Checkbox, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const ActivationsOrange = () => {
    const [activations, setActivations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [offres, setOffres] = useState([]); 

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [openExport, setOpenExport] = useState(false);
    const [exportStep, setExportStep] = useState(0);
    const [selectedOffres, setSelectedOffres] = useState([]);
    const [exportDates, setExportDates] = useState({ start: '', end: '' });
    const [exportTitle, setExportTitle] = useState('');
    const [exportResult, setExportResult] = useState(null);

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
    const exportSteps = ['Sélection Offres', 'Période', 'Titre & Aperçu'];

    useEffect(() => {
        fetchData();
        fetchOffres();
    }, []);

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
            const activationsRef = collection(db, "ActivationsOrange");

            if (startDate && endDate) {
                q = query(activationsRef, orderBy("date"), startAt(startDate), endAt(endDate));
            } else if (startDate) {
                q = query(activationsRef, orderBy("date"), startAt(startDate));
            } else if (endDate) {
                q = query(activationsRef, orderBy("date"), endAt(endDate));
            } else {
                q = query(activationsRef, orderBy("date", "desc"));
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

    const prepareExportData = () => {
        let filtered = [...activations];

        if (selectedOffres.length > 0) {
            filtered = filtered.filter(acc => selectedOffres.includes(acc.offre));
        }

        if (exportDates.start && exportDates.end) {
            filtered = filtered.filter(acc => acc.date >= exportDates.start && acc.date <= exportDates.end);
        } else if (exportDates.start) {
            filtered = filtered.filter(acc => acc.date >= exportDates.start);
        } else if (exportDates.end) {
            filtered = filtered.filter(acc => acc.date <= exportDates.end);
        }

        if (filtered.length === 0) return null;

        const grouped = filtered.reduce((acc, curr) => {
            const key = curr.cin;
            if (!acc[key]) {
                acc[key] = {
                    cin: curr.cin,
                    fullName: `${curr.nom} ${curr.prenom}`,
                    numeros: []
                };
            }
            if (!acc[key].numeros.includes(curr.numero)) {
                acc[key].numeros.push(curr.numero);
            }
            return acc;
        }, {});

        const baseDate = exportDates.end ? new Date(exportDates.end) : new Date();
        const getMonthName = (offset) => {
            const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
            return d.toLocaleString('fr-FR', { month: 'long' });
        };

        const months = [getMonthName(1), getMonthName(2), getMonthName(3), getMonthName(4)];
        
        return {
            title: exportTitle,
            count: filtered.length,
            data: Object.values(grouped),
            months: months
        };
    };

    const handleGenerateExport = () => {
        const result = prepareExportData();
        if (!result) {
            Swal.fire('Info', 'Aucune donnée à exporter', 'info');
            return;
        }

        const headerInfo = [
            { "CIN": result.title || "Export Activations" },
            { "CIN": `Nombre d'activations : ${result.count}` },
            {} 
        ];

        const tableData = result.data.map(row => {
            const rowObj = {
                "CIN": row.cin,
                "Nom & Prénom": row.fullName,
                "Numéros": row.numeros.join(' / ')
            };
            result.months.forEach(m => { rowObj[m] = ""; });
            return rowObj;
        });

        const worksheet = XLSX.utils.json_to_sheet(tableData, { origin: "A4" });
        XLSX.utils.sheet_add_json(worksheet, headerInfo, { skipHeader: true, origin: "A1" });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Activations");
        XLSX.writeFile(workbook, `${exportTitle || 'export_activations'}.xlsx`);
        setOpenExport(false);
        setExportStep(0);
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
            const qOrange = query(collection(db, "ActivationsOrange"), where("numero", "==", formData.numero));
            const snapOrange = await getDocs(qOrange);
            
            const qOoredoo = query(collection(db, "ActivationsOoredoo"), where("numero", "==", formData.numero));
            const snapOoredoo = await getDocs(qOoredoo);

            if (!snapOrange.empty || !snapOoredoo.empty) {
                Swal.fire('Erreur', 'Ce numéro existe déjà (Orange ou Ooredoo)', 'error');
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
        "& input::-webkit-calendar-picker-indicator": { cursor: 'pointer' },
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
                    label="Date Début" type="date" size="small" 
                    InputLabelProps={{ shrink: true }} sx={{ width: 180, ...dateFieldStyle }}
                    value={startDate} onChange={(e) => setStartDate(e.target.value)}
                />
                <TextField 
                    label="Date Fin" type="date" size="small" 
                    InputLabelProps={{ shrink: true }} sx={{ width: 180, ...dateFieldStyle }}
                    value={endDate} onChange={(e) => setEndDate(e.target.value)}
                />
                <Button variant="contained" startIcon={<SearchIcon />} onClick={fetchData} sx={{ bgcolor: '#ff7900' }}>
                    Filtrer
                </Button>

                <Button 
                    variant="contained" startIcon={<FileDownloadIcon />} 
                    onClick={() => setOpenExport(true)}
                    sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                >
                    Exporter Tableau
                </Button>
                
                <Button 
                    variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
                    sx={{ ml: 'auto', bgcolor: '#000' }}
                >
                    Ajouter Activation
                </Button>
            </Stack>

            <Box sx={{ height: 600, width: '100%', bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                <DataGrid
                    rows={activations} columns={columns} loading={loading}
                    slots={{ toolbar: GridToolbar }} disableRowSelectionOnClick
                />
            </Box>

            <Dialog open={openExport} onClose={() => {setOpenExport(false); setExportStep(0);}} fullWidth maxWidth="md">
                <DialogTitle>Exporter le Tableau Récapitulatif</DialogTitle>
                <DialogContent dividers>
                    <Stepper activeStep={exportStep} sx={{ mb: 4 }}>
                        {exportSteps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                    </Stepper>

                    {exportStep === 0 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Sélectionnez les offres :</Typography>
                            <FormControlLabel
                                control={<Checkbox checked={selectedOffres.length === offres.length && offres.length > 0} 
                                onChange={(e) => setSelectedOffres(e.target.checked ? offres.map(o => o.nom) : [])} />}
                                label="Sélectionner tout"
                            />
                            <Stack direction="row" flexWrap="wrap" spacing={1}>
                                {offres.map((off) => (
                                    <FormControlLabel
                                        key={off.id}
                                        control={<Checkbox 
                                            checked={selectedOffres.includes(off.nom)}
                                            onChange={(e) => {
                                                if(e.target.checked) setSelectedOffres([...selectedOffres, off.nom]);
                                                else setSelectedOffres(selectedOffres.filter(o => o !== off.nom));
                                            }}
                                        />}
                                        label={off.nom}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {exportStep === 1 && (
                        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                            <TextField label="Du" type="date" fullWidth InputLabelProps={{ shrink: true }} sx={dateFieldStyle}
                                value={exportDates.start} onChange={(e) => setExportDates({...exportDates, start: e.target.value})} />
                            <TextField label="Au" type="date" fullWidth InputLabelProps={{ shrink: true }} sx={dateFieldStyle}
                                value={exportDates.end} onChange={(e) => setExportDates({...exportDates, end: e.target.value})} />
                        </Stack>
                    )}

                    {exportStep === 2 && (
                        <Box>
                            <TextField label="Titre du tableau" fullWidth sx={{ mb: 3 }} placeholder="Ex: Offre GigaKlem Mois Avril 2026"
                                value={exportTitle} onChange={(e) => setExportTitle(e.target.value)} />
                            
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Aperçu des données :</Typography>
                            {(() => {
                                const result = prepareExportData();
                                if (!result) return <Typography color="error">Aucune donnée trouvée.</Typography>;
                                return (
                                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                                    <TableCell>CIN</TableCell>
                                                    <TableCell>Nom & Prénom</TableCell>
                                                    <TableCell>Numéros</TableCell>
                                                    {result.months.map(m => <TableCell key={m} align="center">{m}</TableCell>)}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {result.data.map((row) => (
                                                    <TableRow key={row.cin}>
                                                        <TableCell>{row.cin}</TableCell>
                                                        <TableCell>{row.fullName}</TableCell>
                                                        <TableCell>{row.numeros.join(' / ')}</TableCell>
                                                        {result.months.map(m => <TableCell key={m} align="center"></TableCell>)}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                );
                            })()}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {setOpenExport(false); setExportStep(0);}}>Fermer</Button>
                    {exportStep > 0 && <Button onClick={() => setExportStep(exportStep - 1)}>Retour</Button>}
                    {exportStep < 2 && <Button variant="contained" onClick={() => setExportStep(exportStep + 1)}>Suivant</Button>}
                    {exportStep === 2 && <Button variant="contained" color="success" onClick={handleGenerateExport}>Enregistrer</Button>}
                </DialogActions>
            </Dialog>

            <Dialog open={open} onClose={() => { setOpen(false); resetForm(); }} fullWidth maxWidth="sm">
                <DialogTitle>Nouvelle Activation Orange</DialogTitle>
                <DialogContent dividers>
                    <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 1 }}>
                        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                    </Stepper>

                    {activeStep === 0 && (
                        <TextField 
                            label="CIN Client" fullWidth autoFocus value={formData.cin}
                            onChange={(e) => setFormData({...formData, cin: e.target.value.replace(/\D/g, '')})}
                            inputProps={{ maxLength: 8 }}
                        />
                    )}

                    {activeStep === 1 && (
                        <Box sx={{ p: 3, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffb74d' }}>
                            <Typography><strong>Nom:</strong> {formData.nom}</Typography>
                            <Typography><strong>Prénom:</strong> {formData.prenom}</Typography>
                            <Typography><strong>CIN:</strong> {formData.cin}</Typography>
                        </Box>
                    )}

                    {activeStep === 2 && (
                        <Stack spacing={3}>
                            <TextField 
                                label="Numéro Orange" fullWidth value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value.replace(/\D/g, '')})}
                                inputProps={{ maxLength: 8 }}
                            />
                            <TextField 
                                select label="Choisir l'offre" fullWidth value={formData.offre}
                                onChange={(e) => setFormData({...formData, offre: e.target.value})}
                            >
                                {offres.map((option) => (
                                    <MenuItem key={option.id} value={option.nom}>{option.nom}</MenuItem>
                                ))}
                            </TextField>
                            <TextField 
                                label="Date d'activation" type="date" fullWidth InputLabelProps={{ shrink: true }}
                                sx={dateFieldStyle} value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)}>Annuler</Button>
                    {activeStep === 0 && <Button variant="contained" onClick={handleCheckClient} sx={{ bgcolor: '#ff7900' }}>Suivant</Button>}
                    {activeStep === 1 && <><Button onClick={() => setActiveStep(0)}>Retour</Button><Button variant="contained" onClick={() => setActiveStep(2)} sx={{ bgcolor: '#ff7900' }}>Confirmer</Button></>}
                    {activeStep === 2 && <><Button onClick={() => setActiveStep(1)}>Retour</Button><Button variant="contained" onClick={handleSaveActivation} sx={{ bgcolor: '#ff7900' }}>Enregistrer</Button></>}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ActivationsOrange;