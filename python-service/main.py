# import os
# import matplotlib.pyplot as plt
# from utils.raster_utils import load_planet_image
# from utils.detection_utils import (
#     enhance_image, detect_vessels, draw_detections, contours_to_geojson, fetch_latest_planet_scene, download_planet_image 
# )

# # --- File Paths ---
# # image_path = "data/planetscope_image.tif"

# geometry = [[
#     [103.54896588,1.2119135],[103.58151577,1.2119135],[103.58151577,1.25106345],[103.54896588,1.25106345],[103.54896588,1.2119135]
# ]]

# start_date = "2025-07-20"
# end_date = "2025-07-20"
# api_key = "PLAK523d3adce4c140489a3047ebc8cc7564"
# scene_id, item_type = fetch_latest_planet_scene(api_key, start_date, end_date, geometry, cloud_cover_threshold=0.3)

# image_path = "data/planetscope_image2.tif"
# output_image = "output/preview2.png"
# output_geojson = "output/detected_vessels2.geojson"

# # 👇 Use your existing function to download the image
# download_planet_image(api_key, scene_id, item_type=item_type, asset_type="ortho_visual", output_path=image_path)

# rgb, transform, crs = load_planet_image(image_path)
# enhanced = enhance_image(rgb)
# contours = detect_vessels(enhanced)

# print(f"✅ Vessels detected: {len(contours)}")

# draw_detections(enhanced, contours, output_path=output_image)
# contours_to_geojson(contours, transform, crs, output_geojson,mongo_uri="mongodb+srv://Krishna:Rajput9739@cluster0.9ojo45s.mongodb.net/",mongo_db="React_Native",mongo_collection="detected_vessels")

# print(f"📦 Results saved to: {output_image} and {output_geojson}")

import os
import httpx
from typing import Any, List

# main.py (FastAPI app)
from fastapi import FastAPI, HTTPException
from pydantic import Field, BaseModel, ConfigDict
import asyncio
from detection_runner import run_detection
from typing import Literal, Any, List
from datetime import date, datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId  # To convert IDs
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_core import core_schema
# --- Custom ObjectId validator for Pydantic v2 ---

from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi import Body, status
from fastapi.responses import StreamingResponse

import asyncio
import websockets
import json

# Admin: transform ObjectId to str for JSON
def oid_to_str(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, source, handler):
        def validate(value):
            if isinstance(value, ObjectId):
                return value
            if isinstance(value, str) and ObjectId.is_valid(value):
                return ObjectId(value)
            raise ValueError("Invalid ObjectId")
        return core_schema.no_info_plain_validator_function(
            function=validate,
            serialization=core_schema.to_string_ser_schema()
        )
    
# -------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------

class Settings(BaseSettings):
    mongo_uri: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()

# -------------------------------------------------------------------
# FastAPI app & lifecycles
# -------------------------------------------------------------------

app = FastAPI(title="Maritime AOI & Detection API")

@app.on_event("startup")
async def startup_db():
    try:
        app.state.mongodb_client = AsyncIOMotorClient(settings.mongo_uri)
        # If your URI includes a database name path (mongodb://.../mydb),
        # you can get it like this; otherwise set manually:
        db_name = app.state.mongodb_client.get_default_database().name  # noqa
        app.state.mongodb = app.state.mongodb_client[db_name]
    except Exception as e:
        raise RuntimeError(f"Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db():
    app.state.mongodb_client.close()


# Optional: enable CORS if frontend runs on a different origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Pydantic models & utility
# -------------------------------------------------------------------

class AOIPolygon(BaseModel):
    id: PyObjectId = Field(alias="_id")
    type: Literal["FeatureCollection"]
    features: list[Any]
    date: datetime
    place: str

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )

# Request model for vessel detection
class DetectionRequest(BaseModel):
    file_name: str
    date: date
    geometry: list[Any]

# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------
@app.post("/api/detect-vessels", summary="Run detection and return vessel data")
async def detect_vessels(
    req: DetectionRequest,
    fastdb = Depends(lambda: app.state.mongodb)
):
    # Set start_date and end_date to the same value from the request
    start_date = end_date = req.date

    # Preserve both file name formats
    base_file_name = req.file_name  # without .tif
    tif_file_name = f"{base_file_name}.tif"

    try:
        await asyncio.to_thread(
            run_detection,
            file_name=tif_file_name,
            start_date=start_date,
            end_date=end_date,
            geometry=req.geometry,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")

    # Fetch data from the database
    det_col = fastdb.get_collection("detected_vessels")
    pts_col = fastdb.get_collection("AOIvessels")
    raw_polys = await det_col.find({}).to_list(length=None)
    raw_pts = await pts_col.find({"place": base_file_name}).to_list(length=None)

    polys = [oid_to_str(doc) for doc in raw_polys]
    points = [oid_to_str(doc) for doc in raw_pts]

    return {
        "polygons": polys,
        "points": points,
        "metadata": {
            "date": req.date.isoformat(),
            "file_name": req.file_name,
            "polygon_count": len(polys),
            "point_count": len(points),
        }
    }

@app.get("/api/planets/get-AOI-polygons", response_model=List[AOIPolygon])
async def get_aoi_polygons():
    collection = app.state.mongodb["AOIpolygon"]
    docs = await collection.find({}, {"_id": 1, "type": 1, "features": 1, "date": 1, "place": 1}).to_list(length=None)
    return docs

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/api/login")
async def login_user(user: UserLogin, fastdb=Depends(lambda: app.state.mongodb)):
    users_col = fastdb.get_collection("accounts")
    user_doc = await users_col.find_one({"email": user.email})

    if not user_doc:
        raise HTTPException(status_code=400, detail="Email not found")

    if not verify_password(user.password, user_doc["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    # Login successful
    return {
        "message": "Login successful",
        "user_id": str(user_doc["_id"]),
        "email": user_doc["email"]
    }

@app.post("/api/reset-password")
async def reset_password(email: str, new_password: str, fastdb=Depends(lambda: app.state.mongodb)):
    users_col = fastdb.get_collection("accounts")
    user_doc = await users_col.find_one({"email": email})

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_pw = pwd_context.hash(new_password)

    await users_col.update_one({"email": email}, {"$set": {"password": hashed_pw}})
    return {"message": f"Password updated for {email}"}



class APIKeyModel(BaseModel):
    source: str
    key: str

@app.get("/api/maritime-api-key/planet", response_model=APIKeyModel)
async def get_maritime_api_key(
    fastdb=Depends(lambda: app.state.mongodb)
):
    coll = fastdb.get_collection("maritimeapikey")
    doc = await coll.find_one({})
    if not doc:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"source": doc["source"], "key": doc["key"]}

@app.post("/api/update-maritime-api-key")
async def update_maritime_api_key(
    data: dict = Body(...),
    fastdb=Depends(lambda: app.state.mongodb)
):
    api_key = data.get("key")
    source = data.get("source")

  

    config_col = fastdb.get_collection("maritimeapikey")
    result = await config_col.update_one(
        {"source": source},
        {"$set": {"key": api_key}},
        upsert=True
    )

    if result.acknowledged:
        return {"message": "API Key updated successfully"}
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Failed to update API key"}
        )

class BBox(BaseModel):
    minLat: float
    minLon: float
    maxLat: float
    maxLon: float

# @app.post("/api/vesselfinder/ais")
# async def get_ais_vessels(bbox: BBox, fastdb=Depends(lambda: app.state.mongodb)):
#     api_key_doc = await fastdb["maritimeapikey"].find_one({"source": "vesselfinder"})
#     if not api_key_doc:
#         raise HTTPException(500, "VesselFinder API key not configured")

#     userkey = api_key_doc["key"]
#     url = (
#         f"https://api.vesselfinder.com/livedata"
#         f"?userkey={userkey}"
#         f"&format=json"
#         f"&minlat={bbox.minLat}&maxlat={bbox.maxLat}"
#         f"&minlon={bbox.minLon}&maxlon={bbox.maxLon}"
#     )

#     try:
#         async with httpx.AsyncClient() as client:
#             res = await client.get(url)
#             res.raise_for_status()
#             vessels = res.json()

#         if not isinstance(vessels, list):
#             raise HTTPException(502, "Unexpected response format from VesselFinder")

#     except Exception as e:
#         raise HTTPException(502, f"VesselFinder API call failed: {e}")

#     vessel_col = fastdb["maritimeAISvessels"]
#     saved = 0

#     for v in vessels:
#         try:
#             imo = v["AIS"].get("IMO", 0)
#             if not imo or imo == 0:
#                 continue  # Skip invalid/missing IMO values

#             v["_id"] = imo
#             await vessel_col.replace_one({"_id": imo}, v, upsert=True)
#             saved += 1

#         except Exception as mongo_error:
#             continue  # Optionally log or collect errors

#     return {"count": saved, "vessels": vessels}

import asyncio
import json
import websockets
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from datetime import datetime, timezone
import itertools
import logging

logging.basicConfig(level=logging.DEBUG)

async def app_keepalive(ws, interval=10):
    count = 0
    while True:
        await asyncio.sleep(interval)
        try:
            await ws.send(json.dumps({"type": "heartbeat", "count": count}))
            count += 1
            print(f"Sent heartbeat {count}")
        except websockets.ConnectionClosed:
            break
        except WebSocketDisconnect:
            print("WebSocket disconnected.")
            break
 
async def connect_with_retries(url, retries=5, delay=3):
    for attempt in range(retries):
        try:
            ws = await websockets.connect(url)  # await connection here
            return ws  # returns the websocket connection object
        except (websockets.ConnectionClosed, Exception) as e:
            if attempt < retries - 1:
                print(f"Connection failed: {e}. Retrying in {delay} seconds...")
                await asyncio.sleep(delay)
                delay *= 2
            else:
                raise

@app.websocket("/ws/vessels")
async def vessel_stream(websocket: WebSocket):
    await websocket.accept()
    params = websocket.query_params

    min_lat = float(params.get('minLat', 0))
    min_lon = float(params.get('minLon', 0))
    max_lat = float(params.get('maxLat', 90))
    max_lon = float(params.get('maxLon', 180))

    api_key_doc = await app.state.mongodb["maritimeapikey"].find_one({"source": "aisstreamio"})
    if not api_key_doc:
        raise HTTPException(500, "aisstreamio API key not configured")

    userkey = api_key_doc["key"]
    bounding_box = [[[min_lat, min_lon], [max_lat, max_lon]]]

    ws = await connect_with_retries("wss://stream.aisstream.io/v0/stream")
    ka_task = asyncio.create_task(app_keepalive(ws))

    subscription = {"APIKey": userkey, "BoundingBoxes": bounding_box}
    await ws.send(json.dumps(subscription))

    live_mode = True

    try:
        while live_mode:
            recv_task = asyncio.create_task(ws.recv())
            stop_task = asyncio.create_task(websocket.receive_text())

            done, pending = await asyncio.wait(
                [recv_task, stop_task],
                return_when=asyncio.FIRST_COMPLETED
            )

            for task in pending:
                task.cancel()

            if stop_task in done:
                msg = stop_task.result()
                if msg == "STOP":
                    live_mode = False
                    break  # exit live loop

            if recv_task in done:
                try:
                    raw = recv_task.result()
                    msg = json.loads(raw)
                    message_type = msg.get("MessageType")

                    if message_type == "PositionReport":
                        report = msg["Message"].get(message_type)
                        print(f"Received PositionReport: {report}")
                        if report:
                            doc = {
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                                "mmsi": report.get("UserID") or report.get("MMSI"),
                                "latitude": report.get("Latitude") or report.get("latitude"),
                                "longitude": report.get("Longitude") or report.get("longitude"),
                                "type": message_type,
                                # Additional fields:
                                "cog": report.get("Cog"),
                                "sog": report.get("Sog"),
                                "true_heading": report.get("TrueHeading"),
                                "navigational_status": report.get("NavigationalStatus"),
                                "rate_of_turn": report.get("RateOfTurn"),
                                "position_accuracy": report.get("PositionAccuracy"),
                                "valid": report.get("Valid"),
                                "timestamp_ais": report.get("Timestamp"),
                                "time_utc": msg.get("MetaData", {}).get("time_utc"),
                                "ship_name": msg.get("MetaData", {}).get("ShipName"),
                            }
                            await app.state.mongodb["AISstreamiovessels"].insert_one(doc)
                            try:
                                # Convert Mongo ObjectId to string if it exists
                                if "_id" in doc:
                                    doc["_id"] = str(doc["_id"])
                                await websocket.send_json(doc)
                                await asyncio.sleep(0)

                            except Exception as e:
                                print("Failed to send message to frontend:", e)
                                break  # Stop or handle reconnection logic

                except websockets.ConnectionClosed:
                    break

        # Replay mode loop — sends every 5 seconds
        # Replay mode loop — sends every 5 seconds
        while not live_mode:
            vessels = await (
                app.state.mongodb["AISstreamiovessels"]
                .find({
                    "latitude": {"$gte": min_lat, "$lte": max_lat},
                    "longitude": {"$gte": min_lon, "$lte": max_lon}
                })
                .sort("timestamp", -1)
                .limit(50)
                .to_list(length=50)
            )

            # Convert _id to str
            vessels = [
                {**v, "_id": str(v["_id"])} if "_id" in v else v
                for v in vessels
            ]

            await websocket.send_json({"cached": vessels})
            await asyncio.sleep(5)


    finally:
        ka_task.cancel()
        try:
            await ka_task
        except asyncio.CancelledError:
            pass
        await websocket.close()
        await ws.close()
