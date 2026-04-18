from datetime import datetime
from pathlib import Path
import os
import shutil
import uuid

import cv2
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from ultralytics import YOLO

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
UPLOADS = BASE_DIR / "uploads"
OUTPUTS = BASE_DIR / "outputs"
MODEL_PATH = BASE_DIR / "best.pt"

for folder in (UPLOADS, OUTPUTS):
    folder.mkdir(exist_ok=True)

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Make generated files inside backend/outputs available to the frontend.
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS)), name="outputs")

model = YOLO(str(MODEL_PATH))

incidents = []
notifications = []


def build_output_url(request: Request, filename: str) -> str:
    """Build a full URL that the frontend can open directly."""
    return f"{str(request.base_url).rstrip('/')}/outputs/{filename}"


def save_upload_file(file: UploadFile) -> Path:
    """Save the uploaded file to backend/uploads and return the saved path."""
    safe_name = f"{uuid.uuid4().hex}_{Path(file.filename or 'upload').name}"
    file_path = UPLOADS / safe_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return file_path


def extract_detections(results) -> tuple[list[dict], bool, float]:
    """Convert YOLO results into API-friendly detection objects."""
    detections = []
    accident_detected = False
    best_confidence = 0.0

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            label = str(model.names[class_id])
            bounding_box = [float(value) for value in box.xyxy[0].tolist()]

            detections.append(
                {
                    "label": label,
                    "score": confidence,
                    "box": bounding_box,
                }
            )

            if label.lower() == "accident":
                accident_detected = True
                best_confidence = max(best_confidence, confidence)

    return detections, accident_detected, best_confidence


def create_incident_record(
    *,
    media_type: str,
    source_file: str,
    accident_detected: bool,
    confidence: float,
    timestamp: str,
):
    """Store each processed upload so the dashboard keeps working."""
    incident_id = f"INC{len(incidents) + 1:04d}"
    location = "Uploaded Video" if media_type == "video" else "Uploaded Image"

    incident = {
        "id": incident_id,
        "timestamp": timestamp,
        "location": location,
        "confidence": confidence,
        "media_type": media_type,
        "status": "critical" if accident_detected else "processed",
        "accident_detected": accident_detected,
        "source_file": source_file,
        "latitude": 7.1907,
        "longitude": 125.4553,
    }
    incidents.append(incident)

    if accident_detected:
        title_prefix = "video " if media_type == "video" else ""
        notifications.append(
            {
                "id": f"NOT{len(notifications) + 1:04d}",
                "incident_id": incident_id,
                "title": "Critical Accident Detected",
                "message": (
                    f"Accident detected in {title_prefix}{source_file} "
                    f"({confidence:.2%} confidence)"
                ),
                "timestamp": timestamp,
                "severity": "critical",
                "read": False,
            }
        )


def create_video_writer(width: int, height: int, fps: float):
    """
    Try browser-friendly MP4 codecs first, then fall back to AVI-only codecs.
    Returns metadata about the opened writer plus whether the output should be
    exposed to the browser preview flow.
    """
    output_stem = f"detected_video_{uuid.uuid4().hex[:8]}"
    candidates = (
        {"codec": "avc1", "suffix": ".mp4", "browser_preview_safe": True},
        {"codec": "H264", "suffix": ".mp4", "browser_preview_safe": True},
        {"codec": "mp4v", "suffix": ".mp4", "browser_preview_safe": True},
        {"codec": "MJPG", "suffix": ".avi", "browser_preview_safe": False},
    )

    for candidate in candidates:
        output_name = f"{output_stem}{candidate['suffix']}"
        output_path = OUTPUTS / output_name
        try:
            writer = cv2.VideoWriter(
                str(output_path),
                cv2.VideoWriter_fourcc(*candidate["codec"]),
                fps,
                (width, height),
            )
            if writer is not None and writer.isOpened():
                return {
                    "writer": writer,
                    "output_path": output_path,
                    "output_name": output_name,
                    "codec": candidate["codec"],
                    "browser_preview_safe": candidate["browser_preview_safe"],
                }
            if writer is not None:
                writer.release()
            if output_path.exists():
                output_path.unlink()
        except Exception as error:
            print(f"[video] Codec {candidate['codec']} failed: {error}")
            if output_path.exists():
                output_path.unlink()
            continue

    print("[video] Warning: all video codecs failed. Annotated output will not be generated.")
    return {
        "writer": None,
        "output_path": None,
        "output_name": None,
        "codec": None,
        "browser_preview_safe": False,
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
    }


@app.get("/api/incidents")
def get_incidents():
    return incidents[::-1]


@app.get("/api/notifications")
def get_notifications():
    return notifications[::-1]


@app.post("/api/detect/image")
async def detect_image(request: Request, file: UploadFile = File(...)):
    try:
        print(f"\n[image] Starting image detection for: {file.filename}")
        file_path = save_upload_file(file)
        print(f"[image] File saved to: {file_path}")

        # Run detection once on the uploaded image and draw the result.
        results = model.predict(str(file_path), verbose=False)
        detections, accident_detected, best_confidence = extract_detections(results)
        print(
            "[image] Detection complete: "
            f"{len(detections)} objects detected, "
            f"accident={accident_detected}, confidence={best_confidence:.2%}"
        )

        annotated_image = results[0].plot()
        output_name = f"result_{uuid.uuid4().hex[:8]}.jpg"
        output_path = OUTPUTS / output_name
        cv2.imwrite(str(output_path), annotated_image)
        print(f"[image] Annotated image saved to: {output_path}")

        timestamp = datetime.now().isoformat()
        create_incident_record(
            media_type="image",
            source_file=file.filename or "uploaded_image",
            accident_detected=accident_detected,
            confidence=best_confidence,
            timestamp=timestamp,
        )

        return {
            "success": True,
            "accident_detected": accident_detected,
            "confidence": best_confidence,
            "media_type": "image",
            "timestamp": timestamp,
            "location": "Uploaded Image",
            "detections": detections,
            "annotated_media_url": build_output_url(request, output_name),
        }
    except Exception as error:
        print(f"[image] Detection error: {error}")
        raise HTTPException(status_code=500, detail=f"Image detection failed: {error}")


@app.post("/api/detect/video")
async def detect_video(request: Request, file: UploadFile = File(...)):
    file_path = None
    cap = None
    writer = None
    output_path = None
    output_name = None
    browser_preview_safe = False

    try:
        print(f"\n[video] Starting video detection for: {file.filename}")
        file_path = save_upload_file(file)
        print(f"[video] File saved to: {file_path}")
        
        cap = cv2.VideoCapture(str(file_path))

        if not cap.isOpened():
            print("[video] Could not open uploaded video file")
            raise HTTPException(status_code=400, detail="Could not open uploaded video.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        if fps <= 0:
            fps = 20.0

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        if width <= 0 or height <= 0:
            print(f"[video] Invalid video dimensions: {width}x{height}")
            raise HTTPException(status_code=400, detail="Uploaded video has invalid dimensions.")

        print(f"[video] Video opened: width={width}, height={height}, fps={fps:.2f}")

        # Create the annotated output video inside backend/outputs.
        writer_info = create_video_writer(width, height, fps)
        writer = writer_info["writer"]
        output_path = writer_info["output_path"]
        output_name = writer_info["output_name"]
        browser_preview_safe = bool(writer_info["browser_preview_safe"])

        if writer is None:
            print("[video] Video writer was not created. Annotated output will not be generated.")
        else:
            print(f"[video] Codec used: {writer_info['codec']}")
            print(f"[video] Output file path: {output_path}")

        accident_detected = False
        best_confidence = 0.0
        detection_samples = []
        max_detection_samples = 20
        processed_frames = 0
        frame_count = 0
        frame_skip = 2  # Process every 2nd frame for 2x speedup (minimal quality loss)
        last_annotated_frame = None

        while True:
            success, frame = cap.read()
            if not success:
                break

            frame_count += 1

            # Skip frames for faster processing
            if frame_count % frame_skip != 0:
                # Reuse previous annotated frame for skipped frames (if available)
                if writer is not None and last_annotated_frame is not None:
                    writer.write(last_annotated_frame)
                continue

            processed_frames += 1

            # Detect objects in the current frame, then draw boxes and labels.
            results = model.predict(frame, verbose=False)
            frame_detections, frame_has_accident, frame_best_confidence = extract_detections(results)
            annotated_frame = results[0].plot()
            last_annotated_frame = annotated_frame

            if writer is not None:
                writer.write(annotated_frame)

            if len(detection_samples) < max_detection_samples:
                remaining_slots = max_detection_samples - len(detection_samples)
                detection_samples.extend(frame_detections[:remaining_slots])

            if frame_has_accident:
                accident_detected = True
                best_confidence = max(best_confidence, frame_best_confidence)

        if processed_frames == 0:
            print("[video] No readable frames found in uploaded video")
            raise HTTPException(status_code=400, detail="Uploaded video has no readable frames.")

        print(
            "[video] Processed "
            f"{processed_frames}/{frame_count} frames "
            f"(skipped {frame_count - processed_frames} for speed)"
        )
        print(
            "[video] Detection summary: "
            f"accident_detected={accident_detected}, confidence={best_confidence:.2%}"
        )

        timestamp = datetime.now().isoformat()
        create_incident_record(
            media_type="video",
            source_file=file.filename or "uploaded_video",
            accident_detected=accident_detected,
            confidence=best_confidence,
            timestamp=timestamp,
        )

        annotated_media_url = None
        if writer is not None:
            writer.release()
            writer = None

        if output_path is not None and output_path.exists():
            output_size = output_path.stat().st_size
            print(f"[video] Output file size: {output_size} bytes")

            if output_size == 0:
                output_path.unlink()
                print("[video] Output file was empty and has been removed.")
            elif browser_preview_safe and output_name is not None:
                annotated_media_url = build_output_url(request, output_name)

        if annotated_media_url:
            print(f"[video] annotated_media_url returned: yes ({annotated_media_url})")
        elif output_path is not None and output_path.exists():
            print(
                "[video] annotated_media_url returned: no "
                "(output exists but was not marked browser-preview-safe)"
            )
        else:
            print("[video] annotated_media_url returned: no")

        return {
            "success": True,
            "accident_detected": accident_detected,
            "confidence": best_confidence,
            "media_type": "video",
            "timestamp": timestamp,
            "location": "Uploaded Video",
            "detections": detection_samples,
            "annotated_media_url": annotated_media_url,
        }
    except HTTPException:
        raise
    except Exception as error:
        print(f"[video] Detection error: {error}")
        raise HTTPException(status_code=500, detail=f"Video detection failed: {error}")
    finally:
        if cap is not None:
            cap.release()
        if writer is not None:
            writer.release()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
