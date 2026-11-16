# MONEYBANK — Tu Dinero. Tu Control.

Plataforma **Local-First** de gestión financiera personal con cifrado en dispositivo (**Web Crypto AES-GCM 256-bit + PBKDF2-SHA256**), almacenamiento en **IndexedDB (Dexie.js)**, cálculos exactos con **Decimal.js** y soporte **PWA offline**, diseñada para desplegarse como aplicación estática en **Cloudflare Pages**.

## Comandos de Desarrollo y Validación

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

## Despliegue en Cloudflare Pages

1. Conecta el repositorio en **Cloudflare Pages**.
2. Configura:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. No se requieren variables de entorno ni bases de datos remotas. Los archivos `public/_headers` y `public/_redirects` aplican automáticamente la Política de Seguridad de Contenidos (CSP) estricta y el enrutamiento SPA.

## Seguridad y Respaldos

- Toda la información financiera se cifra antes de guardarse en IndexedDB y se mantiene descifrada únicamente en memoria mientras la bóveda está desbloqueada.
- Si olvidas tu contraseña maestra sin contar con un respaldo cifrado (`.mbk.json`), los datos no pueden recuperarse.
- El cifrado local protege los datos en reposo dentro del navegador, pero no sustituye la seguridad del sistema operativo frente a malware activo.
