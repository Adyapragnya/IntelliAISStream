from utils.raster_utils import load_planet_image
from utils.detection_utils import (enhance_image, detect_vessels, draw_detections, contours_to_geojson, clip_image_with_aoi)
from datetime import datetime
import time
import os

def run_detection(file_name: str, start_date: str, end_date: str, geometry: list):
    polygon_geojson = { "type": "Polygon", "coordinates": geometry }
    
    # ✅ Full path to the uploaded .tif file
    LOCAL_TIF_PATH = os.path.join("data", file_name)

    # ❌ File existence check
    if not os.path.exists(LOCAL_TIF_PATH):
        raise FileNotFoundError(f"❌ File not found: {LOCAL_TIF_PATH}")
    
    # ✅ Generate unique run ID (based on datetime)
    run_id = datetime.now().strftime("run_%Y%m%d_%H%M%S")

    # ✅ Create per-run folders
    data_folder = os.path.join("data", run_id)
    output_folder = os.path.join("output", run_id)
    os.makedirs(data_folder, exist_ok=True)
    os.makedirs(output_folder, exist_ok=True)

    # Fetch and download PlanetScope image
    scene_id = os.path.splitext(os.path.basename(LOCAL_TIF_PATH))[0]
    
    # ✅ Define file paths inside run folders
    image_path = os.path.join(data_folder, f"planetscope_full_image_{scene_id}.tif")
    clipped_image_path = os.path.join(data_folder, f"clipped_{scene_id}.tif")
    output_image = os.path.join(output_folder, f"preview_{scene_id}.png")
    output_geojson = os.path.join(output_folder, f"detected_vessels_{scene_id}.geojson")

    # Download Clip locally
    start = time.time()  # ⏱️ Start timing
    image_path, transform, crs = clip_image_with_aoi(LOCAL_TIF_PATH, polygon_geojson, clipped_image_path)
    end = time.time()  # ⏱️ End timing
    print(f"⏱️ Time taken to fetch clipped image: {end - start:.2f} seconds")

    # Process image and detect vessels
    rgb, transform, crs = load_planet_image(image_path)
    enhanced = enhance_image(rgb)
    contours = detect_vessels(enhanced, debug_dir=output_folder, scene_id=scene_id)

    # Save output image and GeoJSON
    draw_detections(enhanced, contours, output_path=output_image)
    contours_to_geojson(contours, transform, crs, output_geojson, 
    mongo_uri="mongodb://hylaadmin:Hyla%40APTPL2608@31.187.76.110:27032/", mongo_db="HylaTrial", mongo_collection="detected_vessels",
    metadata={"start_date": start_date, "end_date": end_date, "scene_id": scene_id})

    print(f"📦 Results saved to: {output_image} and {output_geojson}")
    
    return { "vessels_detected": len(contours), "preview_image": output_image, "geojson_file": output_geojson }