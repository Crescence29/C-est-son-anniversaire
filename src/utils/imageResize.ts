// Redimensionne une image côté navigateur avant envoi, pour qu'une photo
// prise avec un téléphone (plusieurs Mo) devienne une petite image encodée
// en base64 (quelques dizaines de Ko) — stockée directement en base
// (colonne avatar_url), sans service de stockage de fichiers externe.
export function resizeImageFile(file: File, maxSize = 640, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Fichier image invalide.'));
      img.onload = () => {
        let { width, height } = img;
        // Ne réduit jamais une image déjà plus petite que maxSize — seul un
        // agrandissement inutile (qui ferait perdre en netteté) est évité ici.
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Redimensionnement impossible sur cet appareil.'));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
