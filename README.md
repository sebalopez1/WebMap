Estos archivos tienen rutas especificas para poder ejecturarse correctamente. Ademas, se deben tener datos de entrada para el correcto funcionamimento de la pagina, estos datos de entradas son archivos rasters y capas vectoriales. Dependecias:

- Imagen raster de mosaico fotogrametrico
- Imagen raster de radiacion solar
- Capa vectorial para catastro
- capa vectorial para red de cañerias
- capa vectorial para distribucion de zonas
- capa vectorial para puntos peligrosos.

ALgunas de estas capas vectoriales pueden tener datos en blanco, pero si necesitan una estructura de campos para su tabla de atributos. Los formatos de raster tienen que ser png, en cambio, los formato de vectoriales debe estar en GeoJson.
si se necesita la estructura de la carpeta del proyecto para que las consultas del server funcionen correctamente, se recomienda contactar con el desarrollador.
