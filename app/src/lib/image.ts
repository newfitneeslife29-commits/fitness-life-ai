// Photos from the camera or the gallery, shrunk on the phone before they go
// anywhere: a meal photo for the AI, a profile picture, a community post.

// Opens the camera (or the gallery, if the user prefers) and resolves with the file, or null if cancelled.
export const pickImage = (opts: { camera?: boolean } = {}) =>
    new Promise<File | null>(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        if (opts.camera) input.setAttribute('capture', 'environment');
        input.style.display = 'none';
        let done = false;
        const finish = (file: File | null) => {
            if (done) return;
            done = true;
            input.remove();
            resolve(file);
        };
        input.addEventListener('change', () => finish(input.files?.[0] ?? null));
        input.addEventListener('cancel', () => finish(null));
        document.body.appendChild(input);
        input.click();
    });

const loadBitmap = async (file: Blob): Promise<ImageBitmap | HTMLImageElement> => {
    if ('createImageBitmap' in window) {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
            // fall back to <img>
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
    } finally {
        URL.revokeObjectURL(url);
    }
};

// Shrinks to fit `max` pixels on the longest side (or a centered square of
// `max` when `square`) and re-encodes as JPEG.
export const resizeImage = async (file: Blob, max: number, opts: { square?: boolean; quality?: number } = {}): Promise<Blob> => {
    const img = await loadBitmap(file);
    const w = img.width, h = img.height;
    let sx = 0, sy = 0, sw = w, sh = h;
    if (opts.square) {
        const side = Math.min(w, h);
        sx = (w - side) / 2;
        sy = (h - side) / 2;
        sw = sh = side;
    }
    const scale = Math.min(1, max / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    if ('close' in img) img.close();
    return new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', opts.quality ?? 0.82));
};

export const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

// Base64 without the "data:image/jpeg;base64," prefix.
export const blobToBase64 = async (blob: Blob) => (await blobToDataUrl(blob)).split(',')[1] ?? '';
