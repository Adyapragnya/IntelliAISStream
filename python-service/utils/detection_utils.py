import os
import time
import json
import cv2
import numpy as np
import rasterio
import pyproj
from pymongo import MongoClient
from shapely.geometry import Polygon, shape, mapping
from shapely.ops import transform as shapely_transform
from shapely.errors import TopologicalError
import geopandas as gpd
from rasterio.mask import mask

def enhance_image(rgb):
     rgb = np.nan_to_num(rgb)  # replace NaNs with 0
     max_val = np.max(rgb)
     if max_val == 0:
          max_val = 1  # avoid division by 0
     rgb_uint8 = np.clip((rgb / max_val) * 255, 0, 255).astype(np.uint8)

     # Convert to LAB color space for better luminance control
     lab = cv2.cvtColor(rgb_uint8, cv2.COLOR_RGB2LAB)
     l, a, b = cv2.split(lab)

     # Apply CLAHE more aggressively
     clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
     l_clahe = clahe.apply(l)

     lab = cv2.merge((l_clahe, a, b))
     enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

     return enhanced

def detect_vessels(image, area_thresh=50, debug_dir=None, scene_id="scene"):
     # Step 1: Convert to HSV (good for separating vessel colors)
     hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
     v = hsv[:, :, 2]  # Brightness channel
     
     # Step 2: Binary mask using brightness threshold
     _, binary = cv2.threshold(v, 160, 255, cv2.THRESH_BINARY)
     
     # Optional: Remove circular border by masking
     h, w = binary.shape
     mask = np.zeros_like(binary)
     cv2.circle(mask, (w // 2, h // 2), min(w, h) // 2 - 10, 255, -1)  # slight margin inside
     binary = cv2.bitwise_and(binary, binary, mask=mask)
     
     # ✅ Save binary mask (for debug)
     if debug_dir:
          os.makedirs(debug_dir, exist_ok=True)
          binary_path = os.path.join(debug_dir, f"binary_mask_{scene_id}.png")
          cv2.imwrite(binary_path, binary)
     
     # Step 3: Morphology to clean up
     kernel = np.ones((3, 3), np.uint8)
     cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
     cleaned = cv2.dilate(cleaned, kernel, iterations=1)
     
     # ✅ Save cleaned mask (for debug)
     if debug_dir:
          cleaned_path = os.path.join(debug_dir, f"cleaned_mask_{scene_id}.png")
          cv2.imwrite(cleaned_path, cleaned)
     
     # Step 4: Contour detection
     contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
     valid = []
     for cnt in contours:
          area = cv2.contourArea(cnt)
          if area < area_thresh:
               continue
          x, y, w, h = cv2.boundingRect(cnt)
          aspect = w / float(h) if h > 0 else 0
          if 0.2 < aspect < 8:  # reasonable for vessel shapes
               valid.append(cnt)
     return valid

def draw_detections(image, contours, output_path=None):
     result = image.copy()
     cv2.drawContours(result, contours, -1, (255, 0, 0), 2)
     
     # ✅ Add label to each contour
     for i, cnt in enumerate(contours):
          x, y, w, h = cv2.boundingRect(cnt)
          cv2.putText(result, f"{i}", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 0), 1)
     if output_path:
          cv2.imwrite(output_path, result)
     return result

def pixel_to_geo(pixel_coords, transform):
     return [transform * (float(x), float(y)) for x, y in pixel_coords]

def contours_to_geojson(contours, transform, crs, output_path, mongo_uri=None, mongo_db=None, mongo_collection=None, metadata=None):
     polygons = []

     for i, cnt in enumerate(contours):
          coords = cnt.squeeze()

          if len(coords.shape) != 2 or len(coords) < 3:
               print(f"⚠️ Contour {i} skipped: not enough points")
               continue

          # Convert pixel to geographic coordinates
          try:
               geo_coords = pixel_to_geo(coords, transform)

               # Create a polygon
               poly = Polygon(geo_coords)

               # Try to fix invalid geometries
               if not poly.is_valid:
                    poly = poly.buffer(0)

               # Skip if still invalid or too small
               if not poly.is_valid or poly.area < 1e-6:
                    print(f"⚠️ Contour {i} skipped: invalid or too small")
                    continue

               # ✅ Optional: filter far-from-center junk
               # You can comment this out if unsure
               cx, cy = poly.centroid.xy[0][0], poly.centroid.xy[1][0]
               center_x, center_y = 0, 0  # or use image center
               distance_from_center = ((cx - center_x)**2 + (cy - center_y)**2)**0.5
               if distance_from_center > 1e10:  # 🔁 disable or adjust threshold
                    print(f"⚠️ Contour {i} skipped: too far from center")
                    continue

               polygons.append(poly)

          except (ValueError, TopologicalError, Exception) as e:
               print(f"⚠️ Contour {i} error: {e}")
               continue

     if not polygons:
          print("⚠️ No valid polygons created from contours.")
          
     if crs is None:
          print("⚠️ CRS is None, setting default EPSG:4326")
          crs = "EPSG:4326"

     gdf = gpd.GeoDataFrame(geometry=polygons, crs=crs)
     
     # 🔁 Reproject to EPSG:4326 (MongoDB compatible)
     gdf = gdf.to_crs(epsg=4326)
     
     # 💾 Save to GeoJSON
     gdf.to_file(output_path, driver="GeoJSON")
     print(f"✅ GeoJSON saved with {len(polygons)} features → {output_path}")

     # ✅ Insert into MongoDB
     if mongo_uri and mongo_db and mongo_collection:
          try:
               client = MongoClient(mongo_uri)
               db = client[mongo_db]
               collection = db[mongo_collection]
               
               # ✅ Delete existing documents before inserting new ones
               delete_result = collection.delete_many({})
               print(f"🗑️ Deleted {delete_result.deleted_count} existing documents from '{mongo_collection}'")
               
               features = []
               for poly in gdf.geometry:
                    geojson_geom = mapping(poly)
                    features.append({
                         "type": "Feature",
                         "geometry": geojson_geom,
                         "properties": {}
                    })
                    print(f"Sample lat/lon: {geojson_geom['coordinates'][0][0]}")


               if features:
                    collection.insert_many(features)
                    print(f"✅ Inserted {len(features)} features to MongoDB")
               else:
                    print("⚠️ No features to insert.")

          except Exception as e:
               print(f"❌ MongoDB insert error: {e}")

def clip_image_with_aoi(image_path, aoi_geojson, output_path):
     with rasterio.open(image_path) as src:
          raster_crs = src.crs
          print("🗺️ Raster bounds:", src.bounds)
          print("📌 Raster CRS:", raster_crs)

          # Transform AOI to match raster CRS
          project = pyproj.Transformer.from_crs("EPSG:4326", raster_crs, always_xy=True).transform
          aoi_shape = shape(aoi_geojson)
          aoi_reprojected = shapely_transform(project, aoi_shape)

          # Clip using reprojected AOI
          out_image, out_transform = mask(src, [aoi_reprojected], crop=True)
          out_meta = src.meta.copy()
          out_meta.update({
               "height": out_image.shape[1],
               "width": out_image.shape[2],
               "transform": out_transform
          })

     with rasterio.open(output_path, "w", **out_meta) as dest:
          dest.write(out_image)

     return output_path, out_transform, out_meta.get("crs")