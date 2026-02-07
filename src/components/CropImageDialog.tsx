import CloseIcon from '@mui/icons-material/Close';
import { Box } from '@mui/system';
import { useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';

import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { DialogProps } from '@toolpad/core';

const CropImageDialog = ({
  open,
  onClose,
  payload: { selectedImage },
}: DialogProps<{ selectedImage: string }, string | null>) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const rotation = 0;
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area>({ width: 0, height: 0, x: 0, y: 0 });

  const onCropComplete = (_croppedArea: Area, croppedAreaPixelsParam: Area) => {
    setCroppedAreaPixels(croppedAreaPixelsParam);
  };

  const cropImage = async () => {
    try {
      const croppedImage = await getCroppedImg(selectedImage, croppedAreaPixels, rotation);
      onClose(croppedImage);
    } catch (e) {
      console.error('cropImage error', e);
      onClose(null);
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <Box>
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => onClose(null)} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Zuschneiden
            </Typography>
            <Button autoFocus color="inherit" onClick={cropImage}>
              Anwenden
            </Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ position: 'relative', width: '100%', height: 'calc(100dvh - 64px)', background: '#333' }}>
          <Cropper
            image={selectedImage}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={5}
            rotation={rotation}
            aspect={1 / 1}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </Box>
      </Box>
    </Dialog>
  );
};

export default CropImageDialog;

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');

  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    return null;
  }

  // If pixelCrop may be invalid (zero width/height), guard
  const safeWidth = Math.max(0, Math.round(pixelCrop.width));
  const safeHeight = Math.max(0, Math.round(pixelCrop.height));
  const safeX = Math.round(pixelCrop.x);
  const safeY = Math.round(pixelCrop.y);

  // Set the size of the cropped canvas
  croppedCanvas.width = safeWidth;
  croppedCanvas.height = safeHeight;

  // Draw the cropped image onto the new canvas
  croppedCtx.drawImage(canvas, safeX, safeY, safeWidth, safeHeight, 0, 0, safeWidth, safeHeight);

  // detect original mime if possible to preserve png transparency
  const mimeFromDataUrlMatch = (imageSrc || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mime = mimeFromDataUrlMatch?.[1] ?? 'image/png'; // default to png to avoid losing transparency

  // As Base64 string, preserving mime if possible
  return croppedCanvas.toDataURL(mime);
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    // only set crossOrigin for http(s) to avoid tainting issues with remote images that don't allow CORS
    if (url.startsWith('http://') || url.startsWith('https://')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}
