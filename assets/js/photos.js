/* ============================================================
   Capture / compression d'images cote navigateur.
   App.Photos.pick(cb)  -> ouvre l'appareil photo / galerie,
   renvoie un dataURL JPEG compresse (ou null).
   ============================================================ */
(function () {
  function pick(cb) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (!f) { cb(null); return; }
      try { cb(await fileToJpeg(f)); } catch (e) { cb(null); }
    });
    inp.click();
  }

  function fileToJpeg(file, maxDim, q) {
    maxDim = maxDim || 1000; q = q || 0.7;
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(fr.result);   // pas d'image decodable -> renvoie brut
        img.onload = () => {
          try {
            const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
            const cw = Math.max(1, Math.round(img.width * sc));
            const ch = Math.max(1, Math.round(img.height * sc));
            const c = document.createElement('canvas');
            c.width = cw; c.height = ch;
            const ctx = c.getContext('2d');
            if (!ctx) { resolve(fr.result); return; }
            ctx.drawImage(img, 0, 0, cw, ch);
            resolve(c.toDataURL('image/jpeg', q));
          } catch (e) { resolve(fr.result); }
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  window.App = window.App || {};
  App.Photos = { pick, fileToJpeg };
})();
