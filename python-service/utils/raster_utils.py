import rasterio
import numpy as np

def load_planet_image(path):
     with rasterio.open(path) as src:
          red   = src.read(3)
          green = src.read(2)
          blue  = src.read(1)
          transform = src.transform
          crs = src.crs
     rgb = np.stack([red, green, blue], axis=-1)
     return rgb, transform, crs