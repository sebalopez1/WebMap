const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Habilitar CORS para todas las rutas
app.use(cors());

// Middleware para parsear JSON
app.use(bodyParser.json());


app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/rasters', express.static(path.join(__dirname, 'rasters')));
app.use('/vectoriales', express.static(path.join(__dirname, 'vectoriales')));

const filePath = path.join(__dirname, 'vectoriales/catastro.geojson');

// Ruta para obtener la capa de catastro
app.get('/catastro', (req, res) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error al leer el archivo GeoJSON:", err);
            return res.status(500).send("Error al leer el archivo GeoJSON");
        }
        res.json(JSON.parse(data));
    });
});

// Ruta para agregar un nuevo polígono en el archivo GeoJSON (POST)
app.post('/update-catastro', (req, res) => {
    const newFeature = req.body;
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error al leer el archivo GeoJSON:", err);
            return res.status(500).send("Error al leer el archivo GeoJSON");
        }

        let geojson;
        try {
            geojson = JSON.parse(data);
        } catch (parseError) {
            console.error("Error al parsear el archivo GeoJSON:", parseError);
            return res.status(500).send("Error al parsear el archivo GeoJSON");
        }

        geojson.features.push(newFeature); // Agregar el nuevo polígono

        fs.writeFile(filePath, JSON.stringify(geojson, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error("Error al escribir el archivo GeoJSON:", writeErr);
                return res.status(500).send("Error al guardar el polígono");
            }
            res.send("Polígono agregado correctamente");
        });
    });
});

// Ruta para actualizar un polígono existente en el archivo GeoJSON (PUT)
app.put('/update-catastro', (req, res) => {
    const updatedFeature = req.body;
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error al leer el archivo GeoJSON:", err);
            return res.status(500).send("Error al leer el archivo GeoJSON");
        }

        let geojson;
        try {
            geojson = JSON.parse(data);
        } catch (parseError) {
            console.error("Error al parsear el archivo GeoJSON:", parseError);
            return res.status(500).send("Error al parsear el archivo GeoJSON");
        }

        // Buscar el polígono existente y actualizar sus propiedades
        const index = geojson.features.findIndex(feature => feature.properties.id === updatedFeature.properties.id);
        if (index >= 0) {
            geojson.features[index] = updatedFeature;
        } else {
            geojson.features.push(updatedFeature); // Agregar si no existe
        }

        fs.writeFile(filePath, JSON.stringify(geojson, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error("Error al escribir el archivo GeoJSON:", writeErr);
                return res.status(500).send("Error al guardar el polígono");
            }
            res.send("Polígono actualizado correctamente");
        });
    });
});

// Ruta para eliminar un polígono en el archivo GeoJSON
app.delete('/delete-catastro', (req, res) => {
    const { id } = req.body; // Espera recibir solo el ID

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error al leer el archivo GeoJSON:", err);
            return res.status(500).send("Error al leer el archivo GeoJSON");
        }

        let geojson;
        try {
            geojson = JSON.parse(data);
        } catch (parseError) {
            console.error("Error al parsear el archivo GeoJSON:", parseError);
            return res.status(500).send("Error al parsear el archivo GeoJSON");
        }

        // Filtrar el polígono que se quiere eliminar basado en el ID y eliminarlo completamente
        geojson.features = geojson.features.filter(feature => feature.properties.id !== id);

        fs.writeFile(filePath, JSON.stringify(geojson, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error("Error al escribir el archivo GeoJSON:", writeErr);
                return res.status(500).send("Error al eliminar el polígono");
            }
            res.send("Polígono eliminado correctamente");
        });
    });
});

// Ruta para servir el archivo canerias.geojson (solo lectura)
app.get('/canerias', (req, res) => {
    const filePath = path.join(__dirname, 'vectoriales/canerias.geojson');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error al leer el archivo de cañerías:", err);
            res.status(500).send("Error al leer el archivo de cañerías");
        } else {
            res.json(JSON.parse(data));
        }
    });
});

// Ruta principal para servir index.html desde la carpeta 'public'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});










const dangerPointsPath = path.join(__dirname, './vectoriales/danger-points.geojson');

// Ruta para obtener los puntos de peligro
app.get('/danger-points', (req, res) => {
    try {
        if (!fs.existsSync(dangerPointsPath)) {
            // Crear el archivo si no existe
            const initialData = { type: 'FeatureCollection', features: [] };
            fs.writeFileSync(dangerPointsPath, JSON.stringify(initialData, null, 2));
        }

        const data = JSON.parse(fs.readFileSync(dangerPointsPath));
        res.json(data);
    } catch (error) {
        console.error('Error al cargar los puntos de peligro:', error);
        res.status(500).send('Error al cargar los puntos de peligro.');
    }
});

// Ruta para añadir un punto de peligro
app.post('/add-danger-point', (req, res) => {
    try {
        console.log('Datos recibidos en /add-danger-point:', req.body); // Log para depuración

        const { lat, lng, id } = req.body; // Recibe las coordenadas y el ID

        if (!lat || !lng || !id) {
            console.error('Faltan datos: lat, lng o id.'); // Log de error
            return res.status(400).send('Faltan datos: lat, lng o id.');
        }

        if (!fs.existsSync(dangerPointsPath)) {
            // Crear el archivo si no existe
            const initialData = { type: 'FeatureCollection', features: [] };
            fs.writeFileSync(dangerPointsPath, JSON.stringify(initialData, null, 2));
        }

        const data = JSON.parse(fs.readFileSync(dangerPointsPath));

        // Crear la nueva Feature
        const newFeature = {
            type: "Feature",
            properties: { id },
            geometry: {
                type: "Point",
                coordinates: [lng, lat]
            }
        };

        // Agregar la nueva Feature al archivo
        data.features.push(newFeature);

        // Guardar el archivo actualizado
        fs.writeFileSync(dangerPointsPath, JSON.stringify(data, null, 2));
        res.status(200).send('Punto añadido.');
    } catch (error) {
        console.error('Error al añadir el punto de peligro:', error);
        res.status(500).send('Error al añadir el punto de peligro.');
    }
});

// Ruta para eliminar un punto de peligro
app.delete('/delete-danger-point', (req, res) => {
    try {
        console.log('Datos recibidos en /delete-danger-point:', req.body); // Log para depuración
        const { id } = req.body;

        if (!id) {
            return res.status(400).send('Falta el ID del punto a eliminar.');
        }

        if (!fs.existsSync(dangerPointsPath)) {
            return res.status(404).send('El archivo de puntos de peligro no existe.');
        }

        const data = JSON.parse(fs.readFileSync(dangerPointsPath));

        // Filtrar los puntos para eliminar el que coincide con el ID
        const filteredFeatures = data.features.filter(
            (feature) => String(feature.properties.id) !== String(id)
        );

        if (filteredFeatures.length === data.features.length) {
            return res.status(404).send('Punto no encontrado.');
        }

        // Guardar el archivo actualizado
        data.features = filteredFeatures;
        fs.writeFileSync(dangerPointsPath, JSON.stringify(data, null, 2));

        res.status(200).send('Punto eliminado.');
    } catch (error) {
        console.error('Error al eliminar el punto de peligro:', error);
        res.status(500).send('Error al eliminar el punto de peligro.');
    }
});

// Servidor en ejecución
app.listen(3000, () => {
    console.log('Servidor ejecutándose en http://localhost:3000');
});