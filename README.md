# Prueba de carga

Genera registros al momento y los envía por POST (JSON) a una URL, a un ritmo parejo.

## Configuración

En **Settings → Secrets and variables → Actions** del repo:

- `LEAD_URL` (obligatorio): URL de destino.
- `BYPASS_HEADER` (opcional): cabecera extra en formato `Nombre: valor`.

Los campos fijos de cada registro están en `fijos.json`.

## Uso

**Actions → Prueba de carga → Run workflow** y elegir:

- **total**: registros a enviar en total.
- **horas**: tiempo en que se reparten (0 = lo más rápido posible).
- **maquinas**: máquinas en paralelo; el total se divide entre ellas.
- **paralelo**: envíos simultáneos por máquina.

Cada máquina puede correr hasta ~6 horas. Al terminar, el resumen aparece en la página de la ejecución y el detalle de cada registro queda como artifact (`resultados-N.ndjson.gz`).

La prueba se detiene sola si hay 300 fallos seguidos o más del 50% de fallos en los últimos 2000 envíos.

## Probar en local

```
node enviar.mjs --muestra 3
LEAD_URL=https://... node enviar.mjs --total 100
```
