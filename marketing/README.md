# MONEYBANK — Visual Marketing & Product Showcase

Paquete de activos promocionales generados directamente sobre la interfaz real de **MONEYBANK** (*Your Money. Your Control.*).

## Estructura y manifiesto de archivos

 - `brand/brand-kit-spec.md`: paleta Light/Dark, tipografía Inter y reglas de marca.
 - `screenshots/`: 15 capturas originales de los módulos de la aplicación.
 - `sections/`: 15 tarjetas panorámicas **1920 × 1080**.
 - `social/`: 15 tarjetas **1080 × 1080** para redes sociales.
 - `commercial/`: MP4, miniatura, guion y subtítulos del comercial.
 - `tutorial/`: MP4, miniatura, guion y subtítulos del tutorial.

## Duraciones verificadas de los archivos actuales

Los MP4 existentes todavía son las exportaciones truncadas previas a la corrección. FFprobe confirma sus streams, pero no cumplen la duración de las grabaciones fuente. Los nuevos guiones generan la duración de voz indicada; falta reconstruir los MP4 cuando estén disponibles los WebM fuente.

| Video | WebM original medido | Video MP4 actual | Audio MP4 actual | Locución WAV nueva | Estado |
|---|---:|---:|---:|---:|---|
| Comercial | 76.96 s | 27.00 s | 25.25 s | 75.90 s | MP4 actual truncado; reexportación pendiente |
| Tutorial | 72.16 s | 23.16 s | 21.56 s | 70.91 s | MP4 actual truncado; reexportación pendiente |

Los MP4 actuales son H.264/AAC, 1920 × 1080 y 25 FPS. Las pistas de audio duran aproximadamente lo mismo que las locuciones anteriores; el `-shortest` previo terminó los videos cuando acabó ese audio. Los subtítulos fuente ya se actualizaron para las nuevas locuciones, pero los MP4 actuales todavía contienen la narración y subtítulos antiguos.

## Regeneración

`node scripts/build-marketing-package.mjs --videos-only` rehace los videos sin capturar pantallas ni grabar de nuevo. Requiere `commercial/raw-commercial.webm` y `tutorial/raw-tutorial.webm`. El proceso conserva esos WebM y los WAV nuevos, y solo declara éxito si ffprobe valida duración, streams, códecs, resolución y FPS.

`node scripts/build-marketing-package.mjs` ejecuta el paquete completo, incluidas las capturas y grabaciones.
