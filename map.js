const map = L.map('map', {
    center: [-37.47308, -72.34400],
    zoom: 18
});

L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 30,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Maps'
}).addTo(map);

const boundsMosaico = [[-37.474705428, -72.344911611], [-37.472545431, -72.342623754]];
const boundsRadiacion = [[-37.474705, -72.344911], [-37.472546, -72.342624]];

const mosaicoLayer = L.imageOverlay('/rasters/mosaico.png', boundsMosaico, { opacity: 0.7 }).addTo(map);
const radiacionLayer = L.imageOverlay('/rasters/radiacion.png', boundsRadiacion, { opacity: 0.7 });

let layerControl;
const overlayMaps = {
    "Ortofotografía": mosaicoLayer,
    "Radiación Solar": radiacionLayer
};

function updateLayerControl() {
    if (layerControl) {
        map.removeControl(layerControl);
    }
    layerControl = L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);
}

updateLayerControl();

var coordControl = L.control({ position: 'bottomleft' });
coordControl.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'coord-control');
    div.style.backgroundColor = 'white';
    div.style.padding = '5px';
    div.style.fontSize = '14px';
    div.style.border = '1px solid #ccc';
    div.innerHTML = "Lat: , Lng: ";
    return div;
};
coordControl.addTo(map);

map.on('mousemove', function(e) {
    var lat = e.latlng.lat.toFixed(5);
    var lng = e.latlng.lng.toFixed(5);
    coordControl.getContainer().innerHTML = "Lat: " + lat + ", Lng: " + lng;
});

function setLayerOpacity(layer, value) {
    layer.setOpacity(value / 100);
}

const opacityControl = L.control({ position: 'topright' });
opacityControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'opacity-control');
    div.innerHTML = `
        <label>Opacidad Ortofotografía</label>
        <input type="range" id="mosaicoOpacity" min="0" max="100" value="70">
        <label>Opacidad Radiación</label>
        <input type="range" id="radiacionOpacity" min="0" max="100" value="70">
    `;
    return div;
};
opacityControl.addTo(map);

document.getElementById('mosaicoOpacity').addEventListener('input', function() {
    setLayerOpacity(mosaicoLayer, this.value);
});
document.getElementById('radiacionOpacity').addEventListener('input', function() {
    setLayerOpacity(radiacionLayer, this.value);
});

const editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);

const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: editableLayers,
        edit: false,
        remove: false
    },
    draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false
    }
});
map.addControl(drawControl);

const defaultAttributes = {
    id: null,
    nombre: "",
    elemento: "",
    descrip: "",
    dimension: "",
    detalle: "",
    ubicacion: "",
    estado: "",
    fecha_reg: "",
    restricc: "",
    comentario: "",
    estado_obs: ""
};

let currentFeature = null;
let currentLayer = null;

function loadCatastroLayer() {
    fetch('http://localhost:3000/catastro')
        .then(response => response.json())
        .then(data => {
            editableLayers.clearLayers();

            L.geoJSON(data, {
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<button onclick="openEditModal()">Editar</button>');
                    layer.on('popupopen', function() {
                        currentFeature = feature;
                        currentLayer = layer;
                    });
                },
                style: { color: "#FF5733", weight: 2 }
            }).addTo(editableLayers);

            map.fitBounds(editableLayers.getBounds());
        })
        .catch(error => console.error("Error cargando el archivo GeoJSON:", error));
}

function openEditModal() {
    if (!currentFeature) return;

    const editTable = document.getElementById("editTable");
    editTable.innerHTML = "";

    for (let key in defaultAttributes) {
        const value = currentFeature.properties[key] !== undefined ? currentFeature.properties[key] : defaultAttributes[key];
        const row = editTable.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        cell1.innerHTML = `<strong>${key}</strong>`;
        cell2.innerHTML = `<input type="text" id="${key}" value="${value}" />`;
    }

    let deleteButton = document.getElementById("deleteButton");
    if (!deleteButton) {
        deleteButton = document.createElement("button");
        deleteButton.id = "deleteButton";
        deleteButton.textContent = "Eliminar Polígono";
        deleteButton.onclick = deleteCurrentPolygon;
        editTable.parentNode.appendChild(deleteButton);
    }

    document.getElementById("editModal").style.display = "block";
}

function closeModal() {
    document.getElementById("editModal").style.display = "none";
}

function saveChanges() {
    if (!currentFeature) return;

    for (let key in defaultAttributes) {
        const input = document.getElementById(key);
        if (input) {
            currentFeature.properties[key] = key === "id" ? parseInt(input.value, 10) : input.value;
        }
    }

    savePolygon(currentFeature, true);
    closeModal();
}

function savePolygon(feature, isUpdate = false) {
    fetch('http://localhost:3000/update-catastro', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feature)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(errorMessage => {
                console.error("Error del servidor:", errorMessage);
                alert("Error al guardar: " + errorMessage);
            });
        }
        alert("Cambios guardados");
        location.reload();
    })
    .catch(error => console.error("Error al enviar los datos:", error));
}

function deletePolygon(feature) {
    if (confirm("¿Estás seguro de que deseas eliminar este polígono?")) {
        fetch('http://localhost:3000/delete-catastro', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: feature.properties.id })
        })
        .then(response => {
            if (response.ok) {
                alert("Polígono eliminado");
                if (currentLayer) editableLayers.removeLayer(currentLayer);
                location.reload();
            } else {
                alert("Error al eliminar");
            }
        })
        .catch(error => console.error("Error al enviar los datos al backend:", error));
    }
}

function deleteCurrentPolygon() {
    if (currentFeature) {
        deletePolygon(currentFeature);
    }
}

map.on(L.Draw.Event.CREATED, function(event) {
    const layer = event.layer;
    editableLayers.addLayer(layer);

    const feature = layer.toGeoJSON();
    feature.properties = { ...defaultAttributes, id: Number(Date.now()) };

    savePolygon(feature);
});

loadCatastroLayer();

// Cargar la capa de cañerías (GeoJSON), solo para visualización
fetch('http://localhost:3000/canerias')
    .then(response => response.json())
    .then(data => {
        var caneriasLayer = L.geoJSON(data, {
            style: function(feature) {
                return { color: "#007BFF", weight: 2 };
            },
            onEachFeature: function (feature, layer) {
                layer.bindPopup("<strong>Información de la Cañería:</strong><br>" +
                                "ID: " + (feature.properties.FID || "N/A") + "<br>" +
                                "Diámetro: " + (feature.properties.diametro || "N/A") + "<br>" +
                                "Material: " + (feature.properties.material || "N/A") + "<br>" +
                                "Tipo de cañeria: " + (feature.properties.capa || "N/A"));
            }
        });

        overlayMaps["Cañerías"] = caneriasLayer;
        overlayMaps["Catastro"] = editableLayers;
        updateLayerControl();
    })
    .catch(error => console.error("Error cargando el archivo GeoJSON de cañerías:", error));

    // Función para contar los polígonos por sus IDs
function countPolygons() {
    fetch('http://localhost:3000/catastro')
        .then(response => response.json())
        .then(data => {
            const polygonCount = data.features.filter(feature => feature.properties.id !== undefined).length;
            document.getElementById("polygonCount").textContent = `Total de polígonos: ${polygonCount}`;
        })
        .catch(error => console.error("Error al contar polígonos:", error));
}

// Llama a esta función después de cargar la capa de catastro
function loadCatastroLayer() {
    fetch('http://localhost:3000/catastro')
        .then(response => response.json())
        .then(data => {
            editableLayers.clearLayers();

            L.geoJSON(data, {
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<button onclick="openEditModal()">Editar</button>');
                    layer.on('popupopen', function() {
                        currentFeature = feature;
                        currentLayer = layer;
                    });
                },
                style: { color: "#FF5733", weight: 2 }
            }).addTo(editableLayers);

            map.fitBounds(editableLayers.getBounds());
            countPolygons(); // Actualiza la cuenta de polígonos
        })
        .catch(error => console.error("Error cargando el archivo GeoJSON:", error));
}

function countPolygons() {
    fetch('http://localhost:3000/catastro')
        .then(response => response.json())
        .then(data => {
            // Validar que el archivo tenga un arreglo de "features"
            if (data && Array.isArray(data.features)) {
                const polygonCount = data.features.length; // Contar todas las características
                document.getElementById("polygonCount").textContent = `Total de polígonos: ${polygonCount}`;
            } else {
                console.error("El archivo GeoJSON no contiene características válidas.");
                document.getElementById("polygonCount").textContent = "Total de polígonos: 0";
            }
        })
        .catch(error => {
            console.error("Error al contar polígonos:", error);
            document.getElementById("polygonCount").textContent = "Total de polígonos: 0";
        });
}

// Función para calcular el área de un polígono en coordenadas geográficas
function calculatePolygonArea(coordinates) {
    const R = 6371000; // Radio de la Tierra en metros
    let area = 0;

    if (coordinates.length < 3) return 0; // Un polígono necesita al menos 3 puntos

    // Iterar sobre cada par de puntos
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lon1, lat1] = coordinates[i];
        const [lon2, lat2] = coordinates[i + 1];

        // Convertir latitudes y longitudes a radianes
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        // Calcular la fórmula de área esférica
        area += Math.sin(φ1) * Math.sin(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    }

    // Multiplicar por el radio de la Tierra al cuadrado
    area = Math.abs(area * R * R);

    return area; // Retorna el área en metros cuadrados
}

// Función para renderizar el gráfico
function renderDimensionChart() {
    fetch('http://localhost:3000/catastro') // Cambia esta ruta si es necesario
        .then(response => response.json())
        .then(data => {
            const dimensions = [];
            const labels = [];
            const pointCounts = []; // Nueva métrica para contar puntos
            const tableBody = document.querySelector('#polygonTable tbody'); // Selecciona el cuerpo de la tabla
            tableBody.innerHTML = ''; // Limpia la tabla antes de llenarla

            data.features.forEach((feature, index) => {
                const coordinates = feature.geometry.coordinates[0]; // Primer anillo del polígono
                const area = calculatePolygonArea(coordinates); // Calcular el área
                const polygonID = feature.properties.id || `Sin ID`;

                // Añadir filas a la tabla
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${polygonID}</td>
                `;
                tableBody.appendChild(row);

                // Usar números consecutivos como etiquetas
                labels.push(index + 1);
                dimensions.push(area); // Guardar el área calculada
            });

            // Crear o actualizar el gráfico
            const ctx = document.getElementById('dimensionChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels, // Números consecutivos como etiquetas
                    datasets: [
                        {
                            label: 'Área (m²)',
                            data: dimensions,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function (tooltipItem) {
                                    return `Área: ${dimensions[tooltipItem.dataIndex].toFixed(2)} m²`;
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Áreas (m²) para cada polígono'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Valores'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Número de Polígono'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error("Error al cargar las dimensiones:", error));
}

// Llamar a la función después de que se haya cargado el mapa o los datos
renderDimensionChart();






const dangerPointControl = L.control({ position: 'topright' });
const serverUrl = 'http://localhost:3000'; // Puerto donde opera el servidor

let isAddingDangerPoint = false; // Controla el estado de agregar puntos
const bufferRadius = 0.5; // Radio del buffer en metros
let connectingLine = null; // Variable para la línea que conecta los puntos

// Crear la capa específica para los puntos peligrosos
const dangerPointsLayer = new L.FeatureGroup();
map.addLayer(dangerPointsLayer);

// Crear la línea que conecta los puntos
const connectingLineLayer = L.layerGroup(); // Usamos un LayerGroup para facilitar el control
map.addLayer(connectingLineLayer);

// Llamar a esta función al cargar el mapa para mostrar los puntos guardados
loadDangerPoints();

// Control personalizado para agregar puntos de peligro
dangerPointControl.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = `
        <button id="addDangerPoint" style="background-color: red; color: white; font-size: 14px; padding: 5px; border: none; cursor: pointer;">
            Agregar Punto de Peligro
        </button>`;
    div.onclick = function (e) {
        e.stopPropagation(); // Evitar que el evento llegue al mapa
        isAddingDangerPoint = true; // Activar modo de agregar puntos
        map.getContainer().style.cursor = 'crosshair'; // Cambiar el cursor
        alert('Haz clic en el mapa para agregar un punto de peligro.');
    };
    return div;
};
dangerPointControl.addTo(map);

// Al hacer clic en el mapa, agregar un punto si está activado el modo
map.on('click', function (e) {
    if (isAddingDangerPoint) {
        const latlng = e.latlng; // Coordenadas del clic
        addDangerPoint(latlng); // Agregar el punto
        isAddingDangerPoint = false; // Desactivar el modo
        map.getContainer().style.cursor = ''; // Restaurar el cursor
    }
});

// Agregar un punto de peligro al mapa y guardarlo en el servidor
function addDangerPoint(latlng) {
    const pointFeature = {
        lat: latlng.lat, // Asegúrate de enviar directamente `lat`
        lng: latlng.lng, // Asegúrate de enviar directamente `lng`
        id: Date.now()   // Generar un ID único
    };

    console.log('Enviando datos al servidor:', pointFeature);

    // Guardar el punto en el servidor
    fetch(`${serverUrl}/add-danger-point`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pointFeature),
    })
        .then((response) => {
            if (response.ok) {
                alert('Punto de peligro guardado correctamente.');
                loadDangerPoints(); // Recargar los puntos y la línea
            } else {
                console.error('Error al guardar el punto:', response.status);
                alert('Error al guardar el punto de peligro.');
            }
        })
        .catch((error) => console.error('Error al guardar el punto:', error));
}

// Cargar los puntos de peligro desde el servidor
function loadDangerPoints() {
    // Limpia la capa antes de cargar nuevos puntos
    dangerPointsLayer.clearLayers();
    connectingLineLayer.clearLayers(); // Limpia la línea anterior

    fetch(`${serverUrl}/danger-points`)
        .then((response) => response.json())
        .then((data) => {
            console.log('Datos recibidos del servidor:', data); // Log para depuración

            const points = []; // Almacena los puntos para la línea

            data.features
                .sort((a, b) => a.properties.id - b.properties.id) // Ordenar por ID
                .forEach((feature) => {
                    const [lng, lat] = feature.geometry.coordinates;
                    const latlng = { lat, lng };

                    points.push([lat, lng]); // Guardar en formato [lat, lng] para L.polyline

                    // Añadir el círculo al mapa
                    const circle = L.circle(latlng, {
                        radius: bufferRadius, // Radio en metros
                        color: 'red', // Color del borde
                        fillColor: '#f03', // Color de relleno
                        fillOpacity: 0.2 // Opacidad del relleno
                    }).addTo(dangerPointsLayer);

                    // Asignar popup para eliminar el punto
                    circle.bindPopup(`
                        <strong>Punto de Peligro</strong><br>
                        ID: ${feature.properties.id}<br>
                        <button onclick="deleteDangerPoint(${feature.properties.id})">Eliminar</button>
                    `);
                });

            // Actualizar la línea que conecta los puntos
            updateConnectingLine(points);

            // Centrar el mapa en los puntos cargados, si existen
            if (data.features.length > 0) {
                const bounds = dangerPointsLayer.getBounds();
                map.fitBounds(bounds);
            }
        })
        .catch((error) => console.error('Error al cargar los puntos de peligro:', error));
}

// Actualizar la línea que conecta los puntos
function updateConnectingLine(points) {
    if (connectingLine) {
        map.removeLayer(connectingLine); // Eliminar línea existente
    }

    if (points.length > 1) {
        // Crear la línea
        connectingLine = L.polyline(points, {
            color: 'red', // Color de la línea
            weight: 5, // Grosor fijo de la línea en píxeles
            opacity: 0.8, // Opacidad
            pane: 'fixed-line' // Usar un pane para mantener la escala fija
        });

        // Agregar la línea al mapa
        connectingLine.addTo(connectingLineLayer);

        // Configurar el pane para evitar el escalado
        map.getPane('fixed-line').style.transform = 'scale(1)'; // Mantener la escala fija
        map.getPane('fixed-line').style.zIndex = 600; // Asegurar que esté por encima de otras capas
    }
}

// Crear un nuevo pane para las líneas que no escalan
map.createPane('fixed-line');
map.getPane('fixed-line').style.pointerEvents = 'none'; // Hacerlo no interactivo


// Eliminar un punto de peligro por su ID
function deleteDangerPoint(id) {
    fetch(`${serverUrl}/delete-danger-point`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
    })
        .then((response) => {
            if (response.ok) {
                alert('Punto eliminado.');
                loadDangerPoints(); // Recargar los puntos y la línea
            } else {
                alert('Error al eliminar el punto de peligro.');
            }
        })
        .catch((error) => console.error('Error al eliminar el punto:', error));
}

// Sincronizar visibilidad de la línea con la capa de puntos
map.on('overlayadd', (e) => {
    if (e.layer === dangerPointsLayer) {
        map.addLayer(connectingLineLayer); // Mostrar la línea
    }
});

map.on('overlayremove', (e) => {
    if (e.layer === dangerPointsLayer) {
        map.removeLayer(connectingLineLayer); // Ocultar la línea
    }
});

// Actualizar dinámicamente overlayMaps para incluir "Puntos Peligrosos"
overlayMaps["Puntos Peligrosos"] = dangerPointsLayer;
// Actualizar el control de capas
function updateLayerControl() {
    if (layerControl) {
        map.removeControl(layerControl);
    }
    layerControl = L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);
}
updateLayerControl();








// Variable para almacenar la capa de distribución
let distribucionLayer;

// Función para cargar la capa distribucion.geojson
fetch('vectoriales/distribucion.geojson')
    .then((response) => response.json())
    .then((data) => {
        distribucionLayer = L.geoJSON(data, {
            style: {
                color: '#070807', // Color verde para las líneas
                weight: 2,       // Grosor de las líneas
                opacity: 1     // Opacidad
            },
            onEachFeature: function (feature, layer) {
                // Agregar un popup con información adicional (si es necesario)
                if (feature.properties) {
                    layer.bindPopup(
                        `<strong>Distribución</strong><br>
                         ID: ${feature.properties.id || 'Sin ID'}<br>
                         Descripción: ${feature.properties.descripcion || 'No disponible'}`
                    );
                }
            }
        });

        // Añadir la capa al control de capas
        overlayMaps["Distribución"] = distribucionLayer;

        // Actualizar el control de capas
        updateLayerControl();
    })
    .catch((error) => console.error('Error al cargar la capa de distribución:', error));

    // Actualizar el control de capas
function updateLayerControl() {
    if (layerControl) {
        map.removeControl(layerControl);
    }
    layerControl = L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);
}