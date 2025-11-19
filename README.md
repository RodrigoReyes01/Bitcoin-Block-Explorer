# Explorador de Bloques de Bitcoin

Un explorador de bloques de Bitcoin ligero y autoalojado, construido con React, Node.js, Express y tRPC. Esta aplicación se conecta directamente a tu nodo local de Bitcoin Core a través de RPC para obtener y mostrar datos de la blockchain.

## Documentación Completa

Puedes encontrar la documentación detallada, incluyendo guías de arquitectura y configuración avanzada, en el siguiente enlace:

[Documentación en Notion](https://unique-stew-f5e.notion.site/Bitcoin-Block-Explorer-2b0098f5ef2f8067ada2e38fdc1bf388)

## Requisitos Previos

Antes de ejecutar esta aplicación, asegúrate de tener instalado lo siguiente:

*   **Node.js**: Versión 18 o superior.
*   **Bitcoin Core**: Un nodo de Bitcoin (`bitcoind`) en ejecución con RPC habilitado.

## Instalación

1.  Clona el repositorio en tu máquina local.
2.  Navega al directorio del proyecto.
3.  Instala las dependencias:

    ```bash
    npm install
    ```

## Configuración

La aplicación requiere una conexión a un nodo de Bitcoin Core. Debes configurar las credenciales RPC utilizando variables de entorno.

1.  Crea un archivo llamado `.env` en el directorio raíz del proyecto.
2.  Agrega las siguientes variables al archivo `.env`, ajustando los valores para que coincidan con la configuración de tu Bitcoin Core:

    ```env
    # Configuración RPC del Nodo Bitcoin
    BITCOIN_RPC_HOST=127.0.0.1
    BITCOIN_RPC_PORT=8332
    BITCOIN_RPC_USER=tu_usuario_rpc
    BITCOIN_RPC_PASSWORD=tu_contraseña_rpc

    # Opcional: Puerto para el servidor web (por defecto es 3000)
    PORT=3000
    ```

**Nota**: Asegúrate de que tu archivo `bitcoin.conf` tenga `server=1` y las configuraciones `rpcuser` y `rpcpassword` (o `rpcauth`) coincidentes.

## Ejecutando la Aplicación

### Modo de Desarrollo

Para ejecutar la aplicación en modo de desarrollo con recarga automática (hot-reloading):

```bash
npm run dev
```

El servidor se iniciará (por defecto) en `http://localhost:3000`.

### Modo de Producción

Para compilar y ejecutar la aplicación para producción:

1.  Compila el proyecto:

    ```bash
    npm run build
    ```

2.  Inicia el servidor de producción:

    ```bash
    npm start
    ```

## Características

*   **Panel de Control**: Visualiza los últimos bloques, transacciones recientes y estadísticas de la red (dificultad, tamaño del mempool, conexiones).
*   **Detalles del Bloque**: Inspecciona la información del bloque, incluyendo hash, altura, marca de tiempo, tamaño, dificultad y transacciones incluidas.
*   **Detalles de la Transacción**: Visualiza las entradas, salidas, valor, tarifas y estado de confirmación de las transacciones.
*   **Búsqueda**: Busca bloques por hash o altura, transacciones por ID y direcciones.
*   **Diseño Responsivo**: Funciona en dispositivos de escritorio y móviles.
*   **Soporte de Temas**: Alterna entre modo claro y oscuro.

## Tecnologías

*   **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
*   **Backend**: Node.js, Express
*   **API**: tRPC (TypeScript Remote Procedure Call)
*   **Fuente de Datos**: Bitcoin Core RPC

## Comandos Útiles de Bitcoin Core

Aquí tienes una lista de comandos útiles para gestionar tu nodo de Bitcoin:

*   `bitcoin-qt`: Inicia el nodo de Bitcoin con interfaz gráfica.
*   `bitcoind -daemon`: Inicia el nodo de Bitcoin en segundo plano (sin interfaz gráfica).
*   `bitcoin-cli stop`: Detiene el nodo de Bitcoin de forma segura.
*   `bitcoin-cli getblockchaininfo`: Muestra información general sobre el estado de la blockchain (altura, dificultad, etc.).
*   `bitcoin-cli getnetworkinfo`: Muestra información sobre la red P2P y el nodo.
*   `bitcoin-cli getconnectioncount`: Devuelve el número de conexiones activas con otros pares.
*   `bitcoin-cli -netinfo 4`: Muestra un resumen del tráfico de red y los pares conectados.
*   `bitcoin-cli getpeerinfo`: Muestra información detallada sobre cada nodo par conectado.
*   `bitcoin-cli getmempoolinfo`: Muestra información sobre el estado de la mempool (transacciones en espera).
*   `bitcoin-cli estimatesmartfee 6`: Estima la comisión necesaria para que una transacción se confirme en 6 bloques.
