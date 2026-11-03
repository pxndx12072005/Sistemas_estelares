# Sistemas Estelares: versión web para GitHub Pages

El código del juego exportado de Google Playground está sin cambios. Para que funcione fuera de Playground se agregaron estos archivos:

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Página que carga el juego |
| `tailwind.css` | Estilos de la interfaz (en Playground los pone la plataforma) |
| `index.css` | Estilos de la página y de la ventana de récords |
| `public/sdk-local.js` | Reemplaza el SDK de Playground: sin cuentas de Google y con récords guardados en el dispositivo |
| `package.json`, `vite.config.js` | Librerías (las mismas versiones que usó Playground) y compilación |
| `.github/workflows/deploy.yml` | Compila y publica el juego en GitHub Pages automáticamente |

## Publicar

1. Crea un repositorio **público** en GitHub, por ejemplo `sistemas-estelares`.
2. Ve a **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**.
3. Sube **todo el contenido** de esta carpeta a la rama `main`: la carpeta en sí no, lo que está dentro.
4. Comprueba que se haya subido `.github/workflows/deploy.yml`. Si falta, créalo con **Add file → Create new file**.
5. En la pestaña **Actions**, espera el check verde (unos 2–3 minutos).
6. El juego queda en `https://TU-USUARIO.github.io/sistemas-estelares/`.

Si la publicación falla porque Pages no estaba activado, entra a **Actions → Publicar en GitHub Pages → Run workflow** para lanzarla de nuevo.

## Probar en tu computadora (opcional)

```
npm install --legacy-peer-deps
npm run dev
```
